let map = null;
let markers = [];

// Geographic center for the map (India centered)
const MAP_CENTER = [20.5937, 78.9629];
const MAP_ZOOM = 5;

// Mock coordinates for common locations/states for professional visualization
const LOCATION_MAP = {
  'Kerala': [10.8505, 76.2711],
  'Tamil Nadu': [11.1271, 78.6569],
  'Karnataka': [15.3173, 75.7139],
  'Maharashtra': [19.7515, 75.7139],
  'Delhi': [28.7041, 77.1025],
  'Odisha': [20.9517, 85.0985],
  'Assam': [26.2006, 92.9376],
  'Gujarat': [22.2587, 71.1924],
  'West Bengal': [22.9868, 87.8550],
  'Andhra Pradesh': [15.9129, 79.7400]
};

function initMap() {
  if (map) return;
  try {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    // Force a redraw
    setTimeout(() => map.invalidateSize(), 100);
  } catch (e) {
    console.error('Leaflet init error:', e);
  }
}

// Focus map on a specific coordinate (used for alerts)
window.focusMapOn = (lat, lng, title) => {
  if (!map) initMap();
  map.setView([lat, lng], 13);
  const pulseIcon = L.divIcon({
    className: 'pulse-icon',
    html: '<div style="background:#ef4444; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
    iconSize: [20, 20]
  });
  L.marker([lat, lng], { icon: pulseIcon }).addTo(map)
    .bindPopup(`<strong>EMERGENCY: ${title}</strong>`)
    .openPopup();
};

function updateMap(disasters, volunteers = []) {
  if (!map) return;
  // Clear existing markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  // Plot Disasters
  console.log(`Plotting ${disasters.length} disasters on map...`);
  disasters.forEach(d => {
    let coords = null;

    // Check for precise GPS (handle 0 as valid)
    if (d.lat !== null && d.lng !== null && d.lat !== undefined && d.lng !== undefined) {
      coords = [parseFloat(d.lat), parseFloat(d.lng)];
      console.log(`Using GPS for ${d.title}:`, coords);
    } else {
      // Fallback to mock mapping
      const loc = (d.location || '').toLowerCase();
      console.log(`Fallback mapping for ${d.title} (Location: "${loc}")`);
      for (const key in LOCATION_MAP) {
        if (loc.includes(key.toLowerCase())) {
          coords = LOCATION_MAP[key];
          console.log(`Mapped ${d.title} to ${key}:`, coords);
          break;
        }
      }
    }

    if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
      const sev = (d.severity || 'low').toLowerCase();
      // Use standard marker for disaster
      const marker = L.marker(coords).addTo(map);

      const popupContent = `
        <div style="min-width: 150px;">
          <h4 style="margin:0 0 5px 0;">${d.title}</h4>
          <span class="badge ${sev === 'high' || sev === 'critical' ? 'badge-danger' : (sev === 'medium' ? 'badge-warn' : 'badge-success')}" style="font-size:9px; padding:2px 6px;">
            ${sev.toUpperCase()}
          </span>
          <p style="margin:8px 0 0 0; font-size:12px;">${d.location}</p>
          <small style="color:var(--text-muted)">State: ${d.state}</small>
        </div>
      `;

      marker.bindPopup(popupContent);
      markers.push(marker);
    } else {
      console.warn(`No valid coordinates found for disaster: ${d.title}`);
    }
  });

  // Plot Volunteers (for Admin)
  if (volunteers && volunteers.length > 0) {
    volunteers.forEach(v => {
      if (v.lat && v.lng) {
        const vMarker = L.marker([v.lat, v.lng], {
          icon: L.divIcon({
            className: 'volunteer-marker',
            html: `<div style="background:${v.status === 'READY' ? '#10b981' : '#f59e0b'}; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>`,
            iconSize: [12, 12]
          })
        }).addTo(map);
        vMarker.bindPopup(`<strong>Volunteer: ${v.name}</strong><br>Status: ${v.status}<br>${v.email}`);
        markers.push(vMarker);
      }
    });
  }
}

