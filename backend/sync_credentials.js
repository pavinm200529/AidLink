const mysql = require('mysql2/promise');

const config = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Pavin@2005',
    database: 'aidlink'
};

async function sync() {
    try {
        const c = await mysql.createConnection(config);
        console.log('Syncing credentials...');
        
        // Add or update admin@example.org to match README.md
        await c.query(
            "INSERT INTO users (id, name, email, password, role) VALUES ('admin-002', 'System Admin', 'admin@example.org', 'Admin@123', 'admin') ON DUPLICATE KEY UPDATE password='Admin@123'"
        );
        
        console.log('Credentials synced successfully!');
        await c.end();
    } catch (err) {
        console.error('Sync failed:', err.message);
    }
}

sync();
