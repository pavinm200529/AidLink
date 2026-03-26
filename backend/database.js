const mysql = require('mysql2/promise');

// MySQL Connection Configuration
// WARNING: In a production environment, use environment variables (process.env.DB_HOST, etc.)
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pavin@2005',
    database: process.env.DB_DATABASE || 'aidlink',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
};

const pool = mysql.createPool(dbConfig);

async function initDb() {
    try {
        console.log('Connecting to MySQL and validating schema...');
        // Test connection
        const connection = await pool.getConnection();
        console.log('Successfully connected to MySQL.');
        connection.release();

        // Note: For a production-ready system, you might run migrations here or 
        // rely on a pre-executed schema.sql. For now, we assume schema.sql has been run.
        // We could also run CREATE TABLE IF NOT EXISTS here if needed.

    } catch (err) {
        console.error('Error connecting to MySQL:', err.message);
        throw err;
    }
}

const dbAsync = {
    run: async (sql, params = []) => {
        const [result] = await pool.execute(sql, params);
        return { id: result.insertId, changes: result.affectedRows };
    },
    get: async (sql, params = []) => {
        const [rows] = await pool.execute(sql, params);
        return rows[0] || null;
    },
    all: async (sql, params = []) => {
        const [rows] = await pool.execute(sql, params);
        return rows;
    },
    execute: async (sql, params = []) => {
        return await pool.execute(sql, params);
    },
    pool: pool
};

module.exports = { pool, dbAsync, initDb };

