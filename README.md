# 💸 Trackify - Premium Full-Stack Expense Tracker

Trackify is a modern, full-stack web application that helps you track your daily income and expenses seamlessly. Built with a stunning, responsive **Glassmorphism UI**, it provides an intuitive dashboard to manage your financial health securely.

## ✨ Features
- **Secure Authentication:** Passwordless Google Sign-In and Email/Password authentication using **Firebase**.
- **Real-time Dashboard:** Automatically calculates and displays your Total Balance, Total Income, and Total Expenses in Rupees (₹).
- **Transaction Management:** Add categorised incomes or expenses and delete them as needed. 
- **Modern UI:** A beautiful, responsive glassmorphism design with micro-animations.
- **RESTful API Backend:** A secure Node.js & Express backend that verifies Firebase tokens and stores user-specific data in MongoDB.

## 🛠️ Tech Stack
- **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3 (Glassmorphism design)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (with Mongoose ORM)
- **Authentication:** Firebase Web SDK (Client) & Firebase Admin SDK (Server)

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- A MongoDB Atlas account/cluster
- A Firebase project

### 1. Clone the repository
```bash
git clone https://github.com/ankitkrshr/Expense_Tracker.git
cd Expense_Tracker
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your MongoDB connection string:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

### 4. Firebase Setup
1. Go to your Firebase Console and get your **Web App Configuration**. Paste it into `client/js/firebase-init.js`.
2. Generate a **Service Account Key** from Firebase (Project Settings > Service Accounts > Generate new private key).
3. Save the downloaded JSON file as `serviceAccountKey.json` inside the `backend` folder.

### 5. Run the Application
You'll need two terminal windows:

**Start the Backend Server:**
```bash
npm run dev
```

**Serve the Frontend:**
Use any static server (like Live Server in VS Code, or `serve`) to host the `client` folder.
```bash
npx serve client
```

Navigate to `http://localhost:3000` in your browser!

---
*Built with ❤️ for modern personal finance.*
