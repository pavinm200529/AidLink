document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const statusEl = document.getElementById('status');
  const submitBtn = f.querySelector('button[type="submit"]');

  // Build the request payload using the correct field names
  const data = {
    requesterName: f.requesterName.value.trim(),
    contact: f.contact.value.trim(),
    resources: f.resources.value + (f.quantity.value ? ' x' + f.quantity.value : ''),
    priority: f.priority.value,
    location: f.location.value.trim(),
    disasterId: null
  };

  // Validate required fields
  if (!data.requesterName || !data.contact || !data.resources || !data.location) {
    statusEl.textContent = 'Please fill in all required fields.';
    statusEl.style.color = '#ef4444';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';
  statusEl.textContent = '';

  try {
    const res = await fetch(API_BASE + '/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': session.getToken() || '' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Server error — show the actual message, NOT the offline message
      statusEl.style.color = '#ef4444';
      statusEl.textContent = '❌ Error: ' + (err.error || 'Server error (' + res.status + ')');
      return;
    }

    const saved = await res.json();
    statusEl.style.color = '#16a34a';
    statusEl.textContent = '✅ Request submitted successfully! (ID: ' + saved.id + ')';
    if (window.notify) window.notify.showToast('Resource request submitted!', { type: 'success' });
    f.reset();
  } catch (err) {
    // Only reach here for actual network failures (offline)
    const pending = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    pending.push(data);
    localStorage.setItem('pendingRequests', JSON.stringify(pending));
    statusEl.style.color = '#d97706';
    statusEl.textContent = '⚠️ You appear offline — request saved locally and will sync when online.';
    if (window.notify) window.notify.showToast('Saved locally — will sync when online', { type: 'warning' });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Resource Request';
  }
});
