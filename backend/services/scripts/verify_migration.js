const { dbAsync, initDb } = require('../database');
const UserDAO = require('../dao/UserDAO');
const DisasterDAO = require('../dao/DisasterDAO');

async function verify() {
    try {
        console.log('--- Starting Verification ---');
        await initDb();
        console.log('Database initialized.');

        const userDAO = new UserDAO(dbAsync);
        const disasterDAO = new DisasterDAO(dbAsync);

        // Test UserDAO
        console.log('Testing UserDAO...');
        const testUser = {
            id: 'test-' + Date.now(),
            name: 'Test User',
            email: 'test' + Date.now() + '@example.com',
            password: 'password123',
            role: 'citizen'
        };
        await userDAO.create(testUser);
        const foundUser = await userDAO.findByEmail(testUser.email);
        if (foundUser && foundUser.name === 'Test User') {
            console.log('✅ UserDAO: Create and find success');
        } else {
            throw new Error('❌ UserDAO: Create or find failed');
        }

        // Test DisasterDAO
        console.log('Testing DisasterDAO...');
        const testDisaster = {
            id: 'd-' + Date.now(),
            title: 'Test Disaster',
            description: 'A test disaster',
            location: 'Test City',
            severity: 'high',
            date: new Date().toISOString(),
            state: 'reported',
            reporter_id: testUser.id
        };
        await disasterDAO.create(testDisaster);
        const allDisasters = await disasterDAO.findAll();
        if (allDisasters.some(d => d.id === testDisaster.id)) {
            console.log('✅ DisasterDAO: Create and find all success');
        } else {
            throw new Error('❌ DisasterDAO: Create or find all failed');
        }

        console.log('--- Verification Successful ---');
        process.exit(0);
    } catch (err) {
        console.error('--- Verification Failed ---');
        console.error(err);
        process.exit(1);
    }
}

verify();
