from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = "snapstream_secret_key_here"

# Session cookie fixes
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False

# ===================== CONFIG =====================
UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "mp4", "mp3", "wav"}

# ===================== IN-MEMORY DATABASE =====================
users = {}  # email -> {username,email,password}
media_files = []  # list of dict
notifications = []  # list of dict


# ===================== HELPERS =====================
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def require_login():
    return "user_email" in session


def add_notification(email, title, message):
    notifications.insert(
        0,
        {
            "id": str(uuid.uuid4()),
            "email": email,
            "title": title,
            "message": message,
            "status": "Unread",
            "time": now(),
        },
    )


# ===================== IMPORTANT FIX (CLEAR OLD LOGIN ON SERVER RESTART) =====================
@app.before_request
def clear_old_session_once():
    # Server restart ke baad browser me purana session cookie bacha rehta hai
    # Ye code 1 baar session clear karega, taaki home open par login na dikhe
    if session.get("fresh_start") != True:
        session.clear()
        session["fresh_start"] = True


# ===================== PAGES ROUTES (HTML) =====================
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")


@app.route("/register", methods=["GET"])
def register_page():
    return render_template("register.html")


@app.route("/dashboard")
def dashboard():
    if not require_login():
        return redirect(url_for("login_page"))
    return render_template("dashboard.html")


@app.route("/upload")
def upload():
    if not require_login():
        return redirect(url_for("login_page"))
    return render_template("upload.html")


@app.route("/media")
def media():
    if not require_login():
        return redirect(url_for("login_page"))
    return render_template("media.html")


@app.route("/media_detail")
def media_detail():
    if not require_login():
        return redirect(url_for("login_page"))
    return render_template("media_detail.html")


@app.route("/notifications")
def notification_page():
    if not require_login():
        return redirect(url_for("login_page"))
    return render_template("notifications.html")


@app.route("/profile")
def profile():
    if not require_login():
        return redirect(url_for("login_page"))
    return render_template("profile.html")


# ===================== AUTH APIs =====================
@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not username or not email or not password:
        return jsonify({"success": False, "message": "All fields required"}), 400

    if email in users:
        return jsonify({"success": False, "message": "Email already exists"}), 409

    users[email] = {"username": username, "email": email, "password": password}
    add_notification(email, "Welcome!", "Your SnapStream account created successfully.")

    return jsonify({"success": True, "message": "Registered successfully", "redirect": "/login"}), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if email not in users:
        return jsonify({"success": False, "message": "User not found"}), 404

    if users[email]["password"] != password:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    session["user_email"] = email
    session["username"] = users[email]["username"]

    add_notification(email, "Login Success", "You logged in successfully.")

    return jsonify(
        {
            "success": True,
            "message": "Login success",
            "redirect": "/dashboard",
            "user": {"email": email, "username": users[email]["username"]},
        }
    ), 200


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    session["fresh_start"] = True  # taaki loop na ho
    return jsonify({"success": True, "message": "Logged out", "redirect": "/"}), 200


@app.route("/api/me", methods=["GET"])
def api_me():
    if not require_login():
        return jsonify({"success": False, "message": "Not logged in"}), 401

    email = session["user_email"]
    username = session.get("username")

    if (not username) and (email in users):
        username = users[email]["username"]

    return jsonify({"success": True, "user": {"email": email, "username": username or "User"}}), 200


# ===================== PROFILE APIs =====================
@app.route("/api/profile/update", methods=["POST"])
def api_profile_update():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    data = request.get_json(force=True)
    username = data.get("username", "").strip()

    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400

    email = session["user_email"]

    if email not in users:
        return jsonify({"success": False, "message": "User not found"}), 404

    users[email]["username"] = username
    session["username"] = username

    add_notification(email, "Profile Updated", "Your username updated successfully.")
    return jsonify({"success": True, "message": "Profile updated", "username": username}), 200


@app.route("/api/profile/change-password", methods=["POST"])
def api_change_password_local():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    data = request.get_json(force=True)
    current_password = data.get("currentPassword", "").strip()
    new_password = data.get("newPassword", "").strip()

    if not current_password or not new_password:
        return jsonify({"success": False, "message": "All fields required"}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "message": "New password must be at least 6 characters"}), 400

    email = session["user_email"]

    if email not in users:
        return jsonify({"success": False, "message": "User not found"}), 404

    if users[email]["password"] != current_password:
        return jsonify({"success": False, "message": "Current password is incorrect"}), 401

    users[email]["password"] = new_password
    add_notification(email, "Password Updated", "Your password updated successfully.")

    return jsonify({"success": True, "message": "Password updated successfully"}), 200


@app.route("/api/profile/delete-account", methods=["POST"])
def api_delete_account():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    if email not in users:
        session.clear()
        session["fresh_start"] = True
        return jsonify({"success": False, "message": "User not found"}), 404

    del users[email]

    global media_files
    user_media = [m for m in media_files if m["email"] == email]

    for m in user_media:
        try:
            path = os.path.join(app.config["UPLOAD_FOLDER"], m["stored_name"])
            if os.path.exists(path):
                os.remove(path)
        except:
            pass

    media_files = [m for m in media_files if m["email"] != email]

    global notifications
    notifications = [n for n in notifications if n["email"] != email]

    session.clear()
    session["fresh_start"] = True

    return jsonify({"success": True, "message": "Account deleted successfully", "redirect": "/"}), 200


