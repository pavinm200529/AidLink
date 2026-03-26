// volunteers.js — handles volunteer registration and listing
document.getElementById('volunteerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const statusEl = document.getElementById('status');

  statusEl.innerHTML = '<span style="color:var(--primary);">📍 Capturing your live location...</span>';

  let lat = null, lng = null;
  try {
    const pos = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
    });
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
    statusEl.innerHTML = `<span style="color:#10b981;">✅ Location captured: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>`;
  } catch (err) {
    statusEl.innerHTML = '<span style="color:#f59e0b;">⚠️ Location unavailable — registering without GPS.</span>';
  }

  const data = {
    name: f.name.value.trim(),
    contact: f.contact.value.trim(),
    skills: f.skills.value.trim(),
    availability: f.availability.value,
    lat, lng
  };

  try {
    const res = await fetch(API_BASE + '/api/volunteers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Server error');
    const saved = await res.json();
    if (window.notify) window.notify.showToast('Volunteer registered: ' + saved.name, { type: 'success' });
    statusEl.innerHTML = '<span style="color:#10b981;">🎉 Registration complete!</span>';
    f.reset();
    loadVolunteers();
  } catch (err) {
    const pending = JSON.parse(localStorage.getItem('pendingVolunteers') || '[]');
    pending.push(data);
    localStorage.setItem('pendingVolunteers', JSON.stringify(pending));
    if (window.notify) window.notify.showToast('Volunteer saved locally (Offline)', { type: 'warn' });
    statusEl.innerHTML = '<span style="color:#f59e0b;">Saved locally (offline mode)</span>';
  }
});

async function deregisterVolunteer(id, actingRole = 'volunteer') {
  const isDelete = actingRole === 'admin';
  const msg = isDelete ? 'Are you sure you want to delete this volunteer record?' : 'Are you sure you want to cancel this volunteer registration?';
  if (!confirm(msg)) return;
  try {
    const res = await fetch(API_BASE + `/api/volunteers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Deletion failed');
    if (window.notify) window.notify.showToast(isDelete ? 'Volunteer record deleted' : 'Registration cancelled', { type: 'success' });
    loadVolunteers();
  } catch (e) {
    if (window.notify) window.notify.showToast('Error processing request', { type: 'error' });
  }
}

async function loadVolunteers() {
  const list = document.getElementById('volList');
  list.innerHTML = '<div class="text-muted">Loading personnel records...</div>';
  const currentUser = window.session ? window.session.getUser() : null;
  const canManage = currentUser && (['admin', 'government', 'ngo'].includes(currentUser.role));

  try {
    const res = await fetch(API_BASE + '/api/volunteers');
    if (res.status === 401) {
      list.innerHTML = '<div class="text-muted">Your session has expired. Please <a href="/">Login</a> again.</div>';
      return;
    }
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('Invalid data format');

    list.innerHTML = arr.map(v => {
      // Allow withdrawal if user is admin or the volunteer themselves (name match for demo)
      const isOwner = currentUser && (currentUser.name === v.name);
      const showWithdraw = canManage || isOwner;

      return `
        <div class="card mb-4" style="border-left: 4px solid var(--primary);">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                 <div>
                    <h4 style="margin-bottom:4px;">${v.name}</h4>
                    <p class="text-muted" style="font-size:13px; margin-bottom:8px;">${v.contact} • <span style="font-size:11px;">Registered: ${new Date(v.date).toLocaleString()}</span></p>
                 </div>
                <div style="text-align: right;">
                    <span class="badge ${v.availability === 'available' ? 'badge-success' : 'badge-danger'}" style="font-size:10px; display: block; margin-bottom: 8px;">
                        ${v.availability}
                    </span>
                    ${showWithdraw ? `
                    <button onclick="deregisterVolunteer('${v.id}', '${canManage ? 'admin' : 'volunteer'}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                        ${canManage ? 'Delete' : 'Withdraw'}
                    </button>` : ''}
                </div>
            </div>
            <div style="font-size:14px; background:var(--bg-main); padding:8px; border-radius:6px; color:var(--text-muted); margin-top: 8px;">
                <strong>Skills:</strong> ${v.skills || 'General Assistance'}
            </div>
            ${v.lat && v.lng ? `
            <div style="margin-top:8px; padding:8px 10px; background: rgba(16,185,129,0.08); border-radius:6px; border: 1px solid rgba(16,185,129,0.2); display:flex; align-items:center; gap:8px;">
                <span style="font-size:16px;">📍</span>
                <div style="flex:1;">
                    <div style="font-size:12px; font-weight:600; color:#10b981;">Live Location Captured</div>
                    <div style="font-size:11px; color:var(--text-muted);">${parseFloat(v.lat).toFixed(5)}, ${parseFloat(v.lng).toFixed(5)}</div>
                </div>
                <a href="https://maps.google.com/?q=${v.lat},${v.lng}" target="_blank" style="font-size:11px; color:var(--primary); font-weight:600; text-decoration:none; white-space:nowrap;">View on Map →</a>
            </div>` : `
            <div style="margin-top:8px; padding:6px 10px; background: rgba(100,116,139,0.06); border-radius:6px; font-size:11px; color:var(--text-muted);">
                📍 No location data
            </div>`}
        </div>
      `;
    }).join('') || '<div class="text-muted">No volunteers registered in this sector.</div>';
  } catch (e) {
    list.innerHTML = '<div class="text-muted">Data sync unavailable.</div>';
  }
}

document.addEventListener('DOMContentLoaded', loadVolunteers);
