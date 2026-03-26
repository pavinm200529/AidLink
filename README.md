# Disaster Resource Management (Simple Demo)

Run the backend and open the frontend in your browser.

1. Open a terminal and go to `backend`:

```powershell
cd backend
npm install
npm start
```

2. Open http://localhost:3000 in your browser.

Quick verification of endpoints (examples):

```powershell
curl http://localhost:3000/api/disasters
curl http://localhost:3000/api/requests
curl http://localhost:3000/api/volunteers
curl http://localhost:3000/api/resources
```

Authentication (demo):

1. Use the login page at: `http://localhost:3000/login.html` and sign in with an organisation email.
2. The demo login returns a session token used by the frontend and attached to API requests in the `x-auth-token` header.
3. For the local demo you can use `admin@example.org / Admin@123` (admin role).

Security note: This is a local demo. In production always store hashed passwords and use signed JWT or OAuth providers.

Notes:
- Frontend is served by the Express backend.
- Offline submissions are saved to `localStorage` and synced when back online (see `frontend/js/main.js`).
- Data persisted as JSON files in `backend/data/*.json`. For production, replace this with a DB (MongoDB/Postgres).
