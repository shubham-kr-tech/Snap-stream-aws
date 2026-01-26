from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import os
import uuid
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from werkzeug.utils import secure_filename

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = "snapstream_secret_key_here"

# Session cookie fixes (local testing)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False

# ===================== AWS CONFIG =====================
REGION = "us-east-1"

dynamodb = boto3.resource("dynamodb", region_name=REGION)
sns = boto3.client("sns", region_name=REGION)

# DynamoDB tables (must exist)
users_table = dynamodb.Table("SnapStreamUsers")
media_table = dynamodb.Table("SnapStreamMedia")
notifications_table = dynamodb.Table("SnapStreamNotifications")

# SNS Topic ARN
SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:604665149129:aws_capstone_topic"

# ===================== LOCAL UPLOAD CONFIG =====================
UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "mp4", "mp3", "wav"}


# ===================== HELPERS =====================
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def require_login():
    return "user_email" in session


def send_notification(subject, message):
    try:
        sns.publish(TopicArn=SNS_TOPIC_ARN, Subject=subject, Message=message)
    except ClientError as e:
        print("SNS Error:", e)


def add_notification(email, title, message):
    note_id = str(uuid.uuid4())
    item = {
        "id": note_id,
        "email": email,
        "title": title,
        "message": message,
        "status": "Unread",
        "time": now(),
    }
    try:
        notifications_table.put_item(Item=item)
    except ClientError as e:
        print("DynamoDB Notification Error:", e)


def get_user_by_email(email):
    try:
        res = users_table.get_item(Key={"email": email})
        return res.get("Item")
    except ClientError:
        return None


# ===================== PAGES ROUTES (HTML) =====================
@app.route("/")
def index():
    # Sir jaisa logic: login hai to dashboard
    if require_login():
        return redirect(url_for("dashboard"))
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

    # check exists
    try:
        res = users_table.get_item(Key={"email": email})
        if "Item" in res:
            return jsonify({"success": False, "message": "Email already exists"}), 409
    except ClientError:
        return jsonify({"success": False, "message": "DB error"}), 500

    # insert
    try:
        users_table.put_item(Item={"email": email, "username": username, "password": password})
    except ClientError:
        return jsonify({"success": False, "message": "DB insert failed"}), 500

    add_notification(email, "Welcome!", "Your SnapStream account created successfully.")
    send_notification("New User Signup", f"User {email} registered on SnapStream.")

    return jsonify({"success": True, "message": "Registered successfully", "redirect": "/login"}), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    user = get_user_by_email(email)

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    if user.get("password") != password:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    session["user_email"] = email
    session["username"] = user.get("username", "User")

    add_notification(email, "Login Success", "You logged in successfully.")
    send_notification("User Login", f"User {email} logged in.")

    return jsonify(
        {
            "success": True,
            "message": "Login success",
            "redirect": "/dashboard",
            "user": {"email": email, "username": session["username"]},
        }
    ), 200


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out", "redirect": "/"}), 200


@app.route("/api/me", methods=["GET"])
def api_me():
    if not require_login():
        return jsonify({"success": False, "message": "Not logged in"}), 401

    email = session["user_email"]
    username = session.get("username", "User")

    # safety: if username missing then fetch from DB
    if not username:
        user = get_user_by_email(email)
        if user:
            username = user.get("username", "User")

    return jsonify({"success": True, "user": {"email": email, "username": username}}), 200


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

    # update DynamoDB
    try:
        users_table.update_item(
            Key={"email": email},
            UpdateExpression="SET username = :u",
            ExpressionAttributeValues={":u": username},
        )
    except ClientError:
        return jsonify({"success": False, "message": "DB update failed"}), 500

    session["username"] = username
    add_notification(email, "Profile Updated", "Your username updated successfully.")

    return jsonify({"success": True, "message": "Profile updated", "username": username}), 200


