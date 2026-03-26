const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
    host: '127.0.0.1',
    user: 'root',
    password: 'Pavin@2005'
};

async function setup() {
    let connection;
    try {
        console.log('Connecting to MySQL...');
        connection = await mysql.createConnection(config);

        console.log('Creating database "aidlink"...');
        await connection.query('CREATE DATABASE IF NOT EXISTS aidlink');
        await connection.query('USE aidlink');

        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split schema into individual queries
        const queries = schema
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        console.log(`Executing ${queries.length} queries...`);
        for (const query of queries) {
            await connection.query(query);
        }

        console.log('Database and tables created successfully!');
    } catch (err) {
        console.error('Error during setup:', err);
    } finally {
        if (connection) await connection.end();
    }
}

setup();
