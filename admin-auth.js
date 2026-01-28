// admin-auth.js (UPDATED - works across /analytics/, /product-management/, etc.)

import { auth } from "/firebase.js";
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// ✅ Allowlist fallback (still prefer admin custom claim)
const ADMIN_EMAILS = new Set([
  "daisybelle76@gmail.com",
  // If you actually use this account, leave it in:
  "admin@goldenbydaisy.co.uk",
]);

const loginOverlay = document.getElementById("adminLoginOverlay");
const loginForm = document.getElementById("adminLoginForm");
const loginError = document.getElementById("login-error");
const adminContent = document.querySelector(".admin-panel-wrapper");

const isLoginPage = () => {
  const p = window.location.pathname;
  return p.endsWith("/login.html") || p === "/login.html";
};

const showLoginUI = () => {
  if (loginOverlay) loginOverlay.style.display = "flex";
  if (adminContent) adminContent.style.display = "none";
};

const showAppUI = () => {
  if (loginOverlay) loginOverlay.style.display = "none";
  if (adminContent) adminContent.style.display = "flex";
};

const goLogin = () => {
  window.location.href = "/login.html";
};

async function isAllowedAdmin(user) {
  if (!user) return false;

  // 🔁 Force refresh once to pick up newly-added custom claims
  try {
    await user.getIdToken(true);
  } catch (_) {}

  try {
    const tokenResult = await user.getIdTokenResult();
    const hasAdminClaim = tokenResult?.claims?.admin === true;
    const emailOk = ADMIN_EMAILS.has((user.email || "").toLowerCase());
    return hasAdminClaim || emailOk;
  } catch (_) {
    // Fallback to email allowlist if tokenResult fails for any reason
    return ADMIN_EMAILS.has((user.email || "").toLowerCase());
  }
}

// Keep user signed in between refreshes
setPersistence(auth, browserLocalPersistence).catch(() => {});

// ✅ Global auth gate
onAuthStateChanged(auth, async (user) => {
  const onLogin = isLoginPage();

  if (!user) {
    // Not logged in
    if (onLogin) {
      showLoginUI();
      return;
    }
    return goLogin();
  }

  const ok = await isAllowedAdmin(user);

  if (!ok) {
    // Logged in but not admin
    try {
      await signOut(auth);
    } catch (_) {}
    if (onLogin) {
      showLoginUI();
      if (loginError) {
        loginError.textContent = "❌ Access denied. Admin privileges required.";
        loginError.style.display = "block";
      }
      return;
    }
    return goLogin();
  }

  // ✅ Admin is allowed
  showAppUI();

  // If they're on login page and already authed, push them home
  if (onLogin) window.location.href = "/";
});

// ✅ Login form handler (login.html)
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;
    const submitButton = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) return;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const ok = await isAllowedAdmin(cred.user);

      if (!ok) {
        await signOut(auth);
        if (loginError) {
          loginError.textContent = "❌ Access denied. Admin privileges required.";
          loginError.style.display = "block";
        }
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML =
            '<i class="fas fa-sign-in-alt"></i> Secure Login';
        }
        return;
      }

      if (loginError) loginError.style.display = "none";
      window.location.href = "/";
    } catch (err) {
      if (loginError) {
        loginError.textContent =
          "❌ " + String(err?.message || err).replace("Firebase: ", "");
        loginError.style.display = "block";
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML =
          '<i class="fas fa-sign-in-alt"></i> Secure Login';
      }
    }
  });
}

// ✅ Logout wiring for your new sidebar (layout/sidebar.html uses #logoutLink)
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("#logoutLink, #logoutBtn, [data-action='logout']");
  if (!btn) return;

  e.preventDefault();
  try {
    await signOut(auth);
  } catch (_) {}
  window.location.href = "/login.html";
});
