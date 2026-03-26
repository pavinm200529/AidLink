const BaseDAO = require('./BaseDAO');

class RequestDAO extends BaseDAO {
    async create({ id, disaster_id, requester_name, resources, contact, priority, location, status, date, submitted_by_id }) {
        const sql = 'INSERT INTO resource_requests (id, disaster_id, requester_name, resources, contact, priority, location, status, admin_response, date, submitted_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        // MySQL JSON columns accept stringified JSON or objects depending on driver, mysql2 accepts objects if configured or strings. 
        // We'll use JSON.stringify for safety.
        return await this.run(sql, [id, disaster_id, requester_name, JSON.stringify(resources), contact, priority, location, status, null, date, submitted_by_id]);
    }

    async findAll() {
        const sql = `
            SELECT r.*, GROUP_CONCAT(u.name) as assigned_volunteer_name, MAX(va.id) as assignment_id
            FROM resource_requests r
            LEFT JOIN volunteer_assignments va ON r.id = va.request_id
            LEFT JOIN users u ON va.volunteer_id = u.id
            GROUP BY r.id
            ORDER BY r.date DESC`;
        return await this.all(sql);
    }

    async findAssignedTo(volunteerId) {
        const sql = `
            SELECT r.*
            FROM resource_requests r
            JOIN volunteer_assignments va ON r.id = va.request_id
            WHERE va.volunteer_id = ?
            ORDER BY r.date DESC`;
        return await this.all(sql, [volunteerId]);
    }

    async updateStatus(id, status) {
        const sql = 'UPDATE resource_requests SET status = ? WHERE id = ?';
        return await this.run(sql, [status, id]);
    }

    async updateResponse(id, response) {
        const sql = 'UPDATE resource_requests SET admin_response = ? WHERE id = ?';
        return await this.run(sql, [response, id]);
    }

    async delete(id) {
        const sql = 'DELETE FROM resource_requests WHERE id = ?';
        return await this.run(sql, [id]);
    }

    async findById(id) {
        const sql = 'SELECT * FROM resource_requests WHERE id = ?';
        return await this.get(sql, [id]);
    }
}

module.exports = RequestDAO;

