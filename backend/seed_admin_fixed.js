const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Pavin@2005',
  database: 'aidlink'
};

async function seed() {
  try {
    console.log('Connecting to MySQL...');
    const c = await mysql.createConnection(config);
    console.log('Inserting/updating admin user...');
    await c.query(
      "INSERT INTO users (id, name, email, password, role) VALUES ('admin-001','System Administrator','admin@aidlink.com','admin','admin') ON DUPLICATE KEY UPDATE password='admin'"
    );
    console.log('Admin seeded successfully!');
    await c.end();
  } catch (err) {
    console.error(`Seeding failed: ${err.message}`);
  }
}

seed();
