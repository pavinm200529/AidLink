const mysql = require('mysql2/promise');

async function test() {
  const configs = [
    { host: '127.0.0.1', port: 3306, user: 'root', password: 'Pavin@2005', database: 'aidlink' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'aidlink' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: 'root', database: 'aidlink' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'aidlink' },
    { host: 'localhost', port: 3306, user: 'root', password: '', database: 'aidlink' },
  ];

  for (const config of configs) {
    try {
      console.log(`Testing config: ${JSON.stringify(config)}`);
      const connection = await mysql.createConnection(config);
      const [rows] = await connection.query('SELECT CURRENT_USER(), USER(), VERSION()');
      console.log('Success!', rows[0]);
      await connection.end();
      return;
    } catch (err) {
      console.log(`Failed: ${err.message} (code: ${err.code})`);
    }
  }
}

test();
