import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendVerificationEmail, sendPasswordResetCode } from '../emailServices/emailService.js';
import { protect } from '../middleware/auth.js';
import { cloudinary } from '../utils/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and account management
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retrieve currently authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate('assignedFaculty', 'name email whatsappNumber');
    const isDefaultPassword = await bcrypt.compare('Megamix@123', user.password);
    res.json({
        user: {
            id: user._id, name: user.name, email: user.email, secondaryEmail: user.secondaryEmail || null, role: user.role, reg: user.reg,
            semester: user.semester, cgpa: user.cgpa, status: user.status, whatsappNumber: user.whatsappNumber, internshipRequest: user.internshipRequest,
            internshipAgreement: user.internshipAgreement, mustChangePassword: user.mustChangePassword, fatherName: user.fatherName, section: user.section,
            dateOfBirth: user.dateOfBirth, profilePicture: user.profilePicture, registeredCourse: user.registeredCourse, assignedFaculty: user.assignedFaculty,
            assignedCompany: user.assignedCompany, assignedCompanySupervisor: user.assignedCompanySupervisor, isDefaultPassword
        }
    });
}));

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password for active session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.post('/change-password', protect, asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    const user = await User.findById(req.user.id);
    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();
    res.json({ message: 'Password updated successfully.' });
}));

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Student self-registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: Registration success
 *       400:
 *         description: Validation error
 */
router.post('/register', asyncHandler(async (req, res) => {
    const { name, reg, semester, cgpa, email, password, role } = req.body;
    if (role !== 'student') return res.status(403).json({ message: 'Public registration only allowed for students.' });
    
    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith('@cuiatd.edu.pk')) return res.status(400).json({ message: 'Only @cuiatd.edu.pk emails allowed.' });

    const existingUser = await User.findOne({ $or: [{ email: emailLower }, { secondaryEmail: emailLower }] });
    if (existingUser) return res.status(400).json({ message: 'This email is already registered.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    const user = new User({
        name, reg, semester, cgpa, email: emailLower, password: hashedPassword, role: 'student', status: 'unverified',
        whatsappNumber: req.body.whatsappNumber || '', emailVerificationToken: verificationToken, emailVerificationExpires: tokenExpiry
    });

    await user.save();
    
    try {
        await sendVerificationEmail(emailLower, verificationToken);
    } catch (err) {
        // Verification email send failure
    }

    res.status(201).json({ message: 'Registration successful! Please check your email.' });
}));

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   post:
 *     summary: Confirm account verification via token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email verified
 */
router.post('/verify-email/:token', asyncHandler(async (req, res) => {
    const token = req.params.token.trim();
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) return res.status(400).json({ message: 'Verification link invalid.' });
    if (user.status === 'verified') return res.json({ message: 'Email already verified!' });

    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires).getTime() < Date.now()) {
        return res.status(400).json({ message: 'Verification link expired.' });
    }

    user.status = 'verified';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully!' });
}));

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Initiate password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               sendTo: { type: string, enum: [primary, secondary] }
 *     responses:
 *       200:
 *         description: OTP Sent
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
    const { email, sendTo } = req.body;
    const emailLower = email.toLowerCase().trim();

    const user = await User.findOne({ $or: [{ email: emailLower }, { secondaryEmail: emailLower }] });
    if (!user) return res.json({ message: 'If an account exists, a code has been sent.' });

    if (!user.secondaryEmail) {
        return res.status(403).json({ requiresSecondaryEmail: true, message: 'Link a secondary email first.' });
    }

    if (!sendTo) {
        return res.json({ status: 'choose_email', primaryEmail: user.email, secondaryEmail: user.secondaryEmail });
    }

    const targetEmail = sendTo === 'secondary' ? user.secondaryEmail : user.email;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.updateOne({ _id: user._id }, { $set: { resetPasswordCode: code, resetPasswordExpires: expiry } });
    const mailResult = await sendPasswordResetCode(targetEmail, code);

    if (!mailResult.success) return res.status(500).json({ message: 'Email system error.' });

    res.json({ status: 'code_sent', sentTo: targetEmail, message: `Code sent to ${targetEmail}.` });
}));

/**
 * @swagger
 * /auth/verify-reset-code:
 *   post:
 *     summary: Verify password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string }
 *               code: { type: string }
 *     responses:
 *       200:
 *         description: Code verified
 */
