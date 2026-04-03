import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { logError } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Initializes and returns a Brevo-based SMTP transporter for email dispatch.
 */
const getTransporter = () => {
    const smtpUser = (process.env.SMTP_USER || process.env.SENDER_EMAIL || '').trim();
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    return nodemailer.createTransport({ host: 'smtp-relay.brevo.com', port: 587, secure: false, auth: { user: smtpUser, pass: apiKey } });
};

/**
 * Wraps a message into a professional premium HTML/CSS template.
 */
const wrapTemplate = (title, name, message, buttonLabel, buttonUrl, secondaryText = '') => {
  const brandColor = '#2563eb';
  const textColor = '#1e293b';
  const mutedColor = '#64748b';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
        
        body { font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f1f5f9; padding-bottom: 40px; padding-top: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: ${textColor}; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); }
        
        .header { 
            background: linear-gradient(-45deg, #1e3a8a, #3b82f6, #2563eb, #1d4ed8);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
            padding: 70px 40px; 
            text-align: center; 
            position: relative; 
        }
        
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .header h1 { color: #ffffff; margin: 0; font-size: 34px; letter-spacing: -1.5px; font-weight: 600; text-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .content { padding: 56px 48px; line-height: 1.7; }
        .content h2 { font-size: 26px; color: #0f172a; margin-bottom: 20px; font-weight: 600; letter-spacing: -0.5px; }
        .content p { font-size: 17px; color: ${mutedColor}; margin-bottom: 28px; }
        
        .btn-container { text-align: center; margin-top: 36px; margin-bottom: 36px; }
        
        .btn { 
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); 
            color: #ffffff !important; 
            padding: 20px 42px; 
            border-radius: 18px; 
            text-decoration: none; 
            font-weight: 600; 
            display: inline-block; 
            box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
            transition: transform 0.3s ease;
        }
        
        .footer { text-align: center; padding: 40px; font-size: 13px; color: #94a3b8; background-color: #fafafa; }
        .footer-line { border-top: 1px solid #f1f5f9; margin: 0 40px; }
        
        .badge { 
            display: inline-block; 
            padding: 8px 16px; 
            border-radius: 30px; 
            background: rgba(37, 99, 235, 0.08); 
            color: #2563eb; 
            font-size: 13px; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 1px;
            margin-bottom: 24px; 
        }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animated { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main animated" role="presentation">
            <tr>
                <td class="header">
                    <div style="background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); display: inline-block; padding: 14px 28px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                        <h1>${process.env.SENDER_NAME || 'DIMS Portal'}</h1>
                    </div>
                </td>
            </tr>
            <tr>
                <td class="content">
                    <span class="badge">${title}</span>
                    ${name ? `<h2>Hello ${name},</h2>` : ''}
                    <p style="margin-bottom: 32px;">${message}</p>
                    ${buttonUrl ? `
                    <div class="btn-container">
                        <a href="${buttonUrl}" class="btn">${buttonLabel}</a>
                    </div>
                    ` : ''}
                    ${secondaryText ? `<div style="padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; margin-top: 32px;">${secondaryText}</div>` : ''}
                </td>
            </tr>
            <tr>
                <td class="footer">
                    <p style="margin-bottom: 12px; font-weight: 600; color: #64748b;">Enterprise Internship Management</p>
                    <p>&copy; 2026 DIMS Portal | All Rights Reserved</p>
                    <p style="margin-top: 8px; font-style: italic;">Innovation in professional placement.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
  `;
};

/**
 * Handles the low-level SMTP dispatch for a specific recipient.
 */
const brevoSend = async (to, subject, html) => {
    const SENDER_NAME = process.env.SENDER_NAME;
    const SENDER_EMAIL = process.env.SENDER_EMAIL;
    if (!process.env.BREVO_API_KEY || !SENDER_NAME || !SENDER_EMAIL) return { success: false, error: 'SMTP config missing' };

    try {
        const transporter = getTransporter();
        await transporter.sendMail({ from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`, to, subject, html });
        return { success: true };
    } catch (error) {
        if (error.message.includes('535') && !process.env.SMTP_USER) {
            try {
                const retryT = nodemailer.createTransport({ host: 'smtp-relay.brevo.com', port: 587, secure: false, auth: { user: 'a4dd03001@smtp-brevo.com', pass: process.env.BREVO_API_KEY } });
                await retryT.sendMail({ from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`, to, subject, html });
                return { success: true };
            } catch (retryError) {
                await logError(retryError, null, `RETRY_MAIL_FAIL: ${to}`);
                return { success: false, error: retryError.message };
            }
        }
        await logError(error, null, `MAIL_SEND_FAIL: ${to}`);
        return { success: false, error: error.message };
    }
};

/**
 * Dispatches account verification links.
 */
export const sendVerificationEmail = async (email, token) => {
    const url = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    const message = 'Thank you for joining the DIMS portal. To unlock your full access and start your internship journey, please verify your email address.';
    return await brevoSend(email, 'Action Required: Verify Your DIMS Account', wrapTemplate('Account Verification', 'User', message, 'Verify My Account', url));
};

/**
 * Dispatches faculty nomination and activation links.
 */
export const sendFacultyNominationEmail = async (email, token, name) => {
    const url = `${process.env.FRONTEND_URL}/faculty/activate/${token}`;
    const message = 'You have been officially nominated as a Faculty Internship Supervisor. Your expertise is vital to our students\' success. Please set your password to activate your administration dashboard.';
    return await brevoSend(email, 'Official Nomination: Faculty Internship Supervisor', wrapTemplate('Faculty Nomination', name, message, 'Activate Supervisor Account', url));
};

/**
 * Confirms formal student internship placement.
 */
export const sendAssignmentConfirmationEmail = async (email, name, details) => {
    const message = `Great news! Your internship placement at <b>${details.companyName}</b> has been officially confirmed. The next chapter of your professional career begins now.`;
    return await brevoSend(email, 'Official Notification: Internship Assignment Confirmed', wrapTemplate('Placement Confirmed', name, message, 'View Placement Details', `${process.env.FRONTEND_URL}/dashboard`));
};

/**
 * Notifies faculty of new student assignments.
 */
export const sendFacultyAssignmentNotificationEmail = async (email, name, details) => {
    const message = `A new student, <b>${details.studentName}</b>, has been assigned to your supervision for their tenure at <b>${details.companyName}</b>. You can now monitor their progress through your dashboard.`;
    return await brevoSend(email, `Student Assigned: ${details.studentName}`, wrapTemplate('New Student Assigned', name, message, 'Go to Dashboard', `${process.env.FRONTEND_URL}/faculty`));
};

/**
 * Notifies industrial site supervisors of new student assignments.
 */
export const sendSupervisorAssignmentNotificationEmail = async (email, name, details) => {
    const message = `We represent to you <b>${details.studentName}</b>, who has been officially assigned to your supervision at <b>${details.companyName}</b>. We look forward to a productive collaboration.`;
    return await brevoSend(email, `Official Placement: ${details.studentName} at ${details.companyName}`, wrapTemplate('Official Placement', name, message, 'Manage Placement', `${process.env.FRONTEND_URL}/supervisor`));
};

/**
 * Dispatches temporary administrator passwords.
 */
export const sendFacultyPasswordResetEmail = async (email, pw, name) => {
    const message = `Your account password has been reset by the administration. Please use the temporary credentials provided below to log in and immediately update your password.`;
    return await brevoSend(email, 'Administrative Action: Password Reset for DIMS', wrapTemplate('Administrative Reset', name, message, 'Log In Now', `${process.env.FRONTEND_URL}/login`, `Temporary Password: <b>${pw}</b>`));
};

/**
 * Dispatches password reset security codes.
 */
export const sendPasswordResetCode = async (email, code) => {
    const message = 'We received a request to reset your DIMS portal password. Use the security code below to proceed. If you did not request this, please secure your account immediately.';
    return await brevoSend(email, 'Your Verification Code - DIMS Security', wrapTemplate('Security Verification', '', message, null, null, `<div style="font-size: 42px; font-weight: 600; color: #2563eb; letter-spacing: 4px; margin: 30px 0;">${code}</div>`));
};

/**
 * Dispatches verification codes for linking secondary emails.
 */
export const sendSecondaryEmailVerificationCode = async (email, code) => {
    const message = 'You are attempting to link a secondary email to your DIMS profile. Please enter the verification code below to confirm this action.';
    return await brevoSend(email, 'Verify Your Secondary Email - DIMS', wrapTemplate('Email Linking', '', message, null, null, `<div style="font-size: 42px; font-weight: 600; color: #2563eb; letter-spacing: 4px; margin: 30px 0;">${code}</div>`));
};

/**
 * Confirms successful secondary email linking.
 */
export const sendSecondaryEmailLinkedConfirmation = async (email, primary) => {
    const message = `Success! Your email <b>${email}</b> has been successfully linked to your primary account <b>${primary}</b>. You can now use either email for portal notifications.`;
    return await brevoSend(email, 'Success: Secondary Email Linked to DIMS', wrapTemplate('Linking Successful', 'User', message, 'Go to Profile', `${process.env.FRONTEND_URL}/profile`));
};

/**
 * Dispatches generic student account activation links.
 */
export const sendStudentActivationEmail = async (email, token, name) => {
    const message = 'Welcome to the official Internship Management System! We are thrilled to help you land your dream placement. Click the button below to activate your account and start applying.';
    return await brevoSend(email, 'Portal Access: Student Internship Management System', wrapTemplate('Welcome to DIMS', name, message, 'Activate My Account', `${process.env.FRONTEND_URL}/verify-email/${token}`));
};

/**
 * Onboards industrial site supervisors with system activation.
 */
export const sendCompanySupervisorActivationEmail = async (email, token, name, company) => {
    const message = `Welcome to the DIMS network. You have been registered as the Official Site Supervisor for <b>${company}</b>. Please activate your account to begin managing student placements.`;
    return await brevoSend(email, `Official Onboarding: Site Supervisor for ${company}`, wrapTemplate('Site Onboarding', name, message, 'Activate Supervisor Account', `${process.env.FRONTEND_URL}/supervisor/activate/${token}`));
};

/**
 * Dispatches bulk announcements to the entire student/faculty registry.
 */
export const sendBulkEmailService = async (recipients, subject, content) => {
    const SENDER_NAME = process.env.SENDER_NAME;
    const SENDER_EMAIL = process.env.SENDER_EMAIL;
    try {
        const html = wrapTemplate('Official Announcement', '', content, 'Visit Portal', process.env.FRONTEND_URL);
        const transporter = getTransporter();
        await transporter.sendMail({ from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`, to: SENDER_EMAIL, bcc: recipients, subject, html });
        return { success: true };
    } catch (error) {
        await logError(error, null, 'BULK_MAIL_FAIL');
        return { success: false, error: error.message };
    }
};
