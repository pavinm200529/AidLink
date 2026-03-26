const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Configure your SMTP settings here
        // For demonstration, we use a mock/log-only transporter if no credentials provided
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || null,
                pass: process.env.SMTP_PASS || null
            }
        });

        this.isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    }

    async sendVolunteerWelcome(volunteer) {
        const { name, email } = volunteer;

        const mailOptions = {
            from: '"AidLink System" <no-reply@aidlink.org>',
            to: email,
            subject: 'Welcome to the AidLink Response Team!',
            text: `Hello ${name},\n\nThank you for registering as a volunteer with AidLink. Your commitment to disaster response is greatly appreciated.\n\nYou can now log in to your dashboard to view assigned tasks and messages.\n\nStay Safe,\nThe AidLink Team`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #10b981;">Welcome to AidLink, ${name}!</h2>
                    <p>Thank you for registering as a volunteer. Your commitment to disaster response and resource management is vital to our mission.</p>
                    
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <strong>Next Steps:</strong>
                        <ul style="margin-top: 10px;">
                            <li>Log in to your dashboard.</li>
                            <li>Update your specialized skills.</li>
                            <li>Wait for resource request assignments.</li>
                        </ul>
                    </div>
                    
                    <p>If you have any questions, please contact your regional coordinator.</p>
                    <p>Stay Safe,<br><strong>The AidLink Response Team</strong></p>
                </div>
            `
        };

        if (!this.isConfigured) {
            console.log('--- MOCK EMAIL START ---');
            console.log(`To: ${email}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log('Body: \n', mailOptions.text);
            console.log('--- MOCK EMAIL END ---');
            return { messageId: 'mock-id' };
        }

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
    async sendRequestUpdate(email, name, request) {
        const mailOptions = {
            from: '"AidLink Notification" <no-reply@aidlink.org>',
            to: email,
            subject: `Request Approved: #${request.id}`,
            text: `Hello ${name},\n\nThe resource request for "${request.requesterName}" has been APPROVED.\nItems: ${request.resources}\n\nPlease proceed with the delivery as planned.\n\nThank you,\nThe AidLink Team`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #15803d;">Request Approved! ✅</h2>
                    <p>Hello <strong>${name}</strong>,</p>
                    <p>Good news! The resource request you are assigned to has been officially <strong>APPROVED</strong> by the administration.</p>
                    
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="margin: 0 0 8px 0; color: #166534;">Request Details:</h4>
                        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                            <li><strong>ID:</strong> #${request.id}</li>
                            <li><strong>Requester:</strong> ${request.requesterName}</li>
                            <li><strong>Resources:</strong> ${request.resources}</li>
                        </ul>
                    </div>
                    
                    <p>Please check your dashboard for any additional notes and coordinate the logistics immediately.</p>
                    <p>Best regards,<br><strong>The AidLink Response Team</strong></p>
                </div>
            `
        };

        if (!this.isConfigured) {
            console.log('--- MOCK NOTIFICATION START ---');
            console.log(`To: ${email}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log('--- MOCK NOTIFICATION END ---');
            return { messageId: 'mock-notify-id' };
        }

        try {
            const info = await this.transporter.sendMail(mailOptions);
            return info;
        } catch (error) {
            console.error('Error sending update email:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
