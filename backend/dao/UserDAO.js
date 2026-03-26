const BaseDAO = require('./BaseDAO');

class UserDAO extends BaseDAO {
    async create({ id, name, email, password, role, lat, lng, status }) {
        const sql = 'INSERT INTO users (id, name, email, password, role, lat, lng, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        return await this.run(sql, [id, name, email, password, role, lat || null, lng || null, status || 'READY']);
    }

    async updateLocation(id, lat, lng) {
        const sql = 'UPDATE users SET lat = ?, lng = ? WHERE id = ?';
        return await this.run(sql, [lat, lng, id]);
    }

    async updateStatus(id, status) {
        const sql = 'UPDATE users SET status = ? WHERE id = ?';
        return await this.run(sql, [status, id]);
    }

    async updateRole(id, role) {
        const sql = 'UPDATE users SET role = ? WHERE id = ?';
        return await this.run(sql, [role, id]);
    }

    async findNearbyVolunteers(lat, lng, radiusKm = 50) {
        const sql = `
            SELECT id, name, email, lat, lng, status,
            ( 6371 * acos( cos( radians(?) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(?) ) + sin( radians(?) ) * sin( radians( lat ) ) ) ) AS distance
            FROM users 
            WHERE role = 'volunteer' AND status = 'READY'
            HAVING distance < ?
            ORDER BY distance LIMIT 20`;
        return await this.all(sql, [lat, lng, lat, radiusKm]);
    }

    async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        return await this.get(sql, [email]);
    }

    async findById(id) {
        const sql = 'SELECT * FROM users WHERE id = ?';
        return await this.get(sql, [id]);
    }

    async validate(email, password) {
        const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
        return await this.get(sql, [email, password]);
    }

    async findByRole(role) {
        const sql = 'SELECT id, name, email, role, lat, lng, status FROM users WHERE role = ?';
        return await this.all(sql, [role]);
    }

    async findByName(name) {
        const sql = 'SELECT * FROM users WHERE name = ?';
        return await this.get(sql, [name]);
    }

    async delete(id) {
        const sql = 'DELETE FROM users WHERE id = ?';
        return await this.run(sql, [id]);
    }
}

module.exports = UserDAO;
