const BaseDAO = require('./BaseDAO');

class AssignmentDAO extends BaseDAO {
    async assign(requestId, volunteerId) {
        const sql = 'INSERT INTO volunteer_assignments (request_id, volunteer_id) VALUES (?, ?)';
        return await this.run(sql, [requestId, volunteerId]);
    }

    async findByRequestId(requestId) {
        const sql = `
            SELECT va.*, u.name as volunteer_name, u.email as volunteer_email 
            FROM volunteer_assignments va
            JOIN users u ON va.volunteer_id = u.id
            WHERE va.request_id = ?`;
        return await this.all(sql, [requestId]);
    }

    async findByVolunteerId(volunteerId) {
        const sql = `
            SELECT va.*, r.requester_name, r.resources, r.status 
            FROM volunteer_assignments va
            JOIN resource_requests r ON va.request_id = r.id
            WHERE va.volunteer_id = ?`;
        return await this.all(sql, [volunteerId]);
    }

    async remove(requestId, volunteerId) {
        const sql = 'DELETE FROM volunteer_assignments WHERE request_id = ? AND volunteer_id = ?';
        return await this.run(sql, [requestId, volunteerId]);
    }
}

module.exports = AssignmentDAO;
