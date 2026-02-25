import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Transporter Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Sends a professional verification email to students
 * @param {string} email - Student's @cuiatd.edu.pk email
 * @param {string} token - Verification token
 */
export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const mailOptions = {
    from: `"CUI Abbottabad DIMS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Action Required: Verify Your DIMS Account',
    html: `
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
            <strong>Note:</strong> This link will expire in <strong>10 minutes</strong>.
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
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Nodemailer Error:', error);
    return { success: false, error };
  }
};

/**
 * Sends a nomination email to Faculty Supervisors
 */
export const sendFacultyNominationEmail = async (email, token, name) => {
  const activationUrl = `${process.env.FRONTEND_URL}/faculty/activate/${token}`;

  const mailOptions = {
    from: `"Internship Office" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Official Nomination: Faculty Internship Supervisor',
    html: `
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
            <strong style="color: #991b1b;">Security Notice:</strong> This activation link is valid for <strong>30 minutes</strong> only and can be used only once.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${activationUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Set Password & Activate
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; line-height: 20px;">
            If you did not expect this nomination, please contact the Internship office immediately.
            <br/><br/>
            Link: <a href="${activationUrl}" style="color: #16a34a; word-break: break-all;">${activationUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 11px;">
          <p>This is an official communication from the Internship Office.</p>
          <p>&copy; 2026 CUI Abbottabad - Department of Computer Science</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Nomination email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Nodemailer Error:', error);
    return { success: false, error };
  }
};

/**
 * Sends a professional assignment confirmation email to the student
 */
export const sendAssignmentConfirmationEmail = async (studentEmail, studentName, assignmentDetails) => {
  const { companyName, siteSupervisor, facultySupervisor } = assignmentDetails;

  const mailOptions = {
    from: `"Internship Office" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: 'Official Notification: Internship Assignment Confirmed',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Internship Management System</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">COMSATS University Islamabad, Abbottabad Campus</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 16px;">Internship Assignment Details</h2>
          <p style="color: #334155; font-size: 15px; line-height: 24px;">
            Dear <strong>${studentName}</strong>,
            <br/><br/>
            Your internship placement has been officially confirmed. Below are the details of your assignment and designated supervisors.
          </p>

          <div style="margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            <h3 style="color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">01. Placement Information</h3>
            <table style="width: 100%; font-size: 14px; color: #475569;">
              <tr><td style="padding: 4px 0; font-weight: 600; width: 40%;">Company Name:</td><td>${companyName}</td></tr>
            </table>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">02. Designated Supervisors</h3>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1e3a8a;">Site Supervisor (Industry)</p>
              <p style="margin: 5px 0 0; font-size: 14px;"><strong>${siteSupervisor.name}</strong></p>
              <p style="margin: 2px 0 0; font-size: 13px;">WhatsApp: ${siteSupervisor.whatsappNumber}</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1e3a8a;">Faculty Supervisor (Academic)</p>
              <p style="margin: 5px 0 0; font-size: 14px;"><strong>${facultySupervisor.name}</strong></p>
              <p style="margin: 2px 0 0; font-size: 13px;">WhatsApp: ${facultySupervisor.whatsappNumber}</p>
            </div>
          </div>

          <p style="color: #64748b; font-size: 13px; margin-top: 25px; line-height: 20px; font-style: italic;">
            Please coordinate with your supervisors immediately to begin your internship activities.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 11px;">
          <p>This is an officially generated assignment notification.</p>
          <p>&copy; 2026 CUI Abbottabad - Department of Computer Science</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Assignment notification sent to: ${studentEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Nodemailer Error:', error);
    return { success: false, error };
  }
};

/**
 * Sends a temporary password to the faculty supervisor
 */
export const sendFacultyPasswordResetEmail = async (email, tempPassword, name) => {
  const mailOptions = {
    from: `"Supervisor Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Administrative Action: Password Reset for DIMS',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Internship Management System</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">COMSATS University Islamabad</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 16px;">Password Reset Notice</h2>
          <p style="color: #334155; font-size: 15px; line-height: 24px;">
            Dear <strong>${name}</strong>,
            <br/><br/>
            An administrator has reset your account password. Please use the temporary credentials below to access the portal.
          </p>

          <div style="margin-top: 25px; background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700;">Temporary Password</p>
            <p style="margin: 10px 0 0; font-family: monospace; font-size: 20px; font-weight: bold; color: #1e40af; letter-spacing: 2px;">${tempPassword}</p>
          </div>

          <p style="color: #64748b; font-size: 13px; margin-top: 25px; line-height: 20px; font-style: italic;">
            <strong>Note:</strong> You will be required to change this password immediately upon your next login for security reasons.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Nodemailer Error:', error);
    return { success: false, error };
  }
};
