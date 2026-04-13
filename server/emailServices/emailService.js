import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logError } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = (process.env.BREVO_API_KEY || '').trim();
const senderEmail = (process.env.SENDER_EMAIL || '').trim();
const senderName = process.env.SENDER_NAME || 'DIMS Portal';

console.log(`[EMAIL_SERVICE] Configured for sender: ${senderEmail}`);
if (!apiKey) console.warn('[EMAIL_SERVICE] CRITICAL: BREVO_API_KEY is missing from .env!');

const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });

/**
 * Core raw HTTPS sender - Matches the user's "instant" script exactly.
 */
const rawSend = async (to, subject, text, html = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const bodyData = {
        sender: { name: senderName, email: senderEmail },
        to: Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }],
        subject: subject.includes('[') ? subject : `${subject} [${timestamp}]`
    };

    // Institutional speed optimization: prioritize textContent
    if (text) bodyData.textContent = text;
    if (html) bodyData.htmlContent = html;

    const body = JSON.stringify(bodyData);

    const options = {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        agent,
        headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    return new Promise((resolve) => {
        const start = Date.now();
        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                const status = res.statusCode;
                if (status >= 200 && status < 300) {
                    console.log(`[BREVO] Success (${duration}ms) -> ${to}`);
                    resolve({ success: true, status });
                } else {
                    console.error(`[BREVO] HTTP ${status} (${duration}ms):`, resData);
                    resolve({ success: false, status, error: resData });
                }
            });
        });

        req.on('error', (err) => {
            console.error('[BREVO] Request Error:', err.message);
            resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, error: 'Connection Timeout' });
        });

        req.setTimeout(15000);
        req.write(body);
        req.end();
    });
};

/**
 * Universal Text Email Sender Wrapper
 */
const sendMail = async (to, subject, text) => {
    try {
        const result = await rawSend(to, subject, text);
        if (!result.success) {
            await logError(new Error(`Brevo Fail: ${result.error}`), null, `MAIL_SEND_FAIL: ${to}`);
        }
        return result;
    } catch (error) {
        await logError(error, null, `MAIL_SYSTEM_ERROR: ${to}`);
        return { success: false, error: error.message };
    }
};

/**
 * EMAIL SERVICE FUNCTIONS (100% Plain Text for Instant Delivery)
 */

export const sendVerificationEmail = async (email, password = 'Megamix@123') => {
    const text = `DIMS Portal: Account Verified\n--\nYour account has been successfully registered and verified.\n\nLogin Email: ${email}\nDefault Password: ${password}\n\nLogin here: ${process.env.FRONTEND_URL}/login\n\nPlease change your password after logging in for security.\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'Your DIMS Account Credentials', text);
};

export const sendFacultyNominationEmail = async (email, token, name) => {
    const url = `${process.env.FRONTEND_URL}/faculty/activate/${token}`;
    const text = `Dear ${name},\n\nYou have been nominated as a Faculty Supervisor. Activate here: ${url}\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'Faculty Nomination: DIMS Portal', text);
};

export const sendAssignmentConfirmationEmail = async (email, name, details) => {
    const text = `Dear ${name},\n\nYour placement at ${details.companyName} is confirmed.\n\nDashboard: ${process.env.FRONTEND_URL}/dashboard\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'Internship Assignment Confirmed', text);
};

export const sendFacultyAssignmentNotificationEmail = async (email, name, details) => {
    const text = `Dear ${name},\n\nNew student ${details.studentName} is assigned to you.\n\nDashboard: ${process.env.FRONTEND_URL}/faculty\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, `New Student Assigned: ${details.studentName}`, text);
};

export const sendSupervisorAssignmentNotificationEmail = async (email, name, details) => {
    const text = `Dear ${name},\n\n${details.studentName} is assigned to your supervision at ${details.companyName}.\n\nManage: ${process.env.FRONTEND_URL}/supervisor\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, `Official Placement: ${details.studentName}`, text);
};

export const sendFacultyPasswordResetEmail = async (email, pw, name) => {
    const text = `Dear ${name},\n\nYour password has been reset.\n\nEmail: ${email}\nTemporary Password: ${pw}\n\nLog in: ${process.env.FRONTEND_URL}/login\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'DIMS: Password Reset', text);
};

export const sendPasswordResetCode = async (email, code) => {
    const text = `DIMS: Password reset code is ${code}.\nValid for 10 minutes.\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'DIMS: Security Verification', text);
};

export const sendSecondaryEmailVerificationCode = async (email, code) => {
    const text = `DIMS: Verification code is ${code} to link your secondary email.\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'DIMS: Email Linking', text);
};

export const sendSecondaryEmailLinkedConfirmation = async (email, primary) => {
    const text = `Success! ${email} is linked to ${primary}.\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'DIMS: Email Linked', text);
};

export const sendStudentActivationEmail = async (email, name, tempPw = 'Megamix@123') => {
    const text = `Dear ${name},\n\nWelcome to DIMS Portal! Your account has been professionally activated.\n\nLogin Email: ${email}\nTemporary Password: ${tempPw}\n\nLogin here: ${process.env.FRONTEND_URL}/login\n\nPlease change your password after logging in.\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'Your DIMS Account is Ready', text);
};

export const sendCompanySupervisorActivationEmail = async (email, token, name, company) => {
    const text = `Dear ${name},\n\nYou are site supervisor for ${company}. Activate here: ${process.env.FRONTEND_URL}/supervisor/activate/${token}\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
    return await sendMail(email, 'DIMS: Supervisor Activation', text);
};

export const sendBulkEmailService = async (recipients, subject, content) => {
    try {
        const text = `DIMS Portal: Official Announcement\n---------------------------------\n${content}\n\nVisit: ${process.env.FRONTEND_URL}\n\nWith Regards,\nSystem Administrator\nDigital Internship Management System (DIMS)\nCOMSATS University Islamabad, Abbottabad Campus\nFor Query : csinternshipoffice@cuiatd.edu.pk`;
        
        // Multi-recipient optimization for bulk
        const bodyData = {
            sender: { name: senderName, email: senderEmail },
            bcc: recipients.map(email => ({ email })),
            to: [{ email: senderEmail }], // Send to self, BCC everyone else
            subject,
            textContent: text
        };

        const body = JSON.stringify(bodyData);
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let resData = '';
                res.on('data', chunk => resData += chunk);
                res.on('end', () => resolve({ success: res.statusCode < 300 }));
            });
            req.on('error', () => resolve({ success: false }));
            req.write(body);
            req.end();
        });
    } catch (error) {
        return { success: false };
    }
};


