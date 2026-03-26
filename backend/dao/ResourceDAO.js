const BaseDAO = require('./BaseDAO');

class ResourceDAO extends BaseDAO {
    async create({ id, name, quantity, location, notes, date }) {
        const sql = 'INSERT INTO resources (id, name, quantity, location, notes, date) VALUES (?, ?, ?, ?, ?, ?)';
        return await this.run(sql, [id, name, quantity, location, notes, date]);
    }

    async findAll() {
        const sql = 'SELECT * FROM resources ORDER BY date DESC';
        return await this.all(sql);
    }

    async getTotalAvailable() {
        const rows = await this.all('SELECT quantity FROM resources');
        return rows.reduce((acc, r) => acc + (r.quantity || 0), 0);
    }

    async delete(id) {
        const sql = 'DELETE FROM resources WHERE id = ?';
        return await this.run(sql, [id]);
    }
}

module.exports = ResourceDAO;
