const mysql = require('mysql2/promise');
const config = { host: '127.0.0.1', port: 3306, user: 'root', password: 'Pavin@2005', database: 'aidlink' };
(async () => {
  const c = await mysql.createConnection(config);
  try {
    await c.query('ALTER TABLE volunteers ADD COLUMN lat DECIMAL(10,8) NULL');
    console.log('Added lat column');
  } catch (e) { console.log('lat:', e.message); }
  try {
    await c.query('ALTER TABLE volunteers ADD COLUMN lng DECIMAL(11,8) NULL');
    console.log('Added lng column');
  } catch (e) { console.log('lng:', e.message); }
  await c.end();
  console.log('Done!');
})();
