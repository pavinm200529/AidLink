// realtime.js — AidLink Real-time Notification Client
(function () {
    // Connect to socket.io server
    const socket = io();

    // Pending request badge counter
    let pendingRequestCount = 0;
    let badgeEl = null;

    // Play a simple beep alert using Web Audio API
    function playAlertSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.6);
        } catch (e) { /* audio not supported */ }
    }

    // Update the floating badge on the nav link for Requests
    function updateRequestBadge(count) {
        if (!badgeEl) {
            // Try to find the nav link for requests
            const links = document.querySelectorAll('.nav-links a');
            links.forEach(link => {
                if (link.href && link.href.includes('request')) {
                    link.style.position = 'relative';
                    badgeEl = document.createElement('span');
                    badgeEl.style.cssText = [
                        'position:absolute', 'top:-6px', 'right:-6px',
                        'background:#ef4444', 'color:#fff', 'font-size:10px',
                        'font-weight:700', 'border-radius:50%', 'min-width:18px',
                        'height:18px', 'display:flex', 'align-items:center',
                        'justify-content:center', 'padding:0 4px', 'line-height:1'
                    ].join(';');
                    link.appendChild(badgeEl);
                }
            });
        }
        if (badgeEl) {
            badgeEl.textContent = count;
            badgeEl.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    socket.on('connect', () => {
        console.log('Connected to AidLink Real-time Command Center');
        // If logged in, send location
        updateLocation();
    });

    // Capture and send geolocation to server
    function updateLocation() {
        if (!navigator.geolocation) return;
        const user = window.session ? window.session.getUser() : null;
        if (!user || user.id === 'anonymous') return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                // Update on server
                fetch('/api/users/location', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: latitude, lng: longitude })
                }).catch(err => console.error('Failed to update location:', err));

                // Also store locally for UI
                localStorage.setItem('user_lat', latitude);
                localStorage.setItem('user_lng', longitude);
            },
            (err) => console.warn('Geolocation denied or failed:', err.message),
            { enableHighAccuracy: true }
        );
    }
    // Update location every 2 minutes
    setInterval(updateLocation, 120000);

    // Listen for new disasters
    socket.on('new_disaster', (data) => {
        const user = window.session ? window.session.getUser() : null;
        if (!user) return;

        const isAdmin = ['admin', 'government', 'ngo'].includes(user.role);

        // Build registered-user badge for admin
        const submitter = data.submittedBy;
        const submitterBadge = submitter
            ? `<small style="display:block;margin-top:6px;padding:4px 8px;background:rgba(255,255,255,0.1);border-radius:6px;">
                🙋 Submitted by: <strong>${submitter.name}</strong>
                <span style="background:#3b82f6;color:#fff;padding:1px 6px;border-radius:10px;font-size:10px;margin-left:4px;">${submitter.role}</span>
               </small>`
            : '';

        if (isAdmin) {
            playAlertSound();
            window.notify.showToast(
                `📍 <strong>${data.location || 'Unknown'}</strong> | Severity: <strong>${data.severity || 'N/A'}</strong>${submitterBadge}`,
                { title: '🚨 New Disaster Reported: ' + data.title, type: 'error', timeout: 12000 }
            );
            if (window.location.pathname.includes('dashboard.html')) {
                if (typeof refreshDashboardData === 'function') refreshDashboardData();
            }
        }
    });

    // Listen for new resource requests — notify admin
    socket.on('new_request', (data) => {
        const user = window.session ? window.session.getUser() : null;
        if (!user) return;

        const isAdmin = ['admin', 'government', 'ngo'].includes(user.role);

        const name = data.requester_name || data.requesterName || 'Someone';
        const resources = Array.isArray(data.resources)
            ? data.resources.join(', ')
            : (data.resources || 'items');
        const location = data.location ? `📍 <strong>${data.location}</strong>` : '';
        const contact = data.contact ? `📞 ${data.contact}` : '';
        const priority = data.priority ? `⚡ Priority: <strong>${data.priority}</strong>` : '';
        const details = [location, contact, priority].filter(Boolean).join(' &nbsp;|&nbsp; ');

        // Build volunteer identity badge
        const submitter = data.submittedBy;
        const submitterBadge = submitter
            ? `<small style="display:block;margin-top:6px;padding:4px 8px;background:rgba(255,255,255,0.1);border-radius:6px;">
                🆔 Registered: <strong>${submitter.name}</strong>
                <span style="background:#10b981;color:#fff;padding:1px 6px;border-radius:10px;font-size:10px;margin-left:4px;">${submitter.role} • ACTIVE</span>
               </small>`
            : '';

        if (isAdmin) {
            playAlertSound();
            window.notify.showToast(
                `👤 <strong>${name}</strong> needs: <em>${resources}</em><br><small style="opacity:0.85">${details}</small>${submitterBadge}`,
                { title: '📦 New Resource Request Received!', type: 'warning', timeout: 15000 }
            );
            pendingRequestCount++;
            updateRequestBadge(pendingRequestCount);
            if (window.location.pathname.includes('dashboard.html')) {
                if (typeof refreshDashboardData === 'function') refreshDashboardData();
            }
        }
    });

    socket.on('disconnect', () => {
        console.warn('Lost connection to AidLink Secure Server');
    });

    // Listen for admin specific notifications (like volunteer registration)
    socket.on('admin_notification', (data) => {
        const user = window.session ? window.session.getUser() : null;
        if (!user || !['admin', 'government', 'ngo'].includes(user.role)) return;

        playAlertSound();

        if (data.type === 'volunteer_registration') {
            window.notify.showToast(
                `👤 <strong>${data.details.name}</strong> just registered!<br><small>Skills: ${data.details.skills || 'General'}</small><br><small>Contact: ${data.details.contact}</small>`,
                { title: '✅ New Volunteer Personnel!', type: 'success', timeout: 15000 }
            );
        } else {
            window.notify.showToast(data.message, { title: '🔔 System Notification', type: 'info' });
        }

        if (window.location.pathname.includes('dashboard.html')) {
            if (typeof refreshDashboardData === 'function') refreshDashboardData();
        }
    });

    // Targeted disaster alert for volunteers
    socket.on('disaster_alert', (data) => {
        const user = window.session ? window.session.getUser() : null;
        if (!user || user.id !== data.targetVolunteerId) return;

        playAlertSound();
        const dist = parseFloat(data.distance).toFixed(1);

        window.notify.showToast(
            `🔥 <strong>${data.disaster.title}</strong> is happening <strong>${dist}km</strong> away from you!<br>
             <button onclick="handleActivation('${data.disaster.id}')" style="margin-top:10px;background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:700;">ACCEPT TASK & RESPOND</button>`,
            { title: '🆘 NEARBY DISASTER ALERT!', type: 'error', timeout: 30000 }
        );

        // Auto-focus map if on dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            if (typeof focusMapOn === 'function' && data.disaster.lat && data.disaster.lng) {
                focusMapOn(data.disaster.lat, data.disaster.lng, data.disaster.title);
            }
        }
    });

    // Listen for targeted notifications for volunteers
    socket.on('volunteer_notification', (data) => {
        const user = window.session ? window.session.getUser() : null;
        if (!user || user.id !== data.volunteerId) return;

        playAlertSound();
        window.notify.showToast(
            `📢 <strong>${data.title}</strong><br>${data.message}`,
            { title: 'Update on Your Assigned Request', type: 'info', timeout: 15000 }
        );

        // Refresh dashboard if active
        if (window.location.pathname.includes('dashboard.html')) {
            if (typeof refreshDashboardData === 'function') refreshDashboardData();
        }
    });

    // Global handler for responding to alerts
    window.handleActivation = async (disasterId) => {
        try {
            const res = await fetch(`/api/disasters/${disasterId}/respond`, {
                method: 'POST'
            });
            const result = await res.json();
            if (res.ok) {
                window.notify.showToast(result.message, { type: 'success' });
                if (window.location.pathname.includes('dashboard.html')) {
                    if (typeof refreshDashboardData === 'function') refreshDashboardData();
                }
            } else {
                window.notify.showToast(result.error, { type: 'error' });
            }
        } catch (err) {
            window.notify.showToast('Failed to respond to disaster.', { type: 'error' });
        }
    };
})();
