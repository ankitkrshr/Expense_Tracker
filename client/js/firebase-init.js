import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your web app's Firebase configuration
// PLEASE UPDATE THIS WITH YOUR REAL FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyAO_E5AIWxR3XBQIXLElSg1IRx3RutFnx0",
  authDomain: "expense-tracker-9c48f.firebaseapp.com",
  projectId: "expense-tracker-9c48f",
  storageBucket: "expense-tracker-9c48f.firebasestorage.app",
  messagingSenderId: "746786921539",
  appId: "1:746786921539:web:0b657f51fed4b7b2d208f6",
  measurementId: "G-7FLJFP2JBW"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
