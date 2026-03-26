const BaseDAO = require('./BaseDAO');

class MessageDAO extends BaseDAO {
    async create({ request_id, sender_id, message }) {
        const sql = 'INSERT INTO messages (request_id, sender_id, message) VALUES (?, ?, ?)';
        return await this.run(sql, [request_id, sender_id, message]);
    }

    async findByRequestId(requestId) {
        const sql = `
            SELECT m.*, u.name as sender_name, u.role as sender_role 
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.request_id = ?
            ORDER BY m.created_at ASC`;
        return await this.all(sql, [requestId]);
    }
}

module.exports = MessageDAO;
