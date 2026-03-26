const { dbAsync } = require('./database');
const UserDAO = require('./dao/UserDAO');
const AuditDAO = require('./dao/AuditDAO');

const userDAO = new UserDAO(dbAsync);
const auditDAO = new AuditDAO(dbAsync);

// Simple authenticate middleware — in production use JWT/OAuth with signed tokens
async function authenticate(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) {
    req.user = { id: 'anonymous', role: 'citizen', name: 'Anonymous' };
    return next();
  }

  try {
    const user = await userDAO.findById(token);
    if (!user) return res.status(401).json({ error: 'Invalid auth token' });
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

function requireRole(...allowed) {
  return function (req, res, next) {
    const role = req.user && req.user.role ? req.user.role : 'citizen';
    if (allowed.includes(role) || allowed.includes('any')) return next();
    return res.status(403).json({ error: 'Forbidden. Requires role: ' + allowed.join(',') });
  }
}

async function logAudit(action, user, details) {
  const userId = user ? user.id : 'system';
  try {
    await auditDAO.log(action, userId, details);
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = { authenticate, requireRole, logAudit };
