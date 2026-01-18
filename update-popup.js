// Registers the service worker and shows an update banner when a new version is ready.
// Safe to include on every page.

(async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('./sw.js');

    // If there's already a waiting worker, show the banner immediately
    if (reg.waiting) showUpdateBanner(reg);

    // Listen for new SW installing
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        // Installed means: new SW ready. If there's an existing controller, it's an update.
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(reg);
        }
      });
    });

    // Refresh once after the new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

  } catch (err) {
    console.warn('Service Worker registration failed:', err);
  }

  function showUpdateBanner(reg) {
    // Avoid duplicates
    if (document.getElementById('sw-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.style.cssText = [
      'position:fixed',
      'left:16px',
      'right:16px',
      'bottom:16px',
      'z-index:99999',
      'background:#204ECF',
      'color:#fff',
      'padding:12px 14px',
      'border-radius:12px',
      'box-shadow:0 10px 30px rgba(0,0,0,0.18)',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:12px',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif',
      'font-size:14px'
    ].join(';');

    const text = document.createElement('div');
    text.textContent = 'Update available. Refresh to get the latest version.';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:8px; align-items:center;';

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Update';
    refreshBtn.style.cssText = 'background:#fff; color:#204ECF; border:none; padding:8px 12px; border-radius:10px; font-weight:700; cursor:pointer;';

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Later';
    dismissBtn.style.cssText = 'background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.6); padding:8px 12px; border-radius:10px; font-weight:600; cursor:pointer;';

    refreshBtn.addEventListener('click', () => {
      if (!reg.waiting) return window.location.reload();
      // Tell the waiting SW to activate
      reg.waiting.postMessage({ action: 'skipWaiting' });
    });

    dismissBtn.addEventListener('click', () => banner.remove());

    actions.appendChild(dismissBtn);
    actions.appendChild(refreshBtn);

    banner.appendChild(text);
    banner.appendChild(actions);

    document.body.appendChild(banner);
  }
})();
