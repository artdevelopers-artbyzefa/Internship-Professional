/**
 * @fileoverview Email Dispatch Utility for Internship Management.
 * This module uses Brevo (formerly Sendinblue) SMTP relay to dispatch
 * single and bulk notifications to students and faculty members.
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { logError } from './logger.js';
dotenv.config();

/**
 * Dispatches a single email message to a specific recipient.
 * Uses the configured Brevo SMTP credentials from environment variables.
 * 
 * @param {Object} options - Sending parameters.
 * @param {string|string[]} options.to - Recipient email or array of emails.
 * @param {string} options.subject - Email subject line.
 * @param {string} [options.text] - Plain text version of message.
 * @param {string} [options.html] - HTML content of message.
 * @returns {Promise<Object>} Success status and message ID.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com', 
            port: 587, 
            secure: false,
            auth: { 
                user: process.env.SMTP_USER || process.env.SENDER_EMAIL, 
                pass: process.env.BREVO_API_KEY 
            }
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
 * Dispatches bulk emails via BCC for efficiency while respecting SMTP limits.
 * Automatically generates a plain-text fallback from HTML input.
 * 
 * @param {string[]} recipients - Array of email addresses.
 * @param {string} subject - Email subject line.
 * @param {string} html - HTML content of message.
 * @returns {Promise<Object>} Success status and message ID.
 * @throws {Error} If the SMTP transaction fails.
 */
export const sendBulkEmails = async (recipients, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com', 
            port: 587, 
            secure: false,
            auth: { 
                user: process.env.SMTP_USER || process.env.SENDER_EMAIL, 
                pass: process.env.BREVO_API_KEY 
            }
        });

        const info = await transporter.sendMail({
            from: `"${process.env.SENDER_NAME || 'CUI DIMS'}" <${process.env.SENDER_EMAIL}>`,
            bcc: recipients, 
            subject, 
            html, 
            text: html.replace(/<[^>]*>?/gm, '')
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        await logError(error, null, 'EMAIL_BULK_SEND_ERROR');
        throw error;
    }
};

