import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendVerificationEmail, sendPasswordResetCode } from '../emailServices/emailService.js';
import { getPKTTime } from '../utils/time.js';
import { protect } from '../middleware/auth.js';
import { cloudinary } from '../utils/cloudinary.js';

const isProduction = process.env.NODE_ENV === 'production';

const router = express.Router();

// @route   GET api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
    // Populate assigned faculty for full dashboard context
    const user = await User.findById(req.user.id).populate('assignedFaculty', 'name email whatsappNumber');

    res.json({
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            reg: user.reg,
            semester: user.semester,
            cgpa: user.cgpa,
            status: user.status,
            whatsappNumber: user.whatsappNumber,
            internshipRequest: user.internshipRequest,
            internshipAgreement: user.internshipAgreement,
            mustChangePassword: user.mustChangePassword,
            fatherName: user.fatherName,
            section: user.section,
            dateOfBirth: user.dateOfBirth,
            profilePicture: user.profilePicture,
            registeredCourse: user.registeredCourse,
            assignedFaculty: user.assignedFaculty,
            assignedCompany: user.assignedCompany,
            assignedCompanySupervisor: user.assignedCompanySupervisor
        }
    });
});

// @route   POST api/auth/change-password
// @desc    Change password (for forced reset flow)
router.post('/change-password', protect, async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findById(req.user.id);

        user.password = await bcrypt.hash(newPassword, 12);
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/register
// @desc    Register a student
router.post('/register', async (req, res) => {
    try {
        console.log(`\n[${getPKTTime()}] AUTH: Registration attempt for ${req.body.email}`);
        const { name, reg, semester, cgpa, email, password, role } = req.body;
        console.log(`[DATA] Saving Student with Full Reg: ${reg}`);
        if (role !== 'student') {
            return res.status(403).json({ message: 'Public registration only allowed for students.' });
        }
        const emailLower = email.toLowerCase().trim();
        if (!emailLower.endsWith('@cuiatd.edu.pk')) {
            return res.status(400).json({ message: 'Only @cuiatd.edu.pk emails are allowed.' });
        }

        // 2. Check Duplicate Identity (Across Primary and Secondary Aliases)
        const existingUser = await User.findOne({
            $or: [
                { email: emailLower },
                { secondaryEmail: emailLower }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'This email is already registered or linked to an account.' });
        }

        // 3. Encrypt Password
        const hashedPassword = await bcrypt.hash(password, 12);

        // 4. Generate Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // Extended to 24h for reliability

        // 5. Save Student Record
        const user = new User({
            name,
            reg,
            semester,
            cgpa,
            email: emailLower,
            password: hashedPassword,
            role: 'student',
            status: 'unverified',
            whatsappNumber: req.body.whatsappNumber || '',
            emailVerificationToken: verificationToken,
            emailVerificationExpires: tokenExpiry
        });

        await user.save();
        console.log(`[SUCCESS] Student record created in database: ${emailLower}`);

        // 6. Send Verification Email
        try {
            console.log(`[MAIL] Dispatching verification email to student...`);
            await sendVerificationEmail(emailLower, verificationToken);
        } catch (err) {
            console.error('Email send failed:', err);
            // We still registered the user, but they'll need to resend verification
        }

        res.status(201).json({ message: 'Registration successful! Please check your email for verification link.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/verify-email/:token
// @desc    Verify email address
router.post('/verify-email/:token', async (req, res) => {
    try {
        const token = req.params.token.trim();
        console.log(`[${getPKTTime()}] AUTH: Verification attempt. Received token length: ${token.length}`);

        const user = await User.findOne({ emailVerificationToken: token });

        if (!user) {
            console.log(`[${getPKTTime()}] [FAIL] Verification failed: Token not found.`);
            return res.status(400).json({
                message: 'Verification link invalid. Please request a new one.'
            });
        }

        if (user.status === 'verified') {
            console.log(`[${getPKTTime()}] [INFO] User ${user.email} already verified.`);
            return res.json({ message: 'Email already verified! Please log in.' });
        }

        if (user.emailVerificationExpires && new Date(user.emailVerificationExpires).getTime() < Date.now()) {
            console.log(`[${getPKTTime()}] [FAIL] Verification failed: Token expired for ${user.email}.`);
            return res.status(400).json({
                message: 'Verification link expired. Please request a new one.'
            });
        }

        user.status = 'verified';
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        console.log(`[${getPKTTime()}] [SUCCESS] Email verified for: ${user.email}`);
        res.json({ message: 'Email verified successfully! You can now log in.' });

    } catch (error) {
        console.error(`[${getPKTTime()}] [ERROR] Verification error:`, error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/forgot-password
// @desc    Generate a 6-digit code and email it to user
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const emailLower = email.toLowerCase().trim();

        const user = await User.findOne({
            $or: [
                { email: emailLower },
                { secondaryEmail: emailLower }
            ]
        });

        if (!user) {
            // Security response: don't reveal if user exists
            return res.json({ message: 'If an account exists with this email, a verification code has been sent.' });
        }

        // Generate 6-digit numeric code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 Minutes

        // Use updateOne with $set to bypass any in-memory model caching issues
        await User.updateOne(
            { _id: user._id },
            { $set: { resetPasswordCode: code, resetPasswordExpires: expiry } }
        );

        console.log(`[FORGOT-PW] Code ${code} saved for ${emailLower}, expires ${expiry}`);

        const mailResult = await sendPasswordResetCode(emailLower, code);

        if (!mailResult.success) {
            return res.status(500).json({ message: 'Failed to send verification code. Please try again later.' });
        }

        res.json({ message: 'Verification code sent to your email.' });
    } catch (err) {
        console.error('[FORGOT-PW ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/verify-reset-code
// @desc    Check if 6-digit code is valid
router.post('/verify-reset-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        const emailLower = email.toLowerCase().trim();

        // Debug: log what we're searching for
        const userByEmail = await User.findOne({ email: emailLower });
        if (userByEmail) {
            console.log(`[VERIFY-CODE] DB has code: '${userByEmail.resetPasswordCode}', received: '${code}', expires: ${userByEmail.resetPasswordExpires}`);
        } else {
            console.log(`[VERIFY-CODE] No user found for email: ${emailLower}`);
        }

        const user = await User.findOne({
            email: emailLower,
            resetPasswordCode: code.toString().trim(),
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        res.json({ success: true, message: 'Code verified. You can now reset your password.' });
    } catch (err) {
        console.error('[VERIFY-CODE ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/reset-password-final
// @desc    Set new password using verified code
router.post('/reset-password-final', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const emailLower = email.toLowerCase().trim();

        const user = await User.findOne({
            email: emailLower,
            resetPasswordCode: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Your session has expired. Please request a new code.' });
        }

        // 1. Hash and Save
        user.password = await bcrypt.hash(newPassword, 12);

        // 2. Clear Reset Fields
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: 'Password reset successful! You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        console.log(`\n[${getPKTTime()}] AUTH: Login attempt for ${email} with role ${role}`);
        const emailLower = email.toLowerCase().trim();

        // 1. Optimized Look-up: Single query for both primary and secondary emails with population
        // This reduces database round-trips from 3 to 1 in the happy path
        const user = await User.findOne({
            $or: [
                { email: emailLower },
                { secondaryEmail: emailLower }
            ]
        }).populate('assignedFaculty', 'name email whatsappNumber');

        if (!user) {
            console.log(`[FAIL] Login failed: User identity not found for ${emailLower}`);
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isSecondaryLogin = user.secondaryEmail === emailLower && user.email !== emailLower;
        console.log(`[INFO] Found user record: ${user.email} (Primary) | ${user.secondaryEmail || 'None'} (Secondary)`);

        // Role Verification
        if (role && user.role !== role) {
            console.log(`[DENIED] Role mismatch. Database: ${user.role}, Attempted: ${role}`);
            return res.status(403).json({
                message: `Unauthorized access. This account is registered as a ${user.role.replace('_', ' ')}. Please select the correct role.`
            });
        }

        // Strict Login Policy
        if (user.role === 'student' && user.status === 'unverified') {
            return res.status(401).json({ message: 'Please verify your email before logging in.' });
        }

        // 2. Fast Password Verification
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[AUTH-FAILURE] Incorrect password for: ${user.email}`);
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Secondary Email Flow: Require OTP
        if (isSecondaryLogin) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min

            user.secondaryEmailVerificationCode = code;
            user.secondaryEmailVerificationExpires = expiry;
            await user.save();

            const mailResult = await sendPasswordResetCode(emailLower, code);
            if (!mailResult.success) {
                return res.status(500).json({ message: 'Failed to send verification code. Please try again later.' });
            }

            return res.json({
                status: 'otp_required',
                message: 'Verification code sent to your secondary email.',
                secondaryEmail: emailLower
            });
        }

        // 3. Concurrent Token Generation and DB Update
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login without triggering full middleware stack for speed
        await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

        // Cookie logic for cross-site (Vercel -> Custom Domain)
        res.cookie('token', token, {
            httpOnly: true,
            secure: true, // Always true for HTTPS, required by SameSite: none
            sameSite: 'none', // Required for cross-site cookies between different domains
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days instead of 24h
            path: '/'
        });

        console.log(`[SUCCESS] User authenticated as ${user.role}: ${emailLower}`);

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                reg: user.reg,
                semester: user.semester,
                cgpa: user.cgpa,
                status: user.status,
                whatsappNumber: user.whatsappNumber,
                internshipRequest: user.internshipRequest,
                internshipAgreement: user.internshipAgreement,
                mustChangePassword: user.mustChangePassword,
                fatherName: user.fatherName,
                section: user.section,
                dateOfBirth: user.dateOfBirth,
                profilePicture: user.profilePicture,
                registeredCourse: user.registeredCourse,
                assignedFaculty: user.assignedFaculty,
                assignedCompany: user.assignedCompany,
                assignedCompanySupervisor: user.assignedCompanySupervisor
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/verify-secondary
// @desc    Verify OTP for secondary email login
router.post('/verify-secondary', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({
            secondaryEmail: email.toLowerCase().trim(),
            secondaryEmailVerificationCode: code,
            secondaryEmailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        // Clear code after use
        user.secondaryEmailVerificationCode = undefined;
        user.secondaryEmailVerificationExpires = undefined;

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        user.lastLogin = Date.now();
        await user.save();

        const populatedUser = await User.findById(user._id).populate('assignedFaculty', 'name email whatsappNumber');

        res.json({
            user: {
                id: populatedUser._id,
                name: populatedUser.name,
                email: populatedUser.email,
                secondaryEmail: populatedUser.secondaryEmail,
                role: populatedUser.role,
                reg: populatedUser.reg,
                status: populatedUser.status,
                whatsappNumber: populatedUser.whatsappNumber,
                fatherName: populatedUser.fatherName,
                section: populatedUser.section,
                dateOfBirth: populatedUser.dateOfBirth,
                profilePicture: populatedUser.profilePicture,
                assignedFaculty: populatedUser.assignedFaculty,
                assignedCompany: populatedUser.assignedCompany,
                assignedCompanySupervisor: populatedUser.assignedCompanySupervisor
            },
            token
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/auth/faculty-list
// @desc    Get all faculty members for assignment dropdowns with their assigned student count
router.get('/faculty-list', async (req, res) => {
    try {
        const facultyList = await User.find({ role: 'faculty_supervisor' }, 'name email status whatsappNumber');
        const assignmentsCount = await User.aggregate([
            { $match: { role: 'student', assignedFaculty: { $exists: true, $ne: null } } },
            { $group: { _id: '$assignedFaculty', count: { $sum: 1 } } }
        ]);

        const countMap = assignmentsCount.reduce((acc, curr) => {
            acc[curr._id.toString()] = curr.count;
            return acc;
        }, {});

        const facultyWithCount = facultyList.map(faculty => ({
            ...faculty.toObject(),
            assignedStudents: countMap[faculty._id.toString()] || 0
        }));

        res.json(facultyWithCount);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/auth/faculty-activate-check/:token
// @desc    Validate activation token for faculty UI
router.get('/faculty-activate-check/:token', async (req, res) => {
    try {
        const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({
            activationToken: tokenHash,
            activationExpires: { $gt: Date.now() },
            status: 'Pending Activation'
        });

        if (!user) {
            return res.status(400).json({ message: 'Activation link expired or invalid.' });
        }

        res.json({ name: user.name, email: user.email });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/faculty-set-password
// @desc    Set password and activate faculty account
router.post('/faculty-set-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            activationToken: tokenHash,
            activationExpires: { $gt: Date.now() },
            status: 'Pending Activation'
        });

        if (!user) {
            return res.status(400).json({ message: 'Activation link expired or invalid.' });
        }

        // 1. Hash Password
        user.password = await bcrypt.hash(password, 12);

        // 2. Clear Token & Activate
        user.status = 'Active';
        user.activationToken = undefined;
        user.activationExpires = undefined;

        await user.save();

        res.json({ message: 'Account activated successfully! You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/auth/supervisor-activate-check/:token
// @desc    Validate activation token for Site Supervisor UI
router.get('/supervisor-activate-check/:token', async (req, res) => {
    try {
        const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({
            activationToken: tokenHash,
            activationExpires: { $gt: Date.now() },
            status: 'Pending Activation',
            role: 'site_supervisor'
        });

        if (!user) {
            return res.status(400).json({ message: 'Activation link expired or invalid.' });
        }

        res.json({ name: user.name, email: user.email });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/supervisor-set-password
// @desc    Set password and activate Site Supervisor account
router.post('/supervisor-set-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            activationToken: tokenHash,
            activationExpires: { $gt: Date.now() },
            status: 'Pending Activation',
            role: 'site_supervisor'
        });

        if (!user) {
            return res.status(400).json({ message: 'Activation link expired or invalid.' });
        }

        // 1. Hash Password
        user.password = await bcrypt.hash(password, 12);

        // 2. Clear Token & Activate
        user.status = 'Active';
        user.activationToken = undefined;
        user.activationExpires = undefined;

        await user.save();

        console.log(`[SUCCESS] Site Supervisor ${user.email} Activated.`);
        res.json({ message: 'Supervisor account activated! You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/auth/download-proxy
// @desc    Securely proxy Cloudinary downloads to bypass CORS and private access issues
router.get('/download-proxy', protect, async (req, res) => {
    let target = '';
    try {
        const { url, filename } = req.query;
        if (!url) return res.status(400).json({ message: 'URL required' });
        target = decodeURIComponent(url);

        console.log(`\n[PROXY-DL] Requesting: ${target}`);

        // Try primary URL first (fastest)
        let response = await fetch(target);

        // If 401/404 on Cloudinary, it might be private or MIS-categorized (raw vs image)
        if (!response.ok && target.includes('cloudinary.com/dos6h3v5l')) {
            console.log(`[PROXY-DL] [WARN] Status ${response.status}. Attempting SDK Rescue...`);

            // Extract Public ID
            const parts = target.split('/');
            const uploadIndex = parts.indexOf('upload');
            if (uploadIndex > -1) {
                const resType = parts[uploadIndex - 1]; // image, raw, etc.
                let pubIdExt = parts.slice(uploadIndex + 1).join('/');
                if (pubIdExt.startsWith('v')) pubIdExt = pubIdExt.split('/').slice(1).join('/');
                const pubId = pubIdExt.substring(0, pubIdExt.lastIndexOf('.')) || pubIdExt;

                try {
                    // Use SDK with API Key/Secret to fetch the resource details (Bypasses 401)
                    const resource = await cloudinary.api.resource(pubId, { resource_type: resType });
                    if (resource && resource.secure_url) {
                        console.log(`[PROXY-DL] [FIXED] Found via SDK: ${resource.secure_url}`);
                        response = await fetch(resource.secure_url);
                        if (response.ok) target = resource.secure_url;
                    }
                } catch (sdkErr) {
                    console.error(`[PROXY-DL] [SDK-FAIL] Error: ${sdkErr.message}`);
                    // Fallback to raw swap if SDK fails
                    if (resType === 'image' && target.toLowerCase().endsWith('.pdf')) {
                        const rawT = target.replace('/image/upload/', '/raw/upload/');
                        console.log(`[PROXY-DL] [RETRY-RAW] Trying raw path: ${rawT}`);
                        const rawResp = await fetch(rawT);
                        if (rawResp.ok) { response = rawResp; target = rawT; }
                    }
                }
            }
        }

        if (!response.ok) {
            console.error(`[PROXY-DL] [FAIL] Could not retrieve file. Final status: ${response.status}`);
            return res.redirect(target);
        }

        const contentType = response.headers.get('content-type');
        const safeName = (filename || 'Document').replace(/[^\x00-\x7F]/g, "").replace(/["\s]/g, "_").replace(/\.pdf$/i, "");

        res.setHeader('Content-Type', contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);

        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
        console.log(`[PROXY-DL] [SUCCESS] ${arrayBuffer.byteLength} bytes delivered.`);

    } catch (err) {
        console.error(`[PROXY-DL] [SYSTEM-ERROR]`, err);
        if (target) return res.redirect(target);
        res.status(500).json({ message: 'Download failed.' });
    }
});




// @route   POST api/auth/logout
// @desc    Logout user / Clear cookie
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true, // Match settings from login to ensure cookie is cleared
        sameSite: 'none',
        path: '/'
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
