// session.js — AidLink Secure Session & Fetch Injector
(function () {
  const STORAGE_KEY = 'aidlink_auth_token';
  const STORAGE_USER = 'aidlink_user_info';

  const session = {
    setToken(token, user) {
      localStorage.setItem(STORAGE_KEY, token);
      if (user) localStorage.setItem(STORAGE_USER, JSON.stringify(user));
      this._renderSession();
    },
    clearToken() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_USER);
      this._renderSession();
    },
    getToken() { return localStorage.getItem(STORAGE_KEY); },
    getUser() { try { return JSON.parse(localStorage.getItem(STORAGE_USER)); } catch (e) { return null; } },

    _renderSession() {
      try {
        const containers = document.querySelectorAll('.nav-links');
        containers.forEach(nav => {
          // remove existing session UI
          const old = nav.querySelector('.session-portal'); if (old) old.remove();

          const sessionDiv = document.createElement('div');
          sessionDiv.className = 'session-portal';
          sessionDiv.style.marginTop = '20px';
          sessionDiv.style.paddingTop = '20px';
          sessionDiv.style.borderTop = '1px solid rgba(255,255,255,0.1)';

          const user = this.getUser();
          if (user && user.name) {
            sessionDiv.innerHTML = `
              <div style="padding: 8px 16px; font-size: 13px;">
                <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Active Session</div>
                <div style="color: white; font-weight: 600;">${user.name}</div>
                <div style="color: var(--primary); font-size: 12px;">${user.role.toUpperCase()}</div>
              </div>
              <a href="#" id="aidlink-logout" style="color: #ef4444; font-size: 13px; text-decoration: none; padding: 12px 16px; display: block;">
                Secure Logout
              </a>
            `;
            // Role based UI hiding - if not admin/gov, remove certain links? 
            // For now just keep it simple.
          } else {
            sessionDiv.innerHTML = `
              <a href="/" style="background: var(--primary); color: white; border-radius: 8px; padding: 12px 16px; text-decoration: none; display: flex; align-items: center; gap: 10px; font-weight: 600;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
                Secure Sign In
              </a>
            `;
          }
          nav.appendChild(sessionDiv);
        });

        const logout = document.getElementById('aidlink-logout');
        if (logout) logout.addEventListener('click', (e) => {
          e.preventDefault();
          session.clearToken();
          window.location = '/';
        });
      } catch (e) { console.error('Session render error:', e); }
    }
  };

  // Patch global fetch to inject auth token
  const _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) { init.headers = Object.fromEntries(init.headers.entries()); }
    const token = session.getToken();
    if (token) init.headers['x-auth-token'] = token;
    return _fetch(input, init);
  };

  window.session = session;
  document.addEventListener('DOMContentLoaded', () => session._renderSession());
})();
