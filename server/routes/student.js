import express from 'express';
import User from '../models/User.js';
import Mark from '../models/Mark.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Evaluation from '../models/Evaluation.js';
import Phase from '../models/Phase.js';
import { protect } from '../middleware/auth.js';
import { uploadCloudinary, cloudinary } from '../utils/cloudinary.js';
import { createNotification } from '../utils/notifications.js';
import { sendSecondaryEmailVerificationCode, sendSecondaryEmailLinkedConfirmation } from '../emailServices/emailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Student
 *   description: Student-side internship lifecycle management
 */

/**
 * @swagger
 * /student/submit-request:
 *   post:
 *     summary: Submit a new internship approval request (Self or Uni-Assigned)
 *     tags: [Student]
 */
router.post('/submit-request', asyncHandler(async (req, res) => {
    const { userId, internshipType, companyName, siteSupervisorName, siteSupervisorEmail, siteSupervisorPhone, facultyType, selectedFacultyId, newFacultyDetails, duration, startDate, endDate, mode, description, freelancePlatform, freelanceProfileLink } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.internshipRequest = { type: internshipType, companyName: internshipType === 'Self' ? companyName : 'University Assigned', siteSupervisorName, siteSupervisorEmail, siteSupervisorPhone, facultyType, selectedFacultyId: facultyType === 'Registered' ? selectedFacultyId : null, newFacultyDetails: facultyType === 'Identify New' ? newFacultyDetails : null, facultyStatus: 'Pending', duration, startDate, endDate, mode, description, freelancePlatform, freelanceProfileLink, submittedAt: Date.now() };
    user.status = 'Internship Request Submitted';
    await user.save();
    
    const offices = await User.find({ role: 'internship_office' }, '_id');
    for (const off of offices) {
        await createNotification({ recipient: off._id, sender: userId, type: 'internship_request', title: 'New Internship Request', message: `${user.name} (${user.reg}) has submitted a request.`, link: '/office/internship-requests' });
    }
    res.json({ message: 'Request submitted successfully' });
}));

/**
 * @swagger
 * /student/available-supervisors:
 *   get:
 *     summary: List faculty supervisors with available workload capacity
 *     tags: [Student]
 */
router.get('/available-supervisors', protect, asyncHandler(async (req, res) => {
    const faculty = await User.find({ role: 'faculty_supervisor' }).select('name email section').lean();
    const facultyWithLoad = await Promise.all(faculty.map(async (f) => {
        const load = await User.countDocuments({ $or: [{ assignedFaculty: f._id }, { 'internshipRequest.selectedFacultyId': f._id, 'internshipRequest.facultyStatus': { $ne: 'Rejected' } }] });
        return { ...f, currentLoad: load, available: load < 5 };
    }));
    res.json(facultyWithLoad.filter(f => f.available));
}));

/**
 * @swagger
 * /student/submit-agreement:
 *   post:
 *     summary: Submit the finalized internship agreement for verification
 *     tags: [Student]
 */
router.post('/submit-agreement', asyncHandler(async (req, res) => {
    const { userId, agreementData } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.internshipAgreement = { ...agreementData, submittedAt: Date.now() };
    const type = agreementData.formType || user.internshipRequest.type;
    user.status = type === 'Self' ? 'Agreement Submitted - Self' : 'Agreement Submitted - University Assigned';
    await user.save();

    const offices = await User.find({ role: 'internship_office' }, '_id');
    for (const off of offices) {
        await createNotification({ recipient: off._id, sender: userId, type: 'internship_request', title: 'New Agreement Submitted', message: `${user.name} (${user.reg}) submitted their agreement.`, link: '/office/agreement-verification' });
    }
    res.json({ message: 'Agreement submitted successfully' });
}));

/**
 * @swagger
 * /student/my-marks:
 *   get:
 *     summary: Retrieve personal marks and graded assignments
 *     tags: [Student]
 */
router.get('/my-marks', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const [marks, submissions] = await Promise.all([Mark.find({ student: req.user.id }).populate('assignment', 'title deadline totalMarks status courseTitle').sort({ createdAt: -1 }), Submission.find({ student: req.user.id }).select('assignment fileUrl fileName')]);
    const isFreelance = user.internshipRequest?.mode === 'Freelance' || (!user.assignedSiteSupervisor && !user.assignedCompanySupervisor);

    res.json(marks.map(m => {
        const sub = submissions.find(s => s.assignment.toString() === m.assignment._id.toString());
        return { ...m.toObject(), marks: isFreelance ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2, submissionFileUrl: sub?.fileUrl || null, submissionFileName: sub?.fileName || null, studentStatus: user.status };
    }));
}));