@app.route("/api/profile/change-password", methods=["POST"])
def api_change_password():
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
    user = get_user_by_email(email)

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    if user.get("password") != current_password:
        return jsonify({"success": False, "message": "Current password is incorrect"}), 401

    try:
        users_table.update_item(
            Key={"email": email},
            UpdateExpression="SET password = :p",
            ExpressionAttributeValues={":p": new_password},
        )
    except ClientError:
        return jsonify({"success": False, "message": "DB update failed"}), 500

    add_notification(email, "Password Updated", "Your password updated successfully.")
    return jsonify({"success": True, "message": "Password updated successfully"}), 200


@app.route("/api/profile/delete-account", methods=["POST"])
def api_delete_account():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    # 1) delete user from users_table
    try:
        users_table.delete_item(Key={"email": email})
    except ClientError:
        return jsonify({"success": False, "message": "DB delete failed"}), 500

    # 2) delete user media (DynamoDB + local file)
    try:
        # Requires GSI email-index on SnapStreamMedia
        res = media_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email)
        )
        items = res.get("Items", [])
    except Exception:
        # fallback scan
        try:
            res = media_table.scan()
            items = [m for m in res.get("Items", []) if m.get("email") == email]
        except ClientError:
            items = []

    # delete each media record + file
    for m in items:
        try:
            # delete local file
            stored_name = m.get("stored_name", "")
            if stored_name:
                path = os.path.join(app.config["UPLOAD_FOLDER"], stored_name)
                if os.path.exists(path):
                    os.remove(path)
        except:
            pass

        try:
            media_table.delete_item(Key={"id": m["id"]})
        except:
            pass

    # 3) delete notifications
    try:
        res = notifications_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email)
        )
        notes = res.get("Items", [])
    except Exception:
        try:
            res = notifications_table.scan()
            notes = [n for n in res.get("Items", []) if n.get("email") == email]
        except ClientError:
            notes = []

    try:
        with notifications_table.batch_writer() as batch:
            for n in notes:
                batch.delete_item(Key={"id": n["id"]})
    except:
        pass

    session.clear()
    return jsonify({"success": True, "message": "Account deleted successfully", "redirect": "/"}), 200


# ===================== DASHBOARD APIs =====================
@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    # get user media
    try:
        res = media_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email)
        )
        user_media = res.get("Items", [])
    except Exception:
        try:
            res = media_table.scan()
            items = res.get("Items", [])
            user_media = [m for m in items if m.get("email") == email]
        except ClientError:
            return jsonify({"success": False, "message": "DB error"}), 500

    total = len(user_media)
    processing = len([m for m in user_media if m.get("status") == "Processing"])
    completed = len([m for m in user_media if m.get("status") == "Completed"])
    failed = len([m for m in user_media if m.get("status") == "Failed"])

    return jsonify(
        {"success": True, "total_uploads": total, "processing": processing, "completed": completed, "failed": failed}
    ), 200


@app.route("/api/dashboard/activity", methods=["GET"])
def dashboard_activity():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    try:
        res = media_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email)
        )
        user_media = res.get("Items", [])
    except Exception:
        try:
            res = media_table.scan()
            items = res.get("Items", [])
            user_media = [m for m in items if m.get("email") == email]
        except ClientError:
            return jsonify({"success": False, "message": "DB error"}), 500

    user_media.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
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
        "size_kb": str(round(os.path.getsize(save_path) / 1024, 2)),
        "uploaded_at": now(),
        "status": "Completed",
        "tags": [t.strip() for t in tags.split(",") if t.strip()],
    }

    try:
        media_table.put_item(Item=media_obj)
    except ClientError:
        return jsonify({"success": False, "message": "DB insert failed"}), 500

    add_notification(session["user_email"], "Upload Completed", f"{filename} uploaded successfully!")
    send_notification("Upload Completed", f"{filename} uploaded by {session['user_email']}")

    return jsonify({"success": True, "message": "Upload successful", "media_id": media_id, "media": media_obj}), 201


