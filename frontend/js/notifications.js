// notifications.js — admin toast notifications with HTML support
(function () {
  const container = document.createElement('div');
  container.className = 'toasts';
  document.body.appendChild(container);

  function showToast(message, { title = '', type = 'default', timeout = 4000 } = {}) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type !== 'default' ? type : '');

    // Add a pulsing left border for warnings (resource requests)
    if (type === 'warning') {
      el.style.cssText = 'animation: toastPulse 1s ease-in-out 3; border-left: 4px solid #f59e0b;';
    } else if (type === 'error') {
      el.style.cssText = 'border-left: 4px solid #ef4444;';
    }

    const closeBtn = `<button onclick="this.parentElement.remove()" style="position:absolute;top:8px;right:10px;background:none;border:none;color:inherit;font-size:16px;cursor:pointer;opacity:0.6;">✕</button>`;

    if (title) {
      el.innerHTML = `<div class="title">${title}</div><div style="position:relative;padding-right:20px;">${message}</div>${closeBtn}`;
    } else {
      el.innerHTML = `<div style="position:relative;padding-right:20px;">${message}</div>${closeBtn}`;
    }

    el.style.position = 'relative';
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, timeout);
  }

  window.notify = { showToast };

  // Add keyframe for pulse animation dynamically
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastPulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(245,158,11,0.1); }
      50% { box-shadow: 0 4px 30px rgba(245,158,11,0.5); }
    }
  `;
  document.head.appendChild(style);
})();
