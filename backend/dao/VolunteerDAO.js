const BaseDAO = require('./BaseDAO');

class VolunteerDAO extends BaseDAO {
    async create({ id, name, contact, skills, availability, date, lat, lng }) {
        const sql = 'INSERT INTO volunteers (id, name, contact, skills, availability, date, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        return await this.run(sql, [id, name, contact, skills, availability, date, lat || null, lng || null]);
    }

    async findAll() {
        const sql = 'SELECT * FROM volunteers ORDER BY date DESC';
        return await this.all(sql);
    }

    async delete(id) {
        const sql = 'DELETE FROM volunteers WHERE id = ?';
        return await this.run(sql, [id]);
    }

    async count() {
        const row = await this.get('SELECT COUNT(*) as count FROM volunteers');
        return row ? row.count : 0;
    }
}

module.exports = VolunteerDAO;

