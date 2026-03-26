const express = require('express');
const path = require('path');
const cors = require('cors');

const { authenticate, requireRole, logAudit } = require('./auth');
const { dbAsync, initDb } = require('./database');

// DAO Imports
const UserDAO = require('./dao/UserDAO');
const DisasterDAO = require('./dao/DisasterDAO');
const RequestDAO = require('./dao/RequestDAO');
const VolunteerDAO = require('./dao/VolunteerDAO');
const ResourceDAO = require('./dao/ResourceDAO');
const AuditDAO = require('./dao/AuditDAO');
const MessageDAO = require('./dao/MessageDAO');
const AssignmentDAO = require('./dao/AssignmentDAO');
const emailService = require('./services/EmailService');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// DAO Instances
const userDAO = new UserDAO(dbAsync);
const disasterDAO = new DisasterDAO(dbAsync);
const requestDAO = new RequestDAO(dbAsync);
const volunteerDAO = new VolunteerDAO(dbAsync);
const resourceDAO = new ResourceDAO(dbAsync);
const auditDAO = new AuditDAO(dbAsync);
const messageDAO = new MessageDAO(dbAsync);
const assignmentDAO = new AssignmentDAO(dbAsync);

app.use(cors());
app.use(express.json());

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected for real-time updates');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Helper for robust JSON parsing
function safeParse(str, fallback = []) {
  if (typeof str !== 'string' || !str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('JSON Parse Error:', e.message, 'Input:', str);
    return fallback;
  }
}

// Attach simple auth middleware for API routes
app.use('/api', authenticate);

// --- API ROUTES ---

