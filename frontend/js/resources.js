// resources.js — handles adding resources and listing them
document.getElementById('resourceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const data = { name: f.name.value.trim(), quantity: parseInt(f.quantity.value) || 0, location: f.location.value.trim(), notes: f.notes.value.trim() };
  try {
    const res = await fetch(API_BASE + '/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Server error');
    const saved = await res.json();
    if (window.notify) window.notify.showToast('Inventory Updated: ' + saved.name, { type: 'success' });
    f.reset();
    loadResources();
  } catch (err) {
    const pending = JSON.parse(localStorage.getItem('pendingResources') || '[]');
    pending.push(data);
    localStorage.setItem('pendingResources', JSON.stringify(pending));
    if (window.notify) window.notify.showToast('Resource saved locally (Offline)', { type: 'warn' });
  }
});

async function deleteResource(id) {
  if (!confirm('Are you sure you want to remove this item from inventory?')) return;
  try {
    const res = await fetch(API_BASE + `/api/resources/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Deletion failed');
    if (window.notify) window.notify.showToast('Item removed from inventory', { type: 'success' });
    loadResources();
  } catch (e) {
    if (window.notify) window.notify.showToast('Error removing item', { type: 'error' });
  }
}

async function loadResources() {
  const list = document.getElementById('resourceList');
  list.innerHTML = '<div class="text-muted">Synchronizing inventory...</div>';
  const currentUser = window.session ? window.session.getUser() : null;
  const canManage = currentUser && (['admin', 'government', 'ngo'].includes(currentUser.role));

  try {
    const res = await fetch(API_BASE + '/api/resources');
    if (res.status === 401) {
      list.innerHTML = '<div class="text-muted">Session expired. Please <a href="/">Login</a>.</div>';
      return;
    }
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('Invalid format');
    list.innerHTML = arr.map(r => `
        <div class="card mb-4" style="border-left: 4px solid var(--accent); position: relative;">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <h4 style="margin-bottom:4px;">${r.name}</h4>
                <div style="text-align:right;">
                    <div style="font-size:18px; font-weight:800; color:var(--primary);">${r.quantity}</div>
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Units</div>
                </div>
            </div>
            <p class="text-muted" style="font-size:12px; margin-bottom:8px;">${r.location || 'Central Depot'}</p>
            <p style="font-size:13px; color:var(--text-main);">${r.notes || ''}</p>
            ${canManage ? `
            <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
                <button onclick="deleteResource('${r.id}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                    Delete Item
                </button>
            </div>` : ''}
        </div>
    `).join('') || '<div class="text-muted">Stockpiles are currently empty.</div>';
  } catch (e) {
    list.innerHTML = '<div class="text-muted">Inventory sync error.</div>';
  }
}

document.addEventListener('DOMContentLoaded', loadResources);
