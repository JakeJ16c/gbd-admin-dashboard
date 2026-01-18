// firebase.js (Admin Dashboard)
// Firebase modular v11.8.1 — shared exports used across admin pages

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
  authDomain: "daisy-s-website.firebaseapp.com",
  projectId: "daisy-s-website",
  storageBucket: "daisy-s-website.firebasestorage.app",
  messagingSenderId: "595443495060",
  appId: "1:595443495060:web:7bbdd1108ad336d55c8481"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Note: messaging will throw in some unsupported environments,
// but for your admin dashboard on Chrome it’s fine.
export const messaging = getMessaging(app);
