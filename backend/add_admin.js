const mysql = require('mysql2/promise');

// Configuration matches your local database
const config = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Pavin@2005',
    database: 'aidlink'
};

async function addAdmin(name, email, password) {
    if (!name || !email || !password) {
        console.log('Usage: node add_admin.js "Name" "email@example.com" "password123"');
        return;
    }

    try {
        const c = await mysql.createConnection(config);
        const id = 'admin-' + Date.now();
        
        await c.query(
            "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, 'admin') ON DUPLICATE KEY UPDATE password=?",
            [id, name, email, password, password]
        );
        
        console.log(`Admin account created successfully for: ${name} (${email})`);
        await c.end();
    } catch (err) {
        console.error('Failed to create admin:', err.message);
    }
}

// Get arguments from command line
const [,, name, email, password] = process.argv;
addAdmin(name, email, password);
