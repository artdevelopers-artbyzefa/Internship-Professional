import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import nodemailer from 'nodemailer';

/**
 * Central transporter logic using institutional SMTP relay
 */
const getTransporter = () => {
    // Priority: 1. SMTP_USER env var, 2. Known working default, 3. SENDER_EMAIL fallback
    let smtpUser = process.env.SMTP_USER;
    
    if (!smtpUser) {
        // Fallback to the working credential found in local config to rescue the live site
        smtpUser = 'a4dd03001@smtp-brevo.com';
        console.warn(`[EMAIL] SMTP_USER missing. Using fallback: ${smtpUser}`);
    }

    if (!process.env.BREVO_API_KEY) {
        console.error('[EMAIL ERROR] BREVO_API_KEY is missing in environment variables!');
    }
    
    return nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
            user: smtpUser,
            pass: process.env.BREVO_API_KEY
        }
    });
};

const brevoSend = async (to, subject, html) => {
  const SENDER_NAME = process.env.SENDER_NAME;
  const SENDER_EMAIL = process.env.SENDER_EMAIL;

  if (!process.env.BREVO_API_KEY || !SENDER_NAME || !SENDER_EMAIL) {
    console.error(`[EMAIL ERROR] SMTP configuration missing!`);
    return { success: false, error: 'SMTP config missing' };
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to,
        subject,
        html
    });

    console.log(`[EMAIL SUCCESS] Sent to: ${to} (MessageId: ${info.messageId})`);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL ERROR] SMTP failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a professional verification email to students
 */
export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Digital Internship Management System</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">COMSATS University Islamabad, Abbottabad Campus</p>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">Verify your email address</h2>
        <p style="color: #374151; font-size: 15px; line-height: 24px;">
          Hello,<br/><br/>
          Thank you for registering on the DIMS Portal. To activate your student account, please confirm your email address by clicking the button below. 
          <br/><br/>
          <strong>Note:</strong> This link will expire in <strong>24 hours</strong>.
        </p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px; line-height: 20px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
        <p>This is an automated system message. Please do not reply to this email.</p>
        <p>&copy; 2026 CUI Abbottabad - Department of Computer Science</p>
      </div>
    </div>
  `;
  return await brevoSend(email, 'Action Required: Verify Your DIMS Account', html);
};

/**
 * Sends a nomination email to Faculty Supervisors
 */
export const sendFacultyNominationEmail = async (email, token, name) => {
  const activationUrl = `${process.env.FRONTEND_URL}/faculty/activate/${token}`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f0fdf4; padding: 40px; border-radius: 16px; border: 1px solid #dcfce7;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #166534; margin: 0; font-size: 24px;">Internship Management System</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">COMSATS University Islamabad, Abbottabad Campus</p>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">Formal Nomination</h2>
        <p style="color: #374151; font-size: 15px; line-height: 24px;">
          Dear <strong>${name}</strong>,<br/><br/>
          The Internship Office has officially nominated you as a <strong>Faculty Internship Supervisor</strong> for the upcoming semester. 
          <br/><br/>
          To accept this nomination and access the supervision portal, please set up your secure account password using the link below.
          <br/><br/>
          <strong style="color: #991b1b;">Security Notice:</strong> This activation link is valid for <strong>24 hours</strong> and can be used only once.
        </p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${activationUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Set Password & Activate
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px; line-height: 20px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${activationUrl}" style="color: #16a34a; word-break: break-all;">${activationUrl}</a>
        </p>
      </div>
    </div>
  `;
  return await brevoSend(email, 'Official Nomination: Faculty Internship Supervisor', html);
};

/**
 * Sends a professional assignment confirmation email to the student
 */
export const sendAssignmentConfirmationEmail = async (studentEmail, studentName, assignmentDetails) => {
  const { companyName, siteSupervisor, facultySupervisor } = assignmentDetails;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Internship Management System</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">CUI Abbottabad Campus</p>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 16px;">Internship Assignment Details</h2>
        <p style="color: #334155; font-size: 15px; line-height: 24px;">
          Dear <strong>${studentName}</strong>,<br/><br/>
          Your internship placement has been officially confirmed. Below are the details.
        </p>
        <div style="margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <h3 style="color: #1e40af; font-size: 14px; text-transform: uppercase;">Placement Information</h3>
          <p><strong>Company:</strong> ${companyName}</p>
          <p><strong>Site Supervisor:</strong> ${siteSupervisor.name}</p>
          <p><strong>Faculty Supervisor:</strong> ${facultySupervisor.name}</p>
        </div>
      </div>
    </div>
  `;
  return await brevoSend(studentEmail, 'Official Notification: Internship Assignment Confirmed', html);
};

/**
 * Sends a temporary password to the faculty supervisor
 */
export const sendFacultyPasswordResetEmail = async (email, tempPassword, name) => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background-color: #f8fafc;">
      <h2>Password Reset Notice</h2>
      <p>Dear ${name}, your DIMS account password has been reset.</p>
      <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; text-align: center; border: 1px dashed #cbd5e1;">
        <p>Your temporary password is:</p>
        <p style="font-size: 24px; font-weight: bold; color: #1e40af;">${tempPassword}</p>
      </div>
      <p style="font-size: 12px; color: #64748b;">Please change this immediately after logging in.</p>
    </div>
  `;
  return await brevoSend(email, 'Administrative Action: Password Reset for DIMS', html);
};

