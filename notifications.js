
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { app } from "./firebase.js";

// Initialize Firebase Messaging and Firestore
const messaging = getMessaging(app);
const db = getFirestore(app);

// VAPID key for web push notifications
const VAPID_KEY = 'BKWmwmuEDejKmOZEFLtWAgZXD2OUPqS_77NA6hTEf9-9SXDG9fJh0EZDG7qExr8IDrRiHVPSNvbXohUKsV12ueA';

// Notification categories
const NOTIFICATION_CATEGORIES = [
  { id: 'orders', name: 'New Orders', icon: 'fa-box' },
  { id: 'visits', name: 'Website Visits', icon: 'fa-globe' },
  { id: 'basket', name: 'Basket Updates', icon: 'fa-shopping-cart' },
  { id: 'reviews', name: 'New Reviews', icon: 'fa-star' },
  { id: 'accounts', name: 'New Accounts', icon: 'fa-user-plus' }
];

// 🔔 Request permission and retrieve FCM token
export async function initializeAdminNotifications() {
  try {
    const notificationsEnabled = localStorage.getItem('adminNotificationsEnabled') === 'true';
    if (!notificationsEnabled) {
      console.log('❌ Admin notifications are disabled in settings.');
      return null;
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Using existing Service Worker with scope: ', registration.scope);

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Notification permission granted.');
        const currentToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (currentToken) {
          console.log('✅ Admin FCM Token: ', currentToken);
          await storeAdminToken(currentToken);
          return currentToken;
        } else {
          console.log('❌ No token received.');
        }
      } else {
        console.log('❌ Notification permission denied.');
      }
    } else {
      console.log('❌ Service workers not supported in this browser.');
    }
  } catch (error) {
    console.error('❌ Error initializing admin notifications: ', error);
  }
  return null;
}

// 💾 Store or update admin token in Firestore
async function storeAdminToken(token) {
  try {
    const adminTokensRef = collection(db, "adminTokens");
    const querySnapshot = await getDocs(query(adminTokensRef, where("token", "==", token)));

    if (!querySnapshot.empty) {
      console.log("⚠️ Token already exists in Firestore. Skipping save.");
      return;
    }

    await addDoc(adminTokensRef, {
      token: token,
      timestamp: new Date().toISOString(),
      device: navigator.userAgent,
      categories: getCategoryPreferences()
    });
    console.log("✅ Admin token stored in Firestore.");
  } catch (error) {
    console.error("❌ Error storing admin token:", error);
  }
}

// ⚙️ Get saved category preferences from localStorage
function getCategoryPreferences() {
  const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
  return JSON.parse(categoriesStr);
}

// 🔁 Enable/disable global notification toggle
export async function toggleAdminNotifications(enabled) {
  localStorage.setItem('adminNotificationsEnabled', enabled);
  if (enabled) await initializeAdminNotifications();
  updateNotificationToggleUI();
}

// 🔁 Enable/disable individual category toggle
export async function toggleNotificationCategory(categoryId, enabled) {
  const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
  const categories = JSON.parse(categoriesStr);
  categories[categoryId] = enabled;
  localStorage.setItem('notificationCategories', JSON.stringify(categories));
  updateCategoryToggleUI(categoryId);

  if (Notification.permission === 'granted') {
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      if (currentToken) await storeAdminToken(currentToken);
    } catch (error) {
      console.error('❌ Error updating token with new preferences:', error);
    }
  }
}

// 🧠 Update the main toggle switch UI
export function updateNotificationToggleUI() {
  const toggle = document.getElementById('notification-toggle');
  if (toggle) {
    const enabled = localStorage.getItem('adminNotificationsEnabled') === 'true';
    toggle.checked = enabled;
    const statusElement = document.getElementById('notification-status');
    if (statusElement) {
      statusElement.textContent = enabled ? 'Enabled' : 'Disabled';
      statusElement.className = enabled ? 'status-enabled' : 'status-disabled';
    }
    const categoriesSection = document.getElementById('notification-categories');
    if (categoriesSection) {
      categoriesSection.style.display = enabled ? 'block' : 'none';
    }
  }
}

// 🧠 Update individual category toggle UI
export function updateCategoryToggleUI(categoryId) {
  const toggle = document.getElementById(`category-toggle-${categoryId}`);
  if (toggle) {
    const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
    const categories = JSON.parse(categoriesStr);
    const enabled = categories[categoryId] !== false;
    toggle.checked = enabled;
    const statusElement = document.getElementById(`category-status-${categoryId}`);
    if (statusElement) {
      statusElement.textContent = enabled ? 'Enabled' : 'Disabled';
      statusElement.className = enabled ? 'status-enabled' : 'status-disabled';
    }
  }
}

// 🔃 Initialize all toggle UIs on load
export function initializeCategoryToggles() {
  const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
  const categories = JSON.parse(categoriesStr);
  let updated = false;

  NOTIFICATION_CATEGORIES.forEach(category => {
    if (categories[category.id] === undefined) {
      categories[category.id] = true;
      updated = true;
    }
    updateCategoryToggleUI(category.id);
  });

  if (updated) {
    localStorage.setItem('notificationCategories', JSON.stringify(categories));
  }
}

// ✅ Send a test notification manually
export async function sendTestNotification() {
  try {
    const notificationsEnabled = localStorage.getItem('adminNotificationsEnabled') === 'true';
    if (!notificationsEnabled) {
      alert('Please enable notifications first.');
      return;
    }

    if (Notification.permission !== 'granted') {
      alert('Notification permission not granted. Please enable notifications first.');
      return;
    }

    new Notification('Youre So Golden', {
      body: 'This is a test notification from the admin dashboard.',
      icon: './IMG_8861.png'
    });

    const statusElement = document.getElementById('test-notification-status');
    if (statusElement) {
      statusElement.textContent = 'Test notification sent!';
      statusElement.className = 'status-success';
      setTimeout(() => {
        statusElement.textContent = '';
      }, 3000);
    }
  } catch (error) {
    console.error('❌ Error sending test notification: ', error);
    alert('Error sending test notification: ' + error.message);
  }
}

// 🧠 Check category toggle logic
function shouldShowNotification(title) {
  const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
  const categories = JSON.parse(categoriesStr);

  if (title.includes('Basket Updated') && categories.basket === false) return false;
  if (title.includes('New Order') && categories.orders === false) return false;
  if (title.includes('Review') && categories.reviews === false) return false;
  if (title.includes('Visit') && categories.visits === false) return false;
  if (title.includes('New Account') && categories.accounts === false) return false;

  return true;
}

// 🚀 INIT on page load
document.addEventListener('DOMContentLoaded', () => {
  const enabled = localStorage.getItem('adminNotificationsEnabled') === 'true';
  if (enabled === null) {
    localStorage.setItem('adminNotificationsEnabled', 'true');
  }

  updateNotificationToggleUI();
  initializeCategoryToggles();

  if (enabled) {
    initializeAdminNotifications();
  }
});