router.post('/verify-reset-code', asyncHandler(async (req, res) => {
    const { email, code } = req.body;
    const user = await User.findOne({
        $or: [{ email: email.toLowerCase().trim() }, { secondaryEmail: email.toLowerCase().trim() }],
        resetPasswordCode: code.toString().trim(),
        resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired code.' });
    res.json({ success: true, message: 'Code verified.' });
}));

/**
 * @swagger
 * /auth/reset-password-final:
 *   post:
 *     summary: Finalize password reset with new password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email: { type: string }
 *               code: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/reset-password-final', asyncHandler(async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'Missing fields.' });

    const user = await User.findOne({
        $or: [{ email: email.toLowerCase().trim() }, { secondaryEmail: email.toLowerCase().trim() }],
        resetPasswordCode: code.toString().trim(),
        resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ message: 'Session expired or code invalid.' });

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful!' });
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and receive JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    const emailLower = email.toLowerCase().trim();

    const user = await User.findOne({ $or: [{ email: emailLower }, { secondaryEmail: emailLower }] }).populate('assignedFaculty', 'name email whatsappNumber');
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    if (role && user.role !== role) return res.status(403).json({ message: 'Unauthorized role.' });
    if (user.role === 'student' && user.status === 'unverified') return res.status(401).json({ message: 'Verify email first.' });

    if (user.secondaryEmail === emailLower && user.email !== emailLower) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.secondaryEmailVerificationCode = code;
        user.secondaryEmailVerificationExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();
        const mailResult = await sendPasswordResetCode(emailLower, code);
        if (!mailResult.success) return res.status(500).json({ message: 'Email failed.' });
        return res.json({ status: 'otp_required', message: 'Verification code sent to secondary email.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    res.json({
        user: {
            id: user._id, name: user.name, email: user.email, secondaryEmail: user.secondaryEmail || null, role: user.role, reg: user.reg,
            semester: user.semester, cgpa: user.cgpa, status: user.status, whatsappNumber: user.whatsappNumber, internshipRequest: user.internshipRequest,
            internshipAgreement: user.internshipAgreement, mustChangePassword: user.mustChangePassword, fatherName: user.fatherName, section: user.section,
            dateOfBirth: user.dateOfBirth, profilePicture: user.profilePicture, registeredCourse: user.registeredCourse, assignedFaculty: user.assignedFaculty,
            assignedCompany: user.assignedCompany, assignedCompanySupervisor: user.assignedCompanySupervisor, isDefaultPassword: password === 'Megamix@123'
        },
        token
    });
}));

/**
 * @swagger
 * /auth/verify-secondary:
 *   post:
 *     summary: Verify secondary email OTP for login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string }
 *               code: { type: string }
 *     responses:
 *       200:
 *         description: OTP verified, login successful
 */
router.post('/verify-secondary', asyncHandler(async (req, res) => {
    const { email, code } = req.body;
    const user = await User.findOne({
        secondaryEmail: email.toLowerCase().trim(),
        secondaryEmailVerificationCode: code,
        secondaryEmailVerificationExpires: { $gt: new Date() }
    }).populate('assignedFaculty', 'name email whatsappNumber');

    if (!user) return res.status(400).json({ message: 'Invalid or expired code.' });

    user.secondaryEmailVerificationCode = undefined;
    user.secondaryEmailVerificationExpires = undefined;
    user.lastLogin = Date.now();
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });

    res.json({
        user: {
            id: user._id, name: user.name, email: user.email, secondaryEmail: user.secondaryEmail, role: user.role, reg: user.reg, status: user.status,
            whatsappNumber: user.whatsappNumber, fatherName: user.fatherName, section: user.section, dateOfBirth: user.dateOfBirth,
            profilePicture: user.profilePicture, assignedFaculty: user.assignedFaculty, assignedCompany: user.assignedCompany, assignedCompanySupervisor: user.assignedCompanySupervisor
        },
        token
    });
}));

/**
 * @swagger
 * /auth/faculty-list:
 *   get:
 *     summary: Retrieve list of active faculty supervisors
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: List of faculty supervisors with current load
 */
router.get('/faculty-list', asyncHandler(async (req, res) => {
    const facultyList = await User.find({ role: 'faculty_supervisor', status: { $ne: 'Pending Activation' } }, 'name email status whatsappNumber');
    const counts = await User.aggregate([{ $match: { role: 'student', assignedFaculty: { $exists: true, $ne: null } } }, { $group: { _id: '$assignedFaculty', count: { $sum: 1 } } }]);
    const countMap = counts.reduce((acc, curr) => { acc[curr._id.toString()] = curr.count; return acc; }, {});

    res.json(facultyList.map(f => ({ ...f.toObject(), assignedStudents: countMap[f._id.toString()] || 0 })));
}));

/**
 * @swagger
 * /auth/faculty-activate-check/{token}:
 *   get:
 *     summary: Check faculty activation token validity
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Token valid, returns faculty name/email
 */