app.post('/api/disasters', async (req, res) => {
  const { title, description, location, severity, date, lat, lng } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Missing required fields' });
  const id = Date.now().toString();
  const newDisaster = {
    id, title, description,
    location: location || '',
    severity: severity || 'low',
    date: date ? new Date(date) : new Date(),
    state: 'reported',
    reporter_id: req.user ? req.user.id : null,
    lat, lng
  };

  try {
    await disasterDAO.create(newDisaster);
    await auditDAO.log('create:disaster', req.user ? req.user.id : null, { id, title });

    // Notify nearby volunteers if coordinates provided
    if (lat && lng) {
      const radius = 50; // 50km
      const nearby = await userDAO.findNearbyVolunteers(lat, lng, radius);
      nearby.forEach(v => {
        // Emit to specific volunteer if we had a socket mapping 
        // For now, emit a broadcast with a lat/lng filter in the frontend 
        // OR simulate a targeted notify
        io.emit('disaster_alert', {
          disaster: newDisaster,
          targetVolunteerId: v.id,
          distance: v.distance
        });
      });
    }

    io.emit('new_disaster', { ...newDisaster, submittedBy: req.user ? { name: req.user.name, role: req.user.role, email: req.user.email } : null });
    res.status(201).json(newDisaster);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time location update
app.put('/api/users/location', async (req, res) => {
  const { lat, lng } = req.body;
  if (!req.user || req.user.id === 'anonymous') return res.status(401).json({ error: 'Login required' });
  try {
    await userDAO.updateLocation(req.user.id, lat, lng);
    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status update (READY/BUSY/OFFLINE)
app.put('/api/users/status', async (req, res) => {
  const { status } = req.body;
  if (!req.user || req.user.id === 'anonymous') return res.status(401).json({ error: 'Login required' });
  try {
    await userDAO.updateStatus(req.user.id, status);
    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/disasters/:id', requireRole('admin', 'government', 'ngo'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await disasterDAO.delete(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Disaster not found' });
    await auditDAO.log('delete:disaster', req.user ? req.user.id : null, { id });
    res.json({ message: 'Disaster report deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/disasters', async (req, res) => {
  try {
    const disasters = await disasterDAO.findAll();
    res.json(disasters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/disasters/:id/respond', requireRole('volunteer'), async (req, res) => {
  const { id } = req.params;
  try {
    await userDAO.updateStatus(req.user.id, 'BUSY');
    await auditDAO.log('volunteer:respond', req.user.id, { disasterId: id });
    // In a real app, we might create a specific assignment record here.
    // For now, we update the disaster state to active if it was just reported
    const d = await disasterDAO.findById(id);
    if (d && d.state === 'reported') {
      await disasterDAO.updateState(id, 'active');
    }
    io.emit('volunteer_responded', { disasterId: id, volunteer: req.user });
    res.json({ message: 'Response recorded. Status set to BUSY.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', async (req, res) => {
  const { disasterId, requesterName, resources, contact, priority, location } = req.body;
  if (!requesterName || !resources) return res.status(400).json({ error: 'Missing required fields' });
  const id = Date.now().toString();
  const newRequest = {
    id, disaster_id: disasterId || null, requester_name: requesterName, resources, contact: contact || '',
    priority: priority || 'Regular', location: location || '', status: 'pending', date: new Date(),
    submitted_by_id: req.user ? req.user.id : null
  };

  try {
    await requestDAO.create(newRequest);
    await auditDAO.log('create:request', req.user ? req.user.id : null, { id, disasterId: newRequest.disaster_id });
    io.emit('new_request', { ...newRequest, submittedBy: req.user ? { name: req.user.name, role: req.user.role, email: req.user.email } : null });

    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    let rows;
    if (req.user && req.user.role === 'volunteer') {
      rows = await requestDAO.findAssignedTo(req.user.id);
    } else {
      rows = await requestDAO.findAll();
    }
    const requests = rows.map(r => ({ ...r, resources: safeParse(r.resources) }));
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests/:id/assign', requireRole('admin', 'government', 'ngo'), async (req, res) => {
  const { id } = req.params;
  const { volunteerId } = req.body;
  if (!volunteerId) return res.status(400).json({ error: 'Volunteer ID is required' });

  try {
    await assignmentDAO.assign(id, volunteerId);
    await requestDAO.updateStatus(id, 'assigned');
    await auditDAO.log('assign:request', req.user ? req.user.id : null, { id, volunteerId });
    const updated = await requestDAO.findById(id);
    io.emit('request_assigned', { id, volunteerId, updated });
    res.json({ ...updated, resources: safeParse(updated.resources) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/requests/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await requestDAO.updateStatus(id, status);
    await auditDAO.log('update:request_status', req.user ? req.user.id : null, { id, status });
    const updated = await requestDAO.findById(id);

    // If approved, notify assigned volunteers
    if (status === 'approved') {
      try {
        const assignments = await assignmentDAO.findByRequestId(id);
        const msgText = `Request for ${updated.resources} has been APPROVED.`;
        
        // Log to messages table for shared history
        await messageDAO.create({ request_id: id, sender_id: req.user ? req.user.id : 'system', message: msgText });

        for (const ass of assignments) {
          if (ass.volunteer_email) {
            await emailService.sendRequestUpdate(ass.volunteer_email, ass.volunteer_name, {
              id: updated.id,
              requesterName: updated.requester_name,
              resources: updated.resources,
              status: 'APPROVED'
            });
          }
          // Real-time notification for the volunteer
          io.emit('volunteer_notification', {
            volunteerId: ass.volunteer_id,
            requestId: id,
            title: 'Request Approved',
            message: msgText
          });
        }
        
        // Broadcast new message update to refresh UI
        const messages = await messageDAO.findByRequestId(id);
        io.emit('new_message', { requestId: id, messages });
      } catch (notifyErr) {
        console.error('Failed to notify volunteers:', notifyErr);
      }
    }

    res.json({ ...updated, resources: safeParse(updated.resources) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/requests/:id/response', requireRole('admin', 'government', 'ngo'), async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  try {
    await requestDAO.updateResponse(id, response);
    await auditDAO.log('update:request_response', req.user ? req.user.id : null, { id });
    const updated = await requestDAO.findById(id);

    // Also Log to messages table so it's visible in chat
    const msgText = `Admin Response: ${response}`;
    await messageDAO.create({ request_id: id, sender_id: req.user ? req.user.id : 'system', message: msgText });

    // Notify assigned volunteers
    const assignments = await assignmentDAO.findByRequestId(id);
    for (const ass of assignments) {
      io.emit('volunteer_notification', {
        volunteerId: ass.volunteer_id,
        requestId: id,
        title: 'New Response Received',
        message: response
      });
    }

    // Refresh message list
    const messages = await messageDAO.findByRequestId(id);
    io.emit('new_message', { requestId: id, messages });

    res.json({ ...updated, resources: safeParse(updated.resources) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message content required' });
  try {
    await messageDAO.create({ request_id: id, sender_id: req.user.id, message });
    const messages = await messageDAO.findByRequestId(id);
    io.emit('new_message', { requestId: id, messages });
    res.status(201).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests/:id/messages', async (req, res) => {
  const { id } = req.params;
  try {
    const messages = await messageDAO.findByRequestId(id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/requests/:id', requireRole('admin', 'government', 'ngo'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await requestDAO.delete(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Request not found' });
    await auditDAO.log('delete:request', req.user ? req.user.id : null, { id });
    res.json({ message: 'Resource request deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/disasters/:id/state', requireRole('admin', 'government', 'ngo'), async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;
  try {
    const d = await disasterDAO.findById(id);
    if (!d) return res.status(404).json({ error: 'Disaster not found' });

    const allowed = { reported: ['verified', 'active', 'resolved'], verified: ['active', 'resolved'], active: ['resolved'], resolved: [] };
    if (!allowed[d.state] || !allowed[d.state].includes(state)) {
      return res.status(400).json({ error: `Invalid transition from ${d.state} to ${state}` });
    }

    await disasterDAO.updateState(id, state);
    await auditDAO.log('update:disaster_state', req.user ? req.user.id : null, { id, state });
    const updated = await disasterDAO.findById(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const disasterStats = await disasterDAO.getStats();
    const requests = await requestDAO.findAll();
    const totalAvailable = await resourceDAO.getTotalAvailable();
    const volunteersCount = await volunteerDAO.count();
    const resources = await resourceDAO.findAll();

    const totalRequested = requests.reduce((acc, r) => {
      const items = safeParse(r.resources);
      return acc + (items ? items.length : 0);
    }, 0);
    const shortage = totalRequested > totalAvailable;

    res.json({
      disastersCount: disasterStats.count,
      byState: disasterStats.byState,
      requestsCount: requests.length,
      totalVolunteers: volunteersCount,
      totalResources: resources.length,
      totalAvailable,
      totalRequested,
      shortage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userDAO.validate(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    await auditDAO.log('auth:login', user.id, { email: user.email });
    res.json({ token: user.id, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields are required' });
  try {
    const existing = await userDAO.findByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const id = 'u-' + Date.now().toString();
    await userDAO.create({ id, name, email, password, role });
    await auditDAO.log('auth:register', id, { email });

    // Trigger email notification for volunteers
    if (role === 'volunteer') {
      emailService.sendVolunteerWelcome({ name, email }).catch(err => {
        console.error('Failed to send welcome email:', err);
      });
    }

    res.status(201).json({ message: 'User registered successfully', userId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit', requireRole('admin', 'government', 'ngo'), async (req, res) => {
  try {
    const audits = await auditDAO.getRecent();
    res.json(audits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/certificates/:assignmentId', async (req, res) => {
  const { assignmentId } = req.params;
  try {
    const sql = `
      SELECT va.*, u.name as user_name, d.title as disaster_title
      FROM volunteer_assignments va
      JOIN users u ON va.volunteer_id = u.id
      JOIN resource_requests rr ON va.request_id = rr.id
      JOIN disasters d ON rr.disaster_id = d.id
      WHERE va.id = ?
    `;
    const rows = await dbAsync.all(sql, [assignmentId]);
    if (!rows.length) return res.status(404).json({ error: 'Certificate data not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/volunteers', requireRole('admin', 'government', 'ngo'), async (req, res) => {
  try {
    const volunteers = await userDAO.findByRole('volunteer');
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/volunteers', async (req, res) => {
  const { name, contact, skills, availability, lat, lng } = req.body;
  if (!name || !contact) return res.status(400).json({ error: 'Missing required fields' });
  const id = Date.now().toString();
  const v = { id, name, contact, skills: skills || '', availability: availability || 'available', date: new Date(), lat: lat || null, lng: lng || null };
  try {
    await volunteerDAO.create(v);
    io.emit('admin_notification', {
      type: 'volunteer_registration',
      message: `New volunteer registered: ${name}`,
      details: v
    });
    res.status(201).json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/volunteers', async (req, res) => {
  try {
    const volunteers = await volunteerDAO.findAll();
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/volunteers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Fetch volunteer info to find matching user account
    const volunteer = await dbAsync.get('SELECT * FROM volunteers WHERE id = ?', [id]);
    if (volunteer) {
      // 2. Try to find and delete matching user account by name
      const matchingUser = await userDAO.findByName(volunteer.name);
      if (matchingUser && matchingUser.role === 'volunteer') {
        await userDAO.delete(matchingUser.id);
        console.log(`Cascade: Deleted user account for volunteer ${volunteer.name}`);
      }
    }

    const result = await volunteerDAO.delete(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Volunteer record not found' });

    await auditDAO.log('delete:volunteer', req.user ? req.user.id : null, { id, name: volunteer ? volunteer.name : 'Unknown' });
    res.json({ message: 'Volunteer registration and account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resources', requireRole('admin', 'government', 'ngo', 'volunteer'), async (req, res) => {
  const { name, quantity, location, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing resource name' });
  const id = Date.now().toString();
  const date = new Date();
  try {
    await resourceDAO.create({ id, name, quantity: quantity || 0, location: location || '', notes: notes || '', date });
    await auditDAO.log('create:resource', req.user ? req.user.id : null, { id, name, quantity });
    res.status(201).json({ id, name, quantity, location, notes, date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resources', async (req, res) => {
  try {
    const resources = await resourceDAO.findAll();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/resources/:id', requireRole('admin', 'government', 'ngo'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await resourceDAO.delete(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Resource not found' });
    await auditDAO.log('delete:resource', req.user ? req.user.id : null, { id });
    res.json({ message: 'Inventory item removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 3000;

// Initialize Database then Start Server
initDb().then(() => {
  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Fatal Database Error:', err);
  process.exit(1);
});


