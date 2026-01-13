
// admin-auth.js
import { auth } from './firebase.js';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

// === Elements ===
const loginOverlay = document.getElementById('adminLoginOverlay');
const loginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('login-error');
const adminContent = document.querySelector('.admin-panel-wrapper');

// === Keep user signed in between refreshes ===
setPersistence(auth, browserLocalPersistence);

// === Check login state ===
onAuthStateChanged(auth, (user) => {
  if (user && user.email === 'daisybelle76@gmail.com') {
    // Show dashboard, hide overlay
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (adminContent) adminContent.style.display = 'flex';
  } else {
    // Not logged in or not admin, show login
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (adminContent) adminContent.style.display = 'none';

    // If on index.html and no overlay exists, redirect
    const currentPath = window.location.pathname;
    if (currentPath.endsWith('index.html') && !loginOverlay) {
      window.location.href = './login.html';
    }
  }
});

// === Handle login form submission ===
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitButton = loginForm.querySelector('button[type="submit"]');

    // Disable button during login
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (user.email === 'daisybelle76@gmail.com') {
        // Admin login success
        loginError.style.display = 'none';

        // Redirect or show dashboard
        if (window.location.pathname.endsWith('login.html')) {
          window.location.href = 'index.html';
        } else {
          loginOverlay.style.display = 'none';
          if (adminContent) adminContent.style.display = 'flex';
        }
      } else {
        // Not admin
        auth.signOut();
        loginError.textContent = '❌ Access denied. Admin privileges required.';
        loginError.style.display = 'block';
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Secure Login';
      }
    } catch (err) {
      // Login failed
      loginError.textContent = '❌ ' + err.message.replace('Firebase: ', '');
      loginError.style.display = 'block';
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Secure Login';
    }
  });
}

// === Sidebar logout button functionality ===
// This finds the logout link in the sidebar and wires it up
document.addEventListener('DOMContentLoaded', () => {
  const sidebarLogout = document.querySelector('.sidebar a[href="#"]:has(.fa-sign-out-alt)');
  if (sidebarLogout) {
    sidebarLogout.addEventListener('click', (e) => {
      e.preventDefault();
      auth.signOut().then(() => {
        window.location.href = 'login.html';
      });
    });
  }
});
