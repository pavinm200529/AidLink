const emailService = require('../services/EmailService');

async function test() {
    console.log('Testing Email Notification...');
    const mockVolunteer = {
        name: 'John Test',
        email: 'john.test@example.com'
    };

    try {
        const result = await emailService.sendVolunteerWelcome(mockVolunteer);
        console.log('Test successful!', result);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
