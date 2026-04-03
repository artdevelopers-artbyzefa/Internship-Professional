import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { logError } from './logger.js';
dotenv.config();

/**
 * Send an email using Brevo SMTP
 */
export const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com', port: 587, secure: false,
            auth: { user: process.env.SMTP_USER || process.env.SENDER_EMAIL, pass: process.env.BREVO_API_KEY }
        });
        const info = await transporter.sendMail({
            from: `"${process.env.SENDER_NAME || 'CUI DIMS'}" <${process.env.SENDER_EMAIL}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject, text, html
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        await logError(error, null, 'EMAIL_SEND_ERROR');
        return { success: false, error: error.message };
    }
};

/**
 * Send bulk emails in chunks to respect SMTP limits
 */
export const sendBulkEmails = async (recipients, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com', port: 587, secure: false,
            auth: { user: process.env.SMTP_USER || process.env.SENDER_EMAIL, pass: process.env.BREVO_API_KEY }
        });
        const info = await transporter.sendMail({
            from: `"${process.env.SENDER_NAME || 'CUI DIMS'}" <${process.env.SENDER_EMAIL}>`,
            bcc: recipients, subject, html, text: html.replace(/<[^>]*>?/gm, '')
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        await logError(error, null, 'EMAIL_BULK_SEND_ERROR');
        throw error;
    }
};
