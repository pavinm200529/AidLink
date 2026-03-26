class BaseDAO {
    constructor(dbAsync) {
        this.db = dbAsync;
    }

    async run(sql, params = []) {
        // MySQL2 result is [resultSetHeader, fields]
        return await this.db.run(sql, params);
    }

    async get(sql, params = []) {
        // MySQL2 result is [rows, fields]
        return await this.db.get(sql, params);
    }

    async all(sql, params = []) {
        return await this.db.all(sql, params);
    }
}

module.exports = BaseDAO;