/**
 * @swagger
 * /student/my-evaluations:
 *   get:
 *     summary: Retrieve performance evaluations submitted by supervisors
 *     tags: [Student]
 */
router.get('/my-evaluations', protect, asyncHandler(async (req, res) => {
    res.json(await Evaluation.find({ student: req.user.id, status: 'Submitted' }).select('marks totalMarks maxTotal source comments submittedAt'));
}));

/**
 * @swagger
 * /student/update-profile:
 *   put:
 *     summary: Update basic profile and account security settings
 *     tags: [Student]
 */
router.put('/update-profile', protect, asyncHandler(async (req, res) => {
    const { fatherName, section, dateOfBirth, profilePicture, whatsappNumber, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (fatherName) user.fatherName = fatherName.trim();
    if (section) user.section = section.trim().toUpperCase();
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;

    if (newPassword && newPassword.trim() !== "") {
        const bcrypt = await import('bcryptjs').then(m => m.default);
        user.password = await bcrypt.hash(newPassword, 12);
    }
    if (profilePicture && profilePicture.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(profilePicture, { folder: 'dims/profiles', upload_preset: 'public_preset', public_id: `profile_${user._id}` });
        user.profilePicture = uploadRes.secure_url;
    } else if (profilePicture) {
        user.profilePicture = profilePicture;
    }

    await user.save();
    const populated = await User.findById(user._id).populate('assignedFaculty', 'name email whatsappNumber');
    res.json({ message: 'Profile updated successfully', user: populated });
}));

/**
 * @swagger
 * /student/secondary-email/send-otp:
 *   post:
 *     summary: Trigger OTP verification for linking a secondary personal email
 *     tags: [Student]
 */
router.post('/secondary-email/send-otp', protect, asyncHandler(async (req, res) => {
    const { secondaryEmail } = req.body;
    if (!secondaryEmail) return res.status(400).json({ message: 'Secondary email is required.' });
    const user = await User.findById(req.user.id);
    if (user.secondaryEmail) return res.status(400).json({ message: 'Secondary email already linked.' });

    const lower = secondaryEmail.toLowerCase().trim();
    if (lower.endsWith('@cuiatd.edu.pk')) return res.status(400).json({ message: 'Use a personal email.' });
    if (lower === user.email) return res.status(400).json({ message: 'Cannot be the same as primary email.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await User.updateOne({ _id: user._id }, { $set: { pendingSecondaryEmail: lower, secondaryEmailOtp: code, secondaryEmailOtpExpires: new Date(Date.now() + 5 * 60 * 1000) }});
    const result = await sendSecondaryEmailVerificationCode(lower, code);
    if (!result.success) return res.status(500).json({ message: 'Email dispatch failed.' });
    res.json({ message: 'OTP sent!' });
}));

/**
 * @swagger
 * /student/secondary-email/confirm:
 *   post:
 *     summary: Verify OTP and finalize secondary email linking
 *     tags: [Student]
 */
router.post('/secondary-email/confirm', protect, asyncHandler(async (req, res) => {
    const { otp } = req.body;
    const user = await User.findById(req.user.id);
    if (!user.pendingSecondaryEmail || new Date() > new Date(user.secondaryEmailOtpExpires) || otp.trim() !== user.secondaryEmailOtp) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const mail = user.pendingSecondaryEmail;
    await User.updateOne({ _id: user._id }, { $set: { secondaryEmail: mail }, $unset: { pendingSecondaryEmail: '', secondaryEmailOtp: '', secondaryEmailOtpExpires: '' } });
    await sendSecondaryEmailLinkedConfirmation(mail, user.email);
    res.json({ message: 'Verified.', user: await User.findById(user._id).populate('assignedFaculty') });
}));

/**
 * @swagger
 * /student/assignments:
 *   get:
 *     summary: Retrieve active assignments and submission status
 *     tags: [Student]
 */
router.get('/assignments', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const orFilters = [];
    if (user.assignedFaculty) orFilters.push({ createdBy: user.assignedFaculty });

    const offices = await User.find({ role: 'internship_office' }, '_id');
    if (offices.length > 0) orFilters.push({ createdBy: { $in: offices.map(u => u._id) } });

    if (user.internshipRequest?.mode === 'Freelance') {
        const cur = await Phase.findOne({ status: 'active' }).lean();
        if (cur && cur.order === 3) {
            const now = new Date();
            const pktNow = new Date(now.getTime() + (5 * 60 * 60 * 1000));
            const diff = pktNow.getUTCDay() === 0 ? 6 : pktNow.getUTCDay() - 1;
            const mon = new Date(pktNow); mon.setUTCDate(pktNow.getUTCDate() - diff); mon.setUTCHours(0,0,0,0);
            const startUTC = new Date(mon.getTime() - (5 * 60 * 60 * 1000));
            
            const existing = await Assignment.findOne({ targetStudents: user._id, courseTitle: 'Freelance Weekly Report', startDate: startUTC });
            if (!existing) {
                const count = await Assignment.countDocuments({ targetStudents: user._id, courseTitle: 'Freelance Weekly Report' });
                const a = new Assignment({ title: `Weekly Report - Week ${count + 1}`, courseTitle: 'Freelance Weekly Report', description: 'Weekly progress summary.', startDate: startUTC, deadline: new Date(mon.getTime() + (7 * 24 * 60 * 60 * 1000)), totalMarks: 10, targetStudents: [user._id], createdBy: user.assignedFaculty || user._id });
                await a.save();
                await new Mark({ assignment: a._id, student: user._id, isSiteSupervisorGraded: true, siteSupervisorRemarks: 'Freelance Track — bypass', facultyId: user.assignedFaculty }).save();
            }
        }
        orFilters.push({ targetStudents: user._id, courseTitle: 'Freelance Weekly Report' });
    }

    if (orFilters.length === 0) return res.json([]);
    const [assignments, submissions, marks] = await Promise.all([Assignment.find({ $or: orFilters, status: 'Active' }).sort({ createdAt: -1 }), Submission.find({ student: req.user.id }), Mark.find({ student: req.user.id })]);

    res.json(assignments.map(a => {
        const sub = submissions.find(s => s.assignment.toString() === a._id.toString());
        const m = marks.find(mk => mk.assignment.toString() === a._id.toString());
        return { ...a.toObject(), submissionStatus: sub ? 'Submitted' : 'Pending', status: new Date() <= new Date(a.deadline) ? 'Open' : 'Closed', studentSubmission: sub ? { fileUrl: sub.fileUrl, fileName: sub.fileName } : null, marks: m ? { siteSupervisorMarks: m.siteSupervisorMarks, facultyMarks: m.facultyMarks, isSiteSupervisorGraded: m.isSiteSupervisorGraded, isFacultyGraded: m.isFacultyGraded } : null };
    }));
}));

/**
 * @swagger
 * /student/submit-assignment/{assignmentId}:
 *   post:
 *     summary: Submit file for a specific assignment
 *     tags: [Student]
 */
router.post('/submit-assignment/:assignmentId', protect, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment || !req.file) return res.status(404).json({ message: 'Invalid submission.' });

    const now = new Date(), late = now > new Date(assignment.deadline);
    await Submission.findOneAndUpdate({ assignment: req.params.assignmentId, student: req.user.id }, { fileUrl: req.file.path, fileName: req.file.originalname, submissionDate: now, status: late ? 'Late Submitted' : 'Submitted' }, { upsert: true, new: true });
    res.json({ message: 'Submitted.' });
}));