@app.route("/api/media", methods=["GET"])
def api_media_list():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    try:
        res = media_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email)
        )
        user_items = res.get("Items", [])
    except Exception:
        try:
            res = media_table.scan()
            items = res.get("Items", [])
            user_items = [m for m in items if m.get("email") == email]
        except ClientError:
            return jsonify({"success": False, "message": "DB error"}), 500

    return jsonify({"success": True, "media": user_items}), 200


@app.route("/api/media/<media_id>", methods=["GET"])
def api_media_detail(media_id):
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    try:
        res = media_table.get_item(Key={"id": media_id})
    except ClientError:
        return jsonify({"success": False, "message": "DB error"}), 500

    if "Item" not in res:
        return jsonify({"success": False, "message": "Media not found"}), 404

    media = res["Item"]

    # ownership check
    if media.get("email") != email:
        return jsonify({"success": False, "message": "Media not found"}), 404

    analysis = {
        "rekognition": {"labels": [{"Name": "Person", "Confidence": 95}]},
        "transcribe": "AWS Transcribe output will come here (demo).",
        "comprehend": {"sentiment": "POSITIVE"},
    }

    return jsonify({"success": True, "media": media, "analysis": analysis}), 200


@app.route("/api/media/<media_id>", methods=["DELETE"])
def api_media_delete(media_id):
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    try:
        res = media_table.get_item(Key={"id": media_id})
    except ClientError:
        return jsonify({"success": False, "message": "DB error"}), 500

    if "Item" not in res:
        return jsonify({"success": False, "message": "Media not found"}), 404

    media = res["Item"]
    if media.get("email") != email:
        return jsonify({"success": False, "message": "Media not found"}), 404

    # delete local file
    try:
        path = os.path.join(app.config["UPLOAD_FOLDER"], media.get("stored_name", ""))
        if os.path.exists(path):
            os.remove(path)
    except:
        pass

    # delete from DynamoDB
    try:
        media_table.delete_item(Key={"id": media_id})
    except ClientError:
        return jsonify({"success": False, "message": "DB delete failed"}), 500

    add_notification(email, "Media Deleted", f"{media.get('filename', 'File')} deleted successfully.")
    return jsonify({"success": True, "message": "Deleted"}), 200


# ===================== NOTIFICATION APIs =====================
@app.route("/api/notifications", methods=["GET"])
def api_notifications():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    try:
        res = notifications_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email)
        )
        user_notes = res.get("Items", [])
    except Exception:
        try:
            res = notifications_table.scan()
            items = res.get("Items", [])
            user_notes = [n for n in items if n.get("email") == email]
        except ClientError:
            return jsonify({"success": False, "message": "DB error"}), 500

    user_notes.sort(key=lambda x: x.get("time", ""), reverse=True)
    return jsonify({"success": True, "notifications": user_notes}), 200


@app.route("/api/notifications/read-all", methods=["POST"])
def api_notifications_read_all():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    # fetch notifications
    try:
        res = notifications_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email)
        )
        items = res.get("Items", [])
    except Exception:
        res = notifications_table.scan()
        items = [n for n in res.get("Items", []) if n.get("email") == email]

    # update each
    for n in items:
        try:
            notifications_table.update_item(
                Key={"id": n["id"]},
                UpdateExpression="SET #s = :r",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":r": "Read"},
            )
        except ClientError:
            pass

    return jsonify({"success": True, "message": "All marked as read"}), 200


@app.route("/api/notifications/clear-all", methods=["POST"])
def api_notifications_clear_all():
    if not require_login():
        return jsonify({"success": False, "message": "Login required"}), 401

    email = session["user_email"]

    # fetch notifications
    try:
        res = notifications_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email)
        )
        items = res.get("Items", [])
    except Exception:
        res = notifications_table.scan()
        items = [n for n in res.get("Items", []) if n.get("email") == email]

    # batch delete
    try:
        with notifications_table.batch_writer() as batch:
            for n in items:
                batch.delete_item(Key={"id": n["id"]})
    except ClientError:
        return jsonify({"success": False, "message": "DB delete failed"}), 500

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
    return redirect(url_for("login_page"))


# ===================== RUN =====================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
