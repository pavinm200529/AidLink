// Shared helpers: sync pending reports/requests stored in localStorage when online
function showStatus(msg){
  console.log(msg);
}

async function syncPending(){
  // Send pending reports
  const pendingReports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
  if(pendingReports.length){
    for(const r of pendingReports){
      try{ await fetch(API_BASE + '/api/disasters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)}); }
      catch(e){ showStatus('Sync reports failed'); return; }
    }
    localStorage.removeItem('pendingReports');
    showStatus('Pending reports synced');
  }

  const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
  if(pendingRequests.length){
    for(const rq of pendingRequests){
      try{ await fetch(API_BASE + '/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rq)}); }
      catch(e){ showStatus('Sync requests failed'); return; }
    }
    localStorage.removeItem('pendingRequests');
    showStatus('Pending requests synced');
  }
}

window.addEventListener('online', ()=>{ showStatus('Online — attempting sync'); syncPending(); });