async function changeDisasterState(id, state) {
  console.log(`Attempting to change disaster ${id} state to ${state}`);
  try {
    const res = await fetch(API_BASE + `/api/disasters/${id}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    });
    if (!res.ok) throw new Error('Failed');
    if (window.notify) window.notify.showToast('Status updated to ' + state, { type: 'success' });
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Action failed: ' + e.message, { type: 'error' });
  }
}

async function deleteDisaster(id) {
  if (!confirm('Are you sure you want to delete this disaster report? This action cannot be undone.')) return;
  try {
    const res = await fetch(API_BASE + `/api/disasters/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    if (window.notify) window.notify.showToast('Disaster report deleted', { type: 'success' });
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Delete failed: ' + e.message, { type: 'error' });
  }
}

async function updateRequestStatus(id, status) {
  try {
    const res = await fetch(API_BASE + `/api/requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Update failed');
    if (window.notify) window.notify.showToast('Request status: ' + status, { type: 'success' });
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Update failed: ' + e.message, { type: 'error' });
  }
}

async function deleteRequest(id) {
  if (!confirm('Are you sure you want to delete this resource request?')) return;
  try {
    const res = await fetch(API_BASE + `/api/requests/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    if (window.notify) window.notify.showToast('Request deleted', { type: 'success' });
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Delete failed: ' + e.message, { type: 'error' });
  }
}

async function sendRequestResponse(id) {
  const msg = prompt('Enter your message to the requester:');
  if (msg === null) return;
  if (!msg.trim()) return window.notify && window.notify.showToast('Message cannot be empty', { type: 'error' });

  try {
    const res = await fetch(API_BASE + `/api/requests/${id}/response`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: msg })
    });
    if (!res.ok) throw new Error('Failed to send response');
    if (window.notify) window.notify.showToast('Response sent to requester', { type: 'success' });
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Action failed: ' + e.message, { type: 'error' });
  }
}