router.get('/faculty-activate-check/:token', asyncHandler(async (req, res) => {
    const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ activationToken: hash, activationExpires: { $gt: Date.now() }, status: 'Pending Activation' });
    if (!user) return res.status(400).json({ message: 'Invalid activation link.' });
    res.json({ name: user.name, email: user.email });
}));

/**
 * @swagger
 * /auth/faculty-set-password:
 *   post:
 *     summary: Set password and activate faculty account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Account activated
 */
router.post('/faculty-set-password', asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ activationToken: hash, activationExpires: { $gt: Date.now() }, status: 'Pending Activation' });

    if (!user) return res.status(400).json({ message: 'Invalid activation link.' });
    user.password = await bcrypt.hash(password, 12);
    user.status = 'Active';
    user.activationToken = undefined;
    user.activationExpires = undefined;
    await user.save();
    res.json({ message: 'Account activated!' });
}));

/**
 * @swagger
 * /auth/supervisor-activate-check/{token}:
 *   get:
 *     summary: Check site supervisor activation token validity
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Token valid
 */
router.get('/supervisor-activate-check/:token', asyncHandler(async (req, res) => {
    const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ activationToken: hash, activationExpires: { $gt: Date.now() }, status: 'Pending Activation', role: 'site_supervisor' });
    if (!user) return res.status(400).json({ message: 'Invalid activation link.' });
    res.json({ name: user.name, email: user.email });
}));

/**
 * @swagger
 * /auth/supervisor-set-password:
 *   post:
 *     summary: Set password and activate site supervisor account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Supervisor account activated
 */
router.post('/supervisor-set-password', asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ activationToken: hash, activationExpires: { $gt: Date.now() }, status: 'Pending Activation', role: 'site_supervisor' });

    if (!user) return res.status(400).json({ message: 'Invalid activation link.' });
    user.password = await bcrypt.hash(password, 12);
    user.status = 'Active';
    user.activationToken = undefined;
    user.activationExpires = undefined;
    await user.save();
    res.json({ message: 'Supervisor account activated!' });
}));

/**
 * @swagger
 * /auth/download-proxy:
 *   get:
 *     summary: Proxy endpoint for secure file downloads
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File stream
 */
router.get('/download-proxy', protect, asyncHandler(async (req, res) => {
    const { url, filename } = req.query;
    if (!url) {
        console.error('Download Proxy Error: Missing URL');
        return res.status(400).json({ message: 'URL required' });
    }

    let target = url;
    let response;
    
    try {
        response = await fetch(target);
    } catch (fetchErr) {
        console.error('Download Proxy Fetch Failure:', fetchErr.message);
        return res.redirect(target);
    }

    if (!response.ok && target.includes('cloudinary.com')) {
        const parts = target.split('/');
        const uploadIdx = parts.indexOf('upload');
        if (uploadIdx > -1) {
            const resType = parts[uploadIdx - 1];
            let pubIdExt = parts.slice(uploadIdx + 1).join('/');
            if (pubIdExt.startsWith('v')) pubIdExt = pubIdExt.split('/').slice(1).join('/');
            const pubId = pubIdExt.substring(0, pubIdExt.lastIndexOf('.')) || pubIdExt;

            try {
                const resource = await cloudinary.api.resource(pubId, { resource_type: resType });
                if (resource?.secure_url) {
                    target = resource.secure_url;
                    response = await fetch(target);
                }
            } catch (e) {
                if (resType === 'image' && target.toLowerCase().endsWith('.pdf')) {
                    const rawT = target.replace('/image/upload/', '/raw/upload/');
                    const rawResp = await fetch(rawT);
                    if (rawResp.ok) { response = rawResp; target = rawT; }
                }
            }
        }
    }

    if (!response || !response.ok) {
        console.warn('Download Proxy Falling back to redirect', target);
        return res.redirect(target);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    let cleanFilename = (filename || 'Document').replace(/[^\x00-\x7F]/g, "").replace(/["\s]/g, "_");
    if (!cleanFilename.toLowerCase().endsWith('.pdf') && contentType.includes('pdf')) {
        cleanFilename += '.pdf';
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.send(Buffer.from(await response.arrayBuffer()));
}));

/**
 * @swagger
 * /auth/update-profile:
 *   put:
 *     summary: Update generic profile fields (name, phone, password)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               whatsappNumber: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/update-profile', protect, asyncHandler(async (req, res) => {
    const { name, whatsappNumber, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (whatsappNumber) user.whatsappNumber = whatsappNumber;
    if (password) {
        user.password = await bcrypt.hash(password, 12);
        user.mustChangePassword = false;
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', user: { id: user._id, name: user.name, email: user.email, role: user.role, whatsappNumber: user.whatsappNumber } });
}));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Clear authentication cookie and log out
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
    res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
