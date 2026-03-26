const { dbAsync } = require('./backend/database.js');

async function fixDates() {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

    console.log(`Synchronizing database timestamps to: ${nowStr}`);

    try {
        // Fix disasters
        const disasters = await dbAsync.all('SELECT id, date FROM disasters');
        for (const d of disasters) {
            const dDate = new Date(d.date);
            if (dDate > now) {
                console.log(`Fixing future disaster date: ${d.id} (${d.date} -> ${nowStr})`);
                await dbAsync.run('UPDATE disasters SET date = ? WHERE id = ?', [nowStr, d.id]);
            }
        }

        // Fix resource requests
        const requests = await dbAsync.all('SELECT id, date FROM resource_requests');
        for (const r of requests) {
            const rDate = new Date(r.date);
            if (rDate > now) {
                console.log(`Fixing future request date: ${r.id} (${r.date} -> ${nowStr})`);
                await dbAsync.run('UPDATE resource_requests SET date = ? WHERE id = ?', [nowStr, r.id]);
            }
        }

        console.log('Database time synchronization complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing dates:', err);
        process.exit(1);
    }
}

fixDates();
