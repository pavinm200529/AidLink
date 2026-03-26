const BaseDAO = require('./BaseDAO');

class DisasterDAO extends BaseDAO {
    async create({ id, title, description, location, severity, date, state, reporter_id, lat, lng }) {
        const sql = 'INSERT INTO disasters (id, title, description, location, severity, date, state, reporter_id, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        return await this.run(sql, [id, title, description, location, severity, date, state, reporter_id, lat || null, lng || null]);
    }

    async findAll() {
        const sql = 'SELECT * FROM disasters ORDER BY date DESC';
        return await this.all(sql);
    }

    async updateState(id, state) {
        const sql = 'UPDATE disasters SET state = ? WHERE id = ?';
        return await this.run(sql, [state, id]);
    }

    async findById(id) {
        const sql = 'SELECT * FROM disasters WHERE id = ?';
        return await this.get(sql, [id]);
    }

    async delete(id) {
        const sql = 'DELETE FROM disasters WHERE id = ?';
        return await this.run(sql, [id]);
    }

    async getStats() {
        const disasters = await this.all('SELECT state FROM disasters');
        const byState = disasters.reduce((acc, d) => {
            acc[d.state] = (acc[d.state] || 0) + 1;
            return acc;
        }, {});
        return { count: disasters.length, byState };
    }
}

module.exports = DisasterDAO;
