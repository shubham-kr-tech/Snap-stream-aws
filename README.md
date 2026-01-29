🎬 SnapStream – AWS Powered Media Upload & Analysis Platform (AWS Capstone Project)

A full-stack media upload and analysis web application developed using Flask, HTML, CSS, and JavaScript.
This project is built with cloud-ready architecture and AWS integration for scalable storage, processing, and notifications.

📌 Project Overview

SnapStream is designed to simplify media management by providing users with a secure and structured platform to:

Upload images, audio, and video files
Store media securely
Track uploads and activity through a dashboard
Manage notifications in real-time
Update profile settings and manage account

It supports both Local Mode (for development) and AWS Mode (for deployment and cloud services).

✨ Key Features

👤 User Module

User Registration
User Login / Logout
Secure session-based authentication
User Dashboard with stats:
Total uploads
Completed uploads
Processing uploads
Failed uploads
Upload Media:
Image (jpg, png, gif)
Video (mp4)
Audio (mp3, wav)
My Media Page:
View all uploaded media
View media detail
Delete media
Notifications Page:
View notifications
Mark all as read
Clear all notifications
Profile Settings:
Update username
Change password
Delete account

☁️ AWS Integration (Cloud Mode)

DynamoDB used for storing:
Users data
Media metadata
Notifications data
SNS used for sending real-time alerts:
New user signup
User login
Upload completed notifications

🧑‍💻 Tech Stack

Layer	Technology
Backend	Flask (Python)
Frontend	HTML5, CSS3, JavaScript
Styling	Custom CSS (Modern UI Theme)
Sessions	Flask Sessions
File Uploads	Local Storage (static/uploads)
Cloud (AWS Mode)	AWS EC2, DynamoDB, SNS, IAM
Version Control	Git & GitHub

🔐 Authentication Flow

Users can register and login
Flask sessions manage login state
Protected pages require login:
Dashboard
Upload
Media
Notifications
Profile
Role-based redirect:
If not logged in → redirected to Login page

🎯 Objectives of the Project

Build a real-world media upload & management system
Implement secure session-based authentication
Design a clean and professional UI without frameworks
Provide a scalable architecture for cloud deployment
Integrate AWS services (DynamoDB + SNS)
Prepare the application for EC2 deployment

☁️ AWS Deployment Plan

Deploy Flask application on AWS EC2
Configure IAM roles for secure AWS access
Connect DynamoDB for database storage
Integrate SNS for notifications
Production deployment using Gunicorn + Nginx

🔮 Future Enhancements

AWS Rekognition integration (Image labels & object detection)
AWS Transcribe integration (Audio/Video transcription)
AWS Comprehend integration (Text sentiment analysis)
Admin dashboard for monitoring users & uploads
S3 storage instead of local uploads
Email alerts for uploads and activity
Cloud-native architecture (S3 + Lambda triggers)

👤 Author

Shubham Kumar
🎓 B.Tech CSE (AI&ML)
📍 India
🔗 GitHub: https://github.com/shubham-kr-tech
