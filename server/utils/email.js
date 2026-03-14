import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Send an email using Brevo SMTP
 * @param {string|Array} to - Recipient email or array of emails
 * @param {string} subject - Email subject 
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 */
export const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SENDER_EMAIL, // Usually the email associated with Brevo
                pass: process.env.BREVO_API_KEY, 
            },
        });

        const info = await transporter.sendMail({
            from: `"${process.env.SENDER_NAME || 'CUI DIMS'}" <${process.env.SENDER_EMAIL}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject,
            text,
            html,
        });

        console.log('[Email] Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email] Send Error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send bulk emails in chunks to respect SMTP limits if necessary
 * For many students, this prevents timeouts or blocking.
 */
export const sendBulkEmails = async (recipients, subject, html) => {
    // Brevo Free plan allows up to 300 emails per day
    // SMTP can handle multiple recipients in 'to' but 'bcc' is better for privacy.
    // However, for customization, we might want to loop.
    
    // For now, we'll send a single email with recipients in BCC to protect privacy
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.SENDER_EMAIL,
                pass: process.env.BREVO_API_KEY,
            },
        });

        const info = await transporter.sendMail({
            from: `"${process.env.SENDER_NAME || 'CUI DIMS'}" <${process.env.SENDER_EMAIL}>`,
            bcc: recipients, // Hide recipients from each other
            subject,
            html,
            text: html.replace(/<[^>]*>?/gm, ''), // Basic HTML to text conversion
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email] Bulk Send Error:', error);
        throw error;
    }
};
