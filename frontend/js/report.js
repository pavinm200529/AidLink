// Capture geolocation on load
document.addEventListener('DOMContentLoaded', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById('latInput').value = pos.coords.latitude;
        document.getElementById('lngInput').value = pos.coords.longitude;
        document.getElementById('geoStatus').textContent = `GPS Active: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} `;
      },
      (err) => {
        document.getElementById('geoStatus').textContent = "Precision GPS unavailable (using manual location)";
        document.getElementById('geoStatus').style.color = "#ef4444";
      }
    );
  }
});

document.getElementById('reportForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    title: f.title.value.trim(),
    description: f.description.value.trim(),
    location: f.location.value.trim(),
    severity: f.severity.value,
    lat: f.lat.value ? parseFloat(f.lat.value) : null,
    lng: f.lng.value ? parseFloat(f.lng.value) : null
  };
  const statusEl = document.getElementById('status');
  try {
    const res = await fetch(API_BASE + '/api/disasters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Server error');
    const saved = await res.json();
    if (window.notify) window.notify.showToast('Report submitted (id: ' + saved.id + ')', { type: 'success' });
    f.reset();
  } catch (err) {
    // Offline fallback: save to localStorage
    const pending = JSON.parse(localStorage.getItem('pendingReports') || '[]');
    pending.push(data);
    localStorage.setItem('pendingReports', JSON.stringify(pending));
    statusEl.textContent = 'You appear offline — report saved locally and will sync when online.';
    if (window.notify) window.notify.showToast('Saved locally — will sync when online', { type: 'warn' });
  }
});
