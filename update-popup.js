// ==========================
// 🟦 Update Popup for PWA
// ==========================
// This script registers the main PWA service worker,
// shows a bottom popup if a new version is available,
// and reloads the page only if the user taps the popup.

// Ensure the DOM is ready before injecting popup
document.addEventListener('DOMContentLoaded', () => {
  let refreshing = false;
  let newWorker = null;

  // ✅ Register your main service worker
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // 🟡 Triggered when a new service worker is found
    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;

      newWorker.addEventListener('statechange', () => {
        // ✅ SW is installed and waiting to activate
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller // only show if it's a new version
        ) {
          // ✅ Create and style the update popup
          const popup = document.createElement('div');
          popup.id = 'update-popup';
          popup.innerText = '🔄 Update Available — Tap to refresh';
          popup.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #204ECF;
            color: white;
            padding: 12px 20px;
            border-radius: 30px;
            display: block;
            font-weight: 500;
            font-size: 0.95rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 9999;
            cursor: pointer;
          `;
          document.body.appendChild(popup);

          // ✅ User taps to activate new SW
          popup.addEventListener('click', () => {
            newWorker.postMessage({ action: 'skipWaiting' });
          });
        }
      });
    });

    // ✅ When new SW takes control, reload the page
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }).catch((err) => {
    console.error('❌ Service worker registration failed:', err);
  });
});
