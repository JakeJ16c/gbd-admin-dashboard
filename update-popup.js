// update-popup.js
// Registers the service worker and shows a small in-app prompt when a new version is ready.
// Works whether the admin is hosted at a subdomain root (admin.domain.com/) or a subfolder.

(function () {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;

  function showUpdatePrompt(reg) {
    // Avoid duplicates
    if (document.getElementById('pwaUpdateBar')) return;

    const bar = document.createElement('div');
    bar.id = 'pwaUpdateBar';
    bar.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:16px',
      'transform:translateX(-50%)',
      'background:#111827',
      'color:#fff',
      'padding:10px 12px',
      'border-radius:999px',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'box-shadow:0 10px 30px rgba(0,0,0,0.25)',
      'z-index:99999',
      'font:500 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial'
    ].join(';');

    const text = document.createElement('span');
    text.textContent = 'Update available';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Refresh';
    btn.style.cssText = [
      'border:none',
      'background:#204ECF',
      'color:#fff',
      'padding:8px 12px',
      'border-radius:999px',
      'cursor:pointer',
      'font-weight:700'
    ].join(';');

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = '✕';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.style.cssText = [
      'border:none',
      'background:transparent',
      'color:#fff',
      'cursor:pointer',
      'font-size:16px',
      'line-height:1',
      'padding:4px 6px'
    ].join(';');

    btn.addEventListener('click', () => {
      // Tell the waiting SW to activate now
      if (reg.waiting) {
        reg.waiting.postMessage({ action: 'skipWaiting' });
      }
    });

    dismiss.addEventListener('click', () => {
      bar.remove();
    });

    bar.appendChild(text);
    bar.appendChild(btn);
    bar.appendChild(dismiss);
    document.body.appendChild(bar);
  }

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');

      // If there's already a waiting worker (e.g., user opened a 2nd tab)
      if (reg.waiting) showUpdatePrompt(reg);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // When there's an existing controller, an update is ready
            if (navigator.serviceWorker.controller) {
              showUpdatePrompt(reg);
            }
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  });
})();
