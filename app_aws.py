from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import os
import uuid
from datetime import datetime

import boto3
from botocore.exceptions import ClientError
from werkzeug.utils import secure_filename

# ===================== APP =====================
app = Flask(__name__, template_folder="templates", static_folder="static")

# 🔐 SECRET KEY (important for session)
app.secret_key = "snapstream_super_secret_key_123"

# ✅ SESSION CONFIG (HTTP + EC2 safe)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False   # HTTP use kar rahe ho
)

# ===================== AWS CONFIG =====================
REGION = "us-east-1"

dynamodb = boto3.resource("dynamodb", region_name=REGION)
sns = boto3.client("sns", region_name=REGION)

SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:242201287692:aws_capstone_topic"

users_table = dynamodb.Table("SnapStreamUsers")
media_table = dynamodb.Table("SnapStreamMedia")
notifications_table = dynamodb.Table("SnapStreamNotifications")

# ===================== UPLOAD CONFIG =====================
UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

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
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=message
        )
    except ClientError as e:
        print("SNS Error:", e)

def add_notification(email, title, message):
    notifications_table.put_item(
        Item={
            "id": str(uuid.uuid4()),
            "email": email,
            "title": title,
            "message": message,
            "status": "Unread",
            "time": now(),
        }
    )

# 🔑 USERS TABLE ka PRIMARY KEY = email
def get_user(email):
    res = users_table.get_item(Key={"email": email})
    return res.get("Item")

# ===================== PAGES =====================
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
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

@app.route("/logout")
def logout_page():
    session.clear()
    return redirect(url_for("login_page"))

# ===================== AUTH APIs =====================
@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(force=True)

    email = data.get("email", "").lower()
    username = data.get("username", "")
    password = data.get("password", "")

    if get_user(email):
        return jsonify({"success": False, "message": "Email already exists"}), 409

    users_table.put_item(
        Item={"email": email, "username": username, "password": password}
    )

    add_notification(email, "Welcome!", "Your SnapStream account created successfully.")
    send_notification("New User Signup", email)

    return jsonify({"success": True, "redirect": "/login"}), 201

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True)

    email = data.get("email", "").lower()
    password = data.get("password", "")

    user = get_user(email)
    if not user or user["password"] != password:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    # ✅ SESSION SAVE
    session["user_email"] = email
    session["username"] = user["username"]

    add_notification(email, "Login Success", "You logged in successfully.")
    send_notification("User Login", email)

    return jsonify({"success": True, "redirect": "/dashboard"}), 200

# ===================== RUN =====================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
