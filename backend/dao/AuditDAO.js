const BaseDAO = require('./BaseDAO');

class AuditDAO extends BaseDAO {
    async log(action, userId, details) {
        const sql = 'INSERT INTO audit_logs (action, user_id, details) VALUES (?, ?, ?)';
        return await this.run(sql, [action, userId, JSON.stringify(details)]);
    }

    async getRecent(limit = 100) {
        const safeLimit = parseInt(limit) || 100;
        const sql = `
            SELECT a.*, u.name as user_name, u.role as user_role 
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.timestamp DESC 
            LIMIT ${safeLimit}`;
        return await this.all(sql);
    }
    async delete(id) {
        const sql = 'DELETE FROM audit_logs WHERE id = ?';
        return await this.run(sql, [id]);
    }
}

module.exports = AuditDAO;