/**
 * Sends a 6-digit verification code for password reset or secondary login
 */
export const sendPasswordResetCode = async (email, code) => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center;">
      <h2 style="color: #1e3a8a;">Verification Code</h2>
      <p style="color: #334155;">To continue, use the 6-digit verification code below. This code is valid for <strong>10 minutes</strong>.</p>
      <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 30px 0;">
        <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; color: #1e40af; letter-spacing: 8px;">${code}</span>
      </div>
      <p style="color: #94a3b8; font-size: 11px;">If you did not request this, please ignore this email.</p>
    </div>
  `;
  return await brevoSend(email, 'Your Verification Code - DIMS Security', html);
};

/**
 * Sends activation link to manually onboarded student
 */
export const sendStudentActivationEmail = async (email, token, name) => {
  const activationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #1e3a8a; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 24px;">Welcome to DIMS Portal</h1>
      </div>
      <div style="padding: 40px; background-color: #ffffff; text-align: center;">
        <h2>Hello, ${name}!</h2>
        <p>Your student account has been pre-registered. Activate it by clicking below:</p>
        <p style="color: #6b7280; font-size: 12px;"><strong>Note:</strong> This link is valid for <strong>24 hours</strong>.</p>
        <a href="${activationLink}" style="background-color: #1e3a8a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 20px 0;">Activate Account</a>
      </div>
    </div>
  `;
  return await brevoSend(email, 'Portal Access: Student Internship Management System', html);
};
/**
 * Sends a formal activation email to Site Supervisors (MOU Companies)
 */
export const sendCompanySupervisorActivationEmail = async (email, token, name, companyName) => {
  const activationUrl = `${process.env.FRONTEND_URL}/supervisor/activate/${token}`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f0f9ff; padding: 40px; border-radius: 20px; border: 1px solid #e0f2fe;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0369a1; margin: 0; font-size: 26px; font-weight: 800;">Digital Internship Portal</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 5px; font-weight: 600;">COMSATS University Islamabad, Abbottabad Campus</p>
      </div>
      <div style="background-color: #ffffff; padding: 35px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 20px; font-weight: 700;">Partner Onboarding: Site Supervisor</h2>
        <p style="color: #334155; font-size: 15px; line-height: 26px;">
          Dear <strong>${name}</strong>,<br/><br/>
          Welcome to the official internship network of COMSATS University. Your organization, <strong>${companyName}</strong>, has been registered as an institutional partner.
          <br/><br/>
          You have been nominated as a <strong>Site Supervisor</strong>. Please complete your registration and secure your account by setting a password using the link below.
          <br/><br/>
          <strong style="color: #0284c7;">Security Note:</strong> This link is personal to your email and is valid for <strong>24 hours</strong>.
        </p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${activationUrl}" style="background-color: #0284c7; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; display: inline-block; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);">
            Activate Supervisor Account
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 20px; text-align: center;">
          If the button above does not work, please copy and paste this link into your browser:<br/>
          <a href="${activationUrl}" style="color: #0284c7; word-break: break-all;">${activationUrl}</a>
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 11px; font-weight: 500;">
        <p>This is a system-generated communication for official university partners.</p>
        <p>&copy; 2026 CUI Abbottabad - Internship Management Office</p>
      </div>
    </div>
  `;
  return await brevoSend(email, `Official Onboarding: Site Supervisor for ${companyName}`, html);
};
/**
 * Sends a custom bulk email to multiple recipients
 * Uses bcc for privacy if sending the same message to everyone
 */
export const sendBulkEmailService = async (recipients, subject, content) => {
  const SENDER_NAME = process.env.SENDER_NAME;
  const SENDER_EMAIL = process.env.SENDER_EMAIL;

  if (!process.env.BREVO_API_KEY) return { success: false, error: 'SMTP config missing' };

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #1e3a8a; padding: 30px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">DIMS Official Communication</h2>
        <p style="color: #bfdbfe; font-size: 12px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Internship Office - CUI Abbottabad</p>
      </div>
      <div style="padding: 40px; color: #334155; line-height: 1.6; font-size: 15px;">
        ${content.replace(/\n/g, '<br/>')}
      </div>
      <div style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          This is an official institutional announcement sent via the Digital Internship Management System.
        </p>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 5px;">
          &copy; 2026 COMSATS University Islamabad, Abbottabad Campus
        </p>
      </div>
    </div>
  `;

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to: SENDER_EMAIL, // Primary recipient is the sender
        bcc: recipients,
        subject,
        html
    });

    console.log(`[BULK SUCCESS] Sent to ${recipients.length} recipients. MessageId: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('[BULK EMAIL ERROR]', error);
    return { success: false, error: error.message };
  }
};
