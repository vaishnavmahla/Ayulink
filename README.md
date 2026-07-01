# 🩺 Ayulink Pro - Smart Healthcare & Triage System

Ayulink Pro is a full-stack, real-time healthcare management platform designed to connect patients and doctors seamlessly. It features a smart 10-minute auto-triage booking engine, real-time vital sign monitoring, and an enterprise-grade notification system utilizing WebSockets, Emails, and SMS.

---

## ✨ Key Features

* **Smart Triage Booking Engine:** Patients can request slots, and doctors have 10 minutes to approve or reject. If ignored, the system auto-cancels the request and frees the slot.
* **Real-Time Dashboards:** Built with Socket.io to instantly update Doctor queues and Patient screens without refreshing.
* **Dual-Routing Notification Interceptor:** A custom development environment tool that intercepts live Emails (Nodemailer) and SMS (Twilio) meant for dummy database users and routes them to verified developer devices for safe testing.
* **Secure Biometrics & Prescriptions:** Doctors can securely log vital signs (BP, Sugar, Heart Rate) and write prescriptions directly to a patient's encrypted timeline.
* **Role-Based Access Control (RBAC):** Secure JWT authentication isolating Patient capabilities from Doctor capabilities.

---

## 🛠️ Tech Stack

### Frontend
* **React (Vite)**
* **Tailwind CSS** (for responsive, modern UI)
* **Socket.io-client** (Real-time updates)
* **Axios** (API requests)

### Backend
* **Node.js & Express.js**
* **Socket.io** (WebSocket server)
* **Prisma ORM** (Database management)
* **PostgreSQL** (Relational database)
* **Nodemailer** (Email engine)
* **Twilio SDK** (SMS engine)
* **Bcrypt & JWT** (Security and Authentication)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v16 or higher)
* [PostgreSQL](https://www.postgresql.org/)
* A Gmail account with an App Password (for Nodemailer)
* A Free Twilio Developer Account (for SMS)

### 2. Environment Setup

Navigate to the `backend` directory and create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ayulink?schema=public"

# Security
JWT_SECRET="your_super_secret_jwt_key"
PORT=3000

# Email Engine (Nodemailer)
EMAIL_USER="your_sending_gmail@gmail.com"
EMAIL_PASS="your_16_character_google_app_password"

# SMS Engine (Twilio)
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+12345678900"
