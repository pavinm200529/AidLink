const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: 'Pavin@2005',
    database: 'aidlink'
};

async function seed() {
    let connection;
    try {
        connection = await mysql.createConnection(config);

        console.log('Seeding admin user...');
        await connection.query(
            'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=name',
            ['admin-001', 'System Administrator', 'admin@aidlink.com', 'admin', 'admin']
        );

        console.log('Admin user seeded successfully!');
    } catch (err) {
        console.error('Error during seeding:', err);
    } finally {
        if (connection) await connection.end();
    }
}

seed();
