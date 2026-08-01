import { auth, provider } from './firebase-init.js';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const BACKEND_URL = 'https://trackify-backend-stf8.onrender.com/api';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const toSignup = document.getElementById('toSignup');
const toLogin = document.getElementById('toLogin');
const errorDiv = document.getElementById('authError');
const loader = document.getElementById('loader');

// Toggle Forms
toSignup?.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
  errorDiv.classList.add('hidden');
});

toLogin?.addEventListener('click', () => {
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  errorDiv.classList.add('hidden');
});

const showError = (msg) => {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
};

const showLoader = (show) => {
  if (show) loader.classList.remove('hidden');
  else loader.classList.add('hidden');
};

// Sync user with backend
const syncWithBackend = async (user) => {
  try {
    const token = await user.getIdToken();
    const response = await fetch(`${BACKEND_URL}/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error("Failed to sync with backend");
    localStorage.setItem('token', token);
    window.location.href = 'pages/dashboard.html';
  } catch (err) {
    showError("Could not sync with backend. Ensure backend is running.");
    showLoader(false);
  }
};

// Listen to Auth State
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // If already on index, redirect to dashboard
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
      const token = await user.getIdToken();
      localStorage.setItem('token', token);
      window.location.href = 'pages/dashboard.html';
    }
  } else {
     showLoader(false);
  }
});

// Email Signup
document.getElementById('signupBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  
  if (!name || !email || !password) return showError("All fields are required");

  showLoader(true);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    await syncWithBackend(userCredential.user);
  } catch (error) {
    showError(error.message);
    showLoader(false);
  }
});

// Email Login
document.getElementById('loginBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) return showError("All fields are required");

  showLoader(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await syncWithBackend(userCredential.user);
  } catch (error) {
    showError("Invalid email or password");
    showLoader(false);
  }
});

// Google Login
document.getElementById('googleAuthBtn')?.addEventListener('click', async () => {
  showLoader(true);
  try {
    const result = await signInWithPopup(auth, provider);
    await syncWithBackend(result.user);
  } catch (error) {
    showError(error.message);
    showLoader(false);
  }
});