/**
 * @swagger
 * /student/eligibility/{userId}:
 *   get:
 *     summary: Perform an internal audit check on student eligibility criteria
 *     tags: [Student]
 */
router.get('/eligibility/:userId', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ message: 'Not found.' });

    const cur = await Phase.findOne({ status: 'active' }).lean();
    const semOk = new Set(['4', '5', '6', '7', '8']).has(user.semester);
    const verified = user.status !== 'unverified';
    const cgpaOk = !user.cgpa || (parseFloat(user.cgpa) >= 2.0);
    const profile = !!(user.fatherName && user.section && user.dateOfBirth && user.profilePicture);

    res.json({ eligible: semOk && verified && cgpaOk && profile, hardCriteriaMet: semOk && verified && cgpaOk, profileComplete: profile, checks: [{ label: 'Semester', passed: semOk }, { label: 'Verification', passed: verified }, { label: 'CGPA', passed: cgpaOk }, { label: 'Profile', passed: profile }] });
}));

/**
 * @swagger
 * /student/my-grade:
 *   get:
 *     summary: Retrieve current calculated grade and certification status
 *     tags: [Student]
 */
router.get('/my-grade', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id), marks = await Mark.find({ student: req.user.id, isFacultyGraded: true });
    if (marks.length === 0) return res.json(null);

    const scores = marks.map(m => (!user.assignedSiteSupervisor && !user.assignedCompanySupervisor) ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length, pct = Math.round((avg / 10) * 100);
    res.json({ assignmentsCount: marks.length, averageMarks: avg.toFixed(2), percentage: pct, status: pct >= 50 ? 'Pass' : 'Fail', certificateUrl: user.certificateUrl });
}));

export default router;