# ===================== DASHBOARD APIs =====================
@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]
    user_media = [m for m in media_files if m["email"] == email]

    total = len(user_media)
    processing = len([m for m in user_media if m["status"] == "Processing"])
    completed = len([m for m in user_media if m["status"] == "Completed"])
    failed = len([m for m in user_media if m["status"] == "Failed"])

    return jsonify(
        {"success": True, "total_uploads": total, "processing": processing, "completed": completed, "failed": failed}
    ), 200


@app.route("/api/dashboard/activity", methods=["GET"])
def dashboard_activity():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]
    user_media = [m for m in media_files if m["email"] == email]
    user_media.sort(key=lambda x: x["uploaded_at"], reverse=True)

    return jsonify({"success": True, "activity": user_media[:10]}), 200


# ===================== MEDIA APIs =====================
@app.route("/api/upload", methods=["POST"])
def api_upload():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file field found in request"}), 400

    file = request.files["file"]

    tags = request.form.get("custom_tags", "")
    if tags == "":
        tags = request.form.get("tags", "")

    if not file or file.filename == "":
        return jsonify({"success": False, "message": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "File type not supported"}), 400

    filename = secure_filename(file.filename)
    ext = filename.rsplit(".", 1)[1].lower()

    media_id = str(uuid.uuid4())
    stored_name = f"{media_id}_{filename}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], stored_name)

    try:
        file.save(save_path)
    except Exception as e:
        return jsonify({"success": False, "message": f"File save error: {str(e)}"}), 500

    media_obj = {
        "id": media_id,
        "email": session["user_email"],
        "filename": filename,
        "stored_name": stored_name,
        "type": ext,
        "size_kb": round(os.path.getsize(save_path) / 1024, 2),
        "uploaded_at": now(),
        "status": "Completed",
        "tags": [t.strip() for t in tags.split(",") if t.strip()],
    }

    media_files.insert(0, media_obj)
    add_notification(session["user_email"], "Upload Completed", f"{filename} uploaded successfully!")

    return jsonify({"success": True, "message": "Upload successful", "media_id": media_id, "media": media_obj}), 201


@app.route("/api/media", methods=["GET"])
def api_media_list():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]
    user_media = [m for m in media_files if m["email"] == email]
    return jsonify({"success": True, "media": user_media}), 200


@app.route("/api/media/<media_id>", methods=["GET"])
def api_media_detail(media_id):
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]
    media = next((m for m in media_files if m["id"] == media_id and m["email"] == email), None)

    if not media:
        return jsonify({"success": False, "message": "Media not found"}), 404

    analysis = {
        "rekognition": {"labels": [{"Name": "Person", "Confidence": 95}]},
        "transcribe": "Sample transcript will appear here (demo).",
        "comprehend": {"sentiment": "POSITIVE"},
    }

    return jsonify({"success": True, "media": media, "analysis": analysis}), 200


@app.route("/api/media/<media_id>", methods=["DELETE"])
def api_media_delete(media_id):
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]
    media = next((m for m in media_files if m["id"] == media_id and m["email"] == email), None)

    if not media:
        return jsonify({"success": False, "message": "Media not found"}), 404

    try:
        path = os.path.join(app.config["UPLOAD_FOLDER"], media["stored_name"])
        if os.path.exists(path):
            os.remove(path)
    except:
        pass

    media_files.remove(media)
    add_notification(email, "Media Deleted", f"{media['filename']} deleted successfully.")
    return jsonify({"success": True, "message": "Deleted"}), 200


# ===================== NOTIFICATION APIs =====================
@app.route("/api/notifications", methods=["GET"])
def api_notifications():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]
    user_notes = [n for n in notifications if n["email"] == email]
    return jsonify({"success": True, "notifications": user_notes}), 200


@app.route("/api/notifications/read-all", methods=["POST"])
def api_notifications_read_all():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]
    for n in notifications:
        if n["email"] == email:
            n["status"] = "Read"

    return jsonify({"success": True, "message": "All marked as read"}), 200


@app.route("/api/notifications/clear-all", methods=["POST"])
def api_notifications_clear_all():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]
    global notifications
    notifications = [n for n in notifications if n["email"] != email]
    return jsonify({"success": True, "message": "All cleared"}), 200


# ===================== FIX .html ROUTES =====================
@app.route("/login.html")
def login_html():
    return redirect(url_for("login_page"))


@app.route("/register.html")
def register_html():
    return redirect(url_for("register_page"))


@app.route("/dashboard.html")
def dashboard_html():
    return redirect(url_for("dashboard"))


@app.route("/upload.html")
def upload_html():
    return redirect(url_for("upload"))


@app.route("/media.html")
def media_html():
    return redirect(url_for("media"))


@app.route("/notification.html")
def notification_html():
    return redirect(url_for("notification_page"))


@app.route("/profile.html")
def profile_html():
    return redirect(url_for("profile"))


@app.route("/logout")
def logout_page():
    session.clear()
    session["fresh_start"] = True
    return redirect(url_for("login_page"))


# ===================== RUN =====================
if __name__ == "__main__":
    app.run(debug=True, port=5000)
