const { dbAsync } = require('./database');

async function migrate() {
    try {
        console.log('Running migrations for Geolocation support...');

        // Add columns to users table
        try {
            await dbAsync.execute("ALTER TABLE users ADD COLUMN lat DECIMAL(10, 8)");
            console.log('Added lat to users');
        } catch (e) { console.log('lat already exists in users or error:', e.message); }

        try {
            await dbAsync.execute("ALTER TABLE users ADD COLUMN lng DECIMAL(11, 8)");
            console.log('Added lng to users');
        } catch (e) { console.log('lng already exists in users or error:', e.message); }

        try {
            await dbAsync.execute("ALTER TABLE users ADD COLUMN status ENUM('READY', 'BUSY', 'OFFLINE') DEFAULT 'READY'");
            console.log('Added status to users');
        } catch (e) { console.log('status already exists in users or error:', e.message); }

        // Add columns to disasters table
        try {
            await dbAsync.execute("ALTER TABLE disasters ADD COLUMN lat DECIMAL(10, 8)");
            console.log('Added lat to disasters');
        } catch (e) { console.log('lat already exists in disasters or error:', e.message); }

        try {
            await dbAsync.execute("ALTER TABLE disasters ADD COLUMN lng DECIMAL(11, 8)");
            console.log('Added lng to disasters');
        } catch (e) { console.log('lng already exists in disasters or error:', e.message); }

        console.log('Migrations completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