function renderDisasterCard(d) {
  const user = window.session && window.session.getUser();
  const canManage = user && ['admin', 'government', 'ngo'].includes(user.role);
  const el = document.createElement('div');
  el.className = 'card mb-4';
  el.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
            <h4 style="margin-bottom: 4px;">${d.title}</h4>
            <p class="text-muted" style="font-size: 13px;">${d.location || 'Unknown Location'}</p>
        </div>
        <span class="badge ${d.severity === 'High' ? 'badge-danger' : (d.severity === 'Medium' ? 'badge-warn' : 'badge-success')}" 
              style="${d.severity === 'Medium' ? 'background:#fef3c7; color:#d97706;' : ''}">
            ${d.severity}
        </span>
    </div>
    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
        📅 ${new Date(d.date).toLocaleString()}
    </div>
    <p style="margin: 12px 0; font-size: 14px;">${d.description}</p>
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="badge" style="background:var(--bg-main); color:var(--secondary); font-size: 10px;">${d.state || 'reported'}</span>
    </div>
  `;

  if (canManage) {
    const controls = document.createElement('div');
    controls.style.cssText = 'margin-top: 12px; display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 12px;';

    if (d.state === 'reported' || !d.state) {
      const v = document.createElement('button');
      v.className = 'btn btn-outline'; v.style.padding = '6px 12px';
      v.textContent = 'Verify'; v.onclick = () => changeDisasterState(d.id, 'verified');
      controls.appendChild(v);
    }
    if (['reported', 'verified'].includes(d.state)) {
      const a = document.createElement('button');
      a.className = 'btn btn-primary'; a.style.padding = '6px 12px';
      a.textContent = 'Activate'; a.onclick = () => changeDisasterState(d.id, 'active');
      controls.appendChild(a);
    }
    if (d.state !== 'resolved') {
      const r = document.createElement('button');
      r.className = 'btn btn-secondary'; r.style.padding = '6px 12px';
      r.textContent = 'Resolve'; r.onclick = () => changeDisasterState(d.id, 'resolved');
      controls.appendChild(r);
    }

    // NEW: Delete Option
    const del = document.createElement('button');
    del.className = 'btn btn-danger'; del.style.padding = '6px 12px';
    del.style.marginLeft = 'auto'; // Push to the right
    del.textContent = 'Delete'; del.onclick = () => deleteDisaster(d.id);
    controls.appendChild(del);

    el.appendChild(controls);
  }
  return el;
}

async function openVolunteerModal(requestId) {
  const modal = document.getElementById('volunteerModal');
  const list = document.getElementById('volunteerList');
  modal.style.display = 'flex';
  list.innerHTML = '<div class="text-muted">Loading available volunteers...</div>';

  try {
    const res = await fetch(API_BASE + '/api/users/volunteers');
    const volunteers = await res.json();

    list.innerHTML = volunteers.map(v => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
        <div>
          <div style="font-weight: 600;">${v.name}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${v.email}</div>
        </div>
        <button onclick="assignVolunteer('${requestId}', '${v.id}')" class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;">Select</button>
      </div>
    `).join('') || '<div class="text-muted">No volunteers found</div>';
  } catch (e) {
    list.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

function closeVolunteerModal() {
  document.getElementById('volunteerModal').style.display = 'none';
}

async function assignVolunteer(requestId, volunteerId) {
  try {
    const res = await fetch(API_BASE + `/api/requests/${requestId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerId })
    });
    if (!res.ok) throw new Error('Assignment failed');
    if (window.notify) window.notify.showToast('Volunteer assigned successfully', { type: 'success' });
    closeVolunteerModal();
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Assignment failed: ' + e.message, { type: 'error' });
  }
}

function renderRequestCard(r) {
  const user = window.session && window.session.getUser();
  const isAdmin = user && ['admin', 'government', 'ngo'].includes(user.role);
  const el = document.createElement('div');
  el.className = 'card mb-4';
  el.style.padding = '16px';
  el.style.borderLeft = '4px solid ' + (r.priority === 'High' ? '#ef4444' : (r.priority === 'Urgent' ? '#f59e0b' : '#10b981'));

  const adminResponseHtml = r.admin_response ? `
    <div style="margin-top: 12px; padding: 8px 12px; background: #f1f5f9; border-radius: 6px; font-size: 13px; border-left: 3px solid var(--secondary);">
        <strong>Admin Response:</strong> ${r.admin_response}
    </div>
  ` : '';

  const assignmentHtml = r.assignment_id ? `
    <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--primary); font-weight: 600;">
        <span style="background: var(--primary-glow); padding: 4px 8px; border-radius: 4px;">
            👤 Assigned to: ${r.assigned_volunteer_name || 'Volunteer'}
        </span>
    </div>
  ` : '';

  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items: start;">
        <div>
            <strong style="color:var(--secondary); font-size: 15px;">${r.requester_name || r.requesterName}</strong>
            <div class="text-muted" style="font-size:12px; margin-top: 2px;">${r.location || 'Unknown Location'}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">🕒 ${new Date(r.date).toLocaleString()}</div>
        </div>
        <span class="badge status-${r.status.toLowerCase()}" style="font-size:10px;">${r.status.toUpperCase()}</span>
    </div>
    <div style="margin-top:12px; font-size:14px;">
        <span style="font-weight: 600;">Needs:</span> ${r.resources}
    </div>
    <div class="text-muted" style="font-size:12px; margin-top: 4px;">Contact: ${r.contact || 'N/A'}</div>
    ${assignmentHtml}
    ${adminResponseHtml}
  `;

  if (isAdmin) {
    const actions = document.createElement('div');
    actions.style.cssText = 'margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: 16px;';

    // Status Dropdown
    const select = document.createElement('select');
    select.className = 'form-select';
    select.style.cssText = 'width: auto; padding: 4px 8px; font-size: 12px; height: 32px;';
    ['pending', 'approved', 'rejected', 'fulfilled', 'assigned'].forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      if (r.status === s) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = (e) => updateRequestStatus(r.id, e.target.value);
    actions.appendChild(select);

    // Assign Button
    const assignBtn = document.createElement('button');
    assignBtn.className = 'btn btn-primary'; assignBtn.style.padding = '4px 12px'; assignBtn.style.fontSize = '12px';
    assignBtn.textContent = 'Assign'; assignBtn.onclick = () => openVolunteerModal(r.id);
    actions.appendChild(assignBtn);

    // Certificate Button
    if (r.assignment_id) {
        const certBtn = document.createElement('button');
        certBtn.className = 'btn btn-sm'; 
        certBtn.style.cssText = 'padding: 4px 12px; font-size: 12px; background: var(--accent); color: white;';
        certBtn.textContent = 'Certificate'; certBtn.onclick = () => window.open(`/certificate.html?id=${r.assignment_id}`, '_blank');
        actions.appendChild(certBtn);
    }

    // Response Button
    const resp = document.createElement('button');
    resp.className = 'btn btn-info'; resp.style.padding = '4px 12px'; resp.style.fontSize = '12px';
    resp.textContent = 'Respond'; resp.onclick = () => sendRequestResponse(r.id);
    actions.appendChild(resp);

    // Delete Button
    const del = document.createElement('button');
    del.className = 'btn btn-danger'; del.style.padding = '4px 12px'; del.style.fontSize = '12px';
    del.textContent = 'Delete'; del.onclick = () => deleteRequest(r.id);
    actions.appendChild(del);

    el.appendChild(actions);
  }

  return el;
}

async function loadDashboard() {
  const dContainer = document.getElementById('disasters');
  const rContainer = document.getElementById('requests');
  const activity = document.getElementById('activityLog');
  const vList = document.getElementById('adminVolunteerList');
  const vSection = document.getElementById('adminVolunteerSection');

  const user = window.session && window.session.getUser();
  const hasManagementAccess = user && ['admin', 'government', 'ngo'].includes(user.role);
  const isSuperAdmin = user && user.role === 'admin';

  if (!hasManagementAccess && vSection) vSection.style.display = 'none';

  try {
    const [statsRes, dRes, rRes, vRes] = await Promise.all([
      fetch(API_BASE + '/api/stats'),
      fetch(API_BASE + '/api/disasters'),
      fetch(API_BASE + '/api/requests'),
      hasManagementAccess ? fetch(API_BASE + '/api/volunteers') : Promise.resolve(null)
    ]);

    if (statsRes.status === 401 || dRes.status === 401 || rRes.status === 401) {
      if (dContainer) dContainer.innerHTML = '<div class="text-muted">Session expired. Please <a href="/">Login</a> again.</div>';
      return;
    }

    const [stats, disasters, requests, volunteers] = await Promise.all([
      statsRes.json(),
      dRes.json(),
      rRes.json(),
      vRes && vRes.status !== 401 ? vRes.json() : Promise.resolve(null)
    ]);

    console.log('AidLink Dashboard Data Loaded:', { stats, disastersCount: disasters.length, requestsCount: requests.length });

    // Update cards
    const dCount = stats.disastersCount ?? 0;
    const rCount = stats.requestsCount ?? 0;
    const vCount = stats.totalVolunteers ?? 0;
    const resCount = stats.totalResources ?? 0;

    document.getElementById('card-disasters').textContent = dCount;
    document.getElementById('card-requests').textContent = rCount;
    document.getElementById('card-volunteers').textContent = vCount;
    document.getElementById('card-resources').textContent = resCount;
    console.log('Stat cards updated successfully.');


    // Map
    initMap();
    updateMap(disasters, volunteers);

    // Activity
    try {
      const auditRes = await fetch(API_BASE + '/api/audit');
      if (auditRes.ok) {
        const audits = await auditRes.json();
        activity.innerHTML = audits.slice(0, 15).map(a => `
            <li style="border-bottom: 1px solid var(--border); padding-bottom: 8px; display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <div style="font-weight: 600; font-size: 14px; color: var(--secondary);">${a.action}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">By ${a.user_name || 'System'} • ${new Date(a.timestamp).toLocaleString()}</div>
                </div>
                ${isSuperAdmin ? `
                <button onclick="deleteAuditLog('${a.id}')" class="btn-icon" style="color:#ef4444; background:none; border:none; cursor:pointer;" title="Delete Log">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6m4-11v6"/>
                    </svg>
                </button>` : ''}
            </li>
        `).join('') || '<li>No recent activity</li>';
      } else if (auditRes.status === 403) {
        activity.innerHTML = '<li>Activity restricted to higher-level personnel</li>';
      } else {
        activity.innerHTML = '<li>Operational Activity currently unavailable</li>';
      }
    } catch (e) {
      activity.innerHTML = '<li>Activity Log Sync Error</li>';
    }

    // Render disasters
    dContainer.innerHTML = '';
    disasters.slice(0, 5).forEach(d => dContainer.appendChild(renderDisasterCard(d)));

    // Render requests
    rContainer.innerHTML = '';
    requests.slice(0, 5).forEach(r => rContainer.appendChild(renderRequestCard(r)));
    if (requests.length === 0) rContainer.innerHTML = '<div class="text-muted">No pending requests</div>';

    // Render volunteers for management
    if (hasManagementAccess && vList && volunteers) {
      vList.innerHTML = volunteers.map(v => `
            <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; color: var(--secondary);">${v.name}</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Registered: ${new Date(v.date).toLocaleString()}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${v.skills || 'General Support'}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px;">${v.contact}</div>
                    <div style="display:flex; gap:8px; justify-content:flex-end;">
                        <span class="badge" style="font-size: 9px; ${v.availability === 'available' ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'}">
                            ${v.availability}
                        </span>
                        <button onclick="promoteToAdmin('${v.id}')" class="btn-icon" style="color:var(--primary); background:none; border:none; cursor:pointer;" title="Promote to Admin">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 21v-8m-4 8l4-4 4 4M8 3h8a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
                            </svg>
                        </button>
                        <button onclick="deleteVolunteer('${v.id}')" class="btn-icon" style="color:#ef4444; background:none; border:none; cursor:pointer;" title="Delete Volunteer">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6m4-11v6"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('') || '<div class="text-muted">No volunteers registered</div>';
    }

  } catch (e) {
    console.error(e);
    if (dContainer) dContainer.innerHTML = '<div class="text-muted">Sync Error - Check Connection</div>';
  }
}


async function deleteAuditLog(id) {
  if (!confirm('Delete this activity log?')) return;
  try {
    const res = await fetch(API_BASE + `/api/audit/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Deletion failed');
    if (window.notify) window.notify.showToast('Log entry removed', { type: 'success' });
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Error: ' + e.message, { type: 'error' });
  }
}

async function promoteToAdmin(id) {
  if (!confirm('Are you sure you want to promote this user to Admin? They will have full access to the system.')) return;
  try {
    const res = await fetch(API_BASE + `/api/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' })
    });
    // JSON Content-Type is application/json but I'll use our fetch patch
    if (!res.ok) throw new Error('Promotion failed');
    if (window.notify) window.notify.showToast('User promoted to Admin', { type: 'success' });
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Promotion failed: ' + e.message, { type: 'error' });
  }
}

async function deleteVolunteer(id) {
  if (!confirm('Are you sure you want to delete this volunteer record?')) return;
  try {
    const res = await fetch(API_BASE + `/api/volunteers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    if (window.notify) window.notify.showToast('Volunteer record deleted', { type: 'success' });
    await loadDashboard();
  } catch (e) {
    if (window.notify) window.notify.showToast('Delete failed: ' + e.message, { type: 'error' });
  }
}

// Global function for real-time listener to trigger updates
window.refreshDashboardData = async () => {
  console.log('Real-time sync triggered...');
  await loadDashboard();
};

function startLiveClock() {
  const clockEl = document.getElementById('liveClock');
  const dateEl = document.getElementById('liveDate');
  if (!clockEl || !dateEl) return;

  function update() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    dateEl.textContent = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  update();
  setInterval(update, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  startLiveClock();
});
