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

// @route   POST api/student/submit-request
// @desc    Submit Internship Approval Form
router.post('/submit-request', asyncHandler(async (req, res) => {
    const {
        userId,
        internshipType,
        companyName,
        siteSupervisorName,
        siteSupervisorEmail,
        siteSupervisorPhone,
        facultyType,
        selectedFacultyId,
        newFacultyDetails,
        duration,
        startDate,
        endDate,
        mode,
        description,
        freelancePlatform,
        freelanceProfileLink
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.internshipRequest = {
        type: internshipType,
        companyName: internshipType === 'Self' ? companyName : 'University Assigned',
        siteSupervisorName,
        siteSupervisorEmail,
        siteSupervisorPhone,

        facultyType,
        selectedFacultyId: facultyType === 'Registered' ? selectedFacultyId : null,
        newFacultyDetails: facultyType === 'Identify New' ? newFacultyDetails : null,
        facultyStatus: 'Pending',

        duration,
        startDate,
        endDate,
        mode,
        description,
        freelancePlatform,
        freelanceProfileLink,
        submittedAt: Date.now()
    };
    user.status = 'Internship Request Submitted';

    await user.save();
    
    // Notify Internship Office
    const officeUsers = await User.find({ role: 'internship_office' }, '_id');
    for (const office of officeUsers) {
        await createNotification({
            recipient: office._id,
            sender: userId,
            type: 'internship_request',
            title: 'New Internship Request',
            message: `${user.name} (${user.reg}) has submitted a new internship approval request.`,
            link: '/office/internship-requests'
        });
    }

    res.json({ message: 'Internship request submitted successfully' });
}));

// @route   GET api/student/available-supervisors
// @desc    Fetch registered faculty supervisors who have < 5 students assigned or pending
router.get('/available-supervisors', protect, asyncHandler(async (req, res) => {
    const faculty = await User.find({ role: 'faculty_supervisor' })
        .select('name email section')
        .lean();

    const facultyWithLoad = await Promise.all(faculty.map(async (f) => {
        const currentLoad = await User.countDocuments({
            $or: [
                { assignedFaculty: f._id },
                {
                    'internshipRequest.selectedFacultyId': f._id,
                    'internshipRequest.facultyStatus': { $ne: 'Rejected' }
                }
            ]
        });
        return { ...f, currentLoad, available: currentLoad < 5 };
    }));

    const availableFaculty = facultyWithLoad.filter(f => f.available);
    res.json(availableFaculty);
}));

// @route   POST api/student/submit-agreement
// @desc    Submit Student Agreement Form
router.post('/submit-agreement', asyncHandler(async (req, res) => {
    const { userId, agreementData } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.internshipAgreement = {
        ...agreementData,
        submittedAt: Date.now()
    };

    const type = agreementData.formType || user.internshipRequest.type;
    user.status = type === 'Self'
        ? 'Agreement Submitted - Self'
        : 'Agreement Submitted - University Assigned';

    await user.save();

    const officeUsers = await User.find({ role: 'internship_office' }, '_id');
    for (const office of officeUsers) {
        await createNotification({
            recipient: office._id,
            sender: userId,
            type: 'internship_request',
            title: 'New Agreement Submitted',
            message: `${user.name} (${user.reg}) has submitted their student agreement form.`,
            link: '/office/agreement-verification'
        });
    }

    res.json({ message: 'Agreement submitted successfully' });
}));

// @route   GET api/student/my-marks
// @desc    Get current student's marks with consolidated final scores
router.get('/my-marks', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const [marks, submissions] = await Promise.all([
        Mark.find({ student: req.user.id })
            .populate('assignment', 'title deadline totalMarks status courseTitle')
            .sort({ createdAt: -1 }),
        Submission.find({ student: req.user.id }).select('assignment fileUrl fileName')
    ]);

    const isFreelance = user.internshipRequest?.mode === 'Freelance' || (!user.assignedSiteSupervisor && !user.assignedCompanySupervisor);

    const consolidated = marks.map(m => {
        const sub = submissions.find(s => s.assignment.toString() === m.assignment._id.toString());
        let obtained = 0;
        if (isFreelance) {
            obtained = m.facultyMarks || 0;
        } else {
            obtained = ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2;
        }

        return {
            ...m.toObject(),
            marks: obtained,
            submissionFileUrl: sub?.fileUrl || null,
            submissionFileName: sub?.fileName || null,
            studentStatus: user.status
        };
    });

    res.json(consolidated);
}));

// @route   GET api/student/my-evaluations
// @desc    Get current student's evaluations (Internal / Final)
router.get('/my-evaluations', protect, asyncHandler(async (req, res) => {
    const evaluations = await Evaluation.find({ student: req.user.id, status: 'Submitted' })
        .select('marks totalMarks maxTotal source comments submittedAt');
    res.json(evaluations);
}));

// @route   PUT api/student/update-profile
// @desc    Update student profile information
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
        const uploadRes = await cloudinary.uploader.upload(profilePicture, {
            folder: 'dims/profiles',
            upload_preset: 'public_preset',
            public_id: `profile_${user._id}`
        });
        user.profilePicture = uploadRes.secure_url;
    } else if (profilePicture) {
        user.profilePicture = profilePicture;
    }

    await user.save();

    const populatedUser = await User.findById(user._id)
        .populate('assignedFaculty', 'name email whatsappNumber');

    res.json({
        message: 'Profile updated successfully',
        user: {
            id: populatedUser._id,
            name: populatedUser.name,
            email: populatedUser.email,
            role: populatedUser.role,
            reg: populatedUser.reg,
            status: populatedUser.status,
            fatherName: populatedUser.fatherName,
            secondaryEmail: populatedUser.secondaryEmail,
            section: populatedUser.section,
            semester: populatedUser.semester,
            cgpa: populatedUser.cgpa,
            dateOfBirth: populatedUser.dateOfBirth,
            profilePicture: populatedUser.profilePicture,
            registeredCourse: populatedUser.registeredCourse,
            whatsappNumber: populatedUser.whatsappNumber,
            internshipRequest: populatedUser.internshipRequest,
            internshipAgreement: populatedUser.internshipAgreement,
            assignedFaculty: populatedUser.assignedFaculty,
            assignedCompany: populatedUser.assignedCompany,
            assignedCompanySupervisor: populatedUser.assignedCompanySupervisor
        }
    });
}));

// @route   POST api/student/secondary-email/send-otp
// @desc    Send OTP to a secondary email before linking
router.post('/secondary-email/send-otp', protect, asyncHandler(async (req, res) => {
    const { secondaryEmail } = req.body;
    if (!secondaryEmail) return res.status(400).json({ message: 'Secondary email is required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.secondaryEmail) {
        return res.status(400).json({ message: 'A secondary email is already linked to this account.' });
    }

    const lowerEmail = secondaryEmail.toLowerCase().trim();
    if (lowerEmail.endsWith('@cuiatd.edu.pk')) {
        return res.status(400).json({ message: 'Secondary email must be a personal email (institutional emails cannot be used as backup).' });
    }
    if (lowerEmail === user.email) {
        return res.status(400).json({ message: 'Secondary email cannot be the same as primary email.' });
    }

    const collision = await User.findOne({
        _id: { $ne: user._id },
        $or: [{ email: lowerEmail }, { secondaryEmail: lowerEmail }]
    });
    if (collision) return res.status(400).json({ message: 'This email is already linked to another account.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await User.updateOne({ _id: user._id }, { $set: {
        pendingSecondaryEmail: lowerEmail,
        secondaryEmailOtp: code,
        secondaryEmailOtpExpires: expiry
    }});

    const result = await sendSecondaryEmailVerificationCode(lowerEmail, code);
    if (!result.success) return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });

    res.json({ message: 'Verification code sent! Check your secondary email inbox.' });
}));

// @route   POST api/student/secondary-email/confirm
// @desc    Confirm OTP and permanently link secondary email
router.post('/secondary-email/confirm', protect, asyncHandler(async (req, res) => {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: 'Verification code is required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!user.pendingSecondaryEmail || !user.secondaryEmailOtp) {
        return res.status(400).json({ message: 'No pending secondary email link initiated.' });
    }

    if (new Date() > new Date(user.secondaryEmailOtpExpires)) {
        return res.status(400).json({ message: 'Verification code expired.' });
    }

    if (otp.toString().trim() !== user.secondaryEmailOtp) {
        return res.status(400).json({ message: 'Invalid verification code.' });
    }

    const confirmedEmail = user.pendingSecondaryEmail;
    await User.updateOne({ _id: user._id }, {
        $set: { secondaryEmail: confirmedEmail },
        $unset: { pendingSecondaryEmail: '', secondaryEmailOtp: '', secondaryEmailOtpExpires: '' }
    });

    await sendSecondaryEmailLinkedConfirmation(confirmedEmail, user.email);

    const updatedUser = await User.findById(user._id).populate('assignedFaculty', 'name email whatsappNumber');
    res.json({
        message: 'Secondary email linked successfully!',
        user: {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            reg: updatedUser.reg,
            status: updatedUser.status,
            fatherName: updatedUser.fatherName,
            secondaryEmail: updatedUser.secondaryEmail,
            section: updatedUser.section,
            semester: updatedUser.semester,
            cgpa: updatedUser.cgpa,
            dateOfBirth: updatedUser.dateOfBirth,
            profilePicture: updatedUser.profilePicture,
            registeredCourse: updatedUser.registeredCourse,
            whatsappNumber: updatedUser.whatsappNumber,
            internshipRequest: updatedUser.internshipRequest,
            internshipAgreement: updatedUser.internshipAgreement,
            assignedFaculty: updatedUser.assignedFaculty,
            assignedCompany: updatedUser.assignedCompany,
            assignedCompanySupervisor: updatedUser.assignedCompanySupervisor
        }
    });
}));

// @route   GET api/student/assignments
// @desc    Get assignments from the assigned faculty, site supervisor, and office
router.get('/assignments', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const orFilters = [];

    if (user.assignedFaculty) {
        orFilters.push({ createdBy: user.assignedFaculty });
    }

    let siteSupervisorId = user.assignedSiteSupervisor;
    if (!siteSupervisorId) {
        const candidateEmails = [
            user.assignedCompanySupervisorEmail,
            user.internshipRequest?.siteSupervisorEmail,
            user.internshipAgreement?.companySupervisorEmail
        ].filter(Boolean).map(e => e.toLowerCase().trim());

        const candidateNames = [
            user.assignedCompanySupervisor,
            user.internshipRequest?.siteSupervisorName,
            user.internshipAgreement?.companySupervisorName
        ].filter(Boolean);

        if (candidateEmails.length > 0) {
            const supByEmail = await User.findOne({ email: { $in: candidateEmails }, role: 'site_supervisor' }, '_id');
            if (supByEmail) siteSupervisorId = supByEmail._id;
        }

        if (!siteSupervisorId && candidateNames.length > 0) {
            for (const name of candidateNames) {
                const regex = new RegExp(name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                const supByName = await User.findOne({ name: { $regex: regex }, role: 'site_supervisor' }, '_id');
                if (supByName) {
                    siteSupervisorId = supByName._id;
                    break;
                }
            }
        }
    }

    if (siteSupervisorId) {
        orFilters.push({
            $and: [
                { createdBy: siteSupervisorId },
                {
                    $or: [
                        { targetStudents: { $size: 0 } },
                        { targetStudents: user._id }
                    ]
                }
            ]
        });
    }

    const officeUsers = await User.find({ role: 'internship_office' }, '_id');
    if (officeUsers.length > 0) {
        orFilters.push({ createdBy: { $in: officeUsers.map(u => u._id) } });
    }

    if (user.internshipRequest?.mode === 'Freelance') {
        const currentPhase = await Phase.findOne({ status: 'active' }).lean();
        if (currentPhase && currentPhase.order === 3) {
            const now = new Date();
            const pktOffset = 5 * 60 * 60 * 1000;
            const pktNow = new Date(now.getTime() + pktOffset);
            const day = pktNow.getUTCDay();
            const diffToMonday = (day === 0 ? 6 : day - 1);
            const mondayPKT = new Date(pktNow);
            mondayPKT.setUTCDate(pktNow.getUTCDate() - diffToMonday);
            mondayPKT.setUTCHours(0, 0, 0, 0);
            const sundayPKT = new Date(mondayPKT);
            sundayPKT.setUTCDate(mondayPKT.getUTCDate() + 6);
            sundayPKT.setUTCHours(18, 30, 0, 0);
            const startUTC = new Date(mondayPKT.getTime() - pktOffset);
            let deadlineUTC = new Date(sundayPKT.getTime() - pktOffset);
            if (currentPhase.scheduledEndAt) {
                const phaseEnd = new Date(currentPhase.scheduledEndAt);
                if (phaseEnd > startUTC && phaseEnd < deadlineUTC) deadlineUTC = phaseEnd;
            }

            const existing = await Assignment.findOne({ targetStudents: user._id, courseTitle: 'Freelance Weekly Report', startDate: startUTC });
            if (!existing) {
                const prevCount = await Assignment.countDocuments({ targetStudents: user._id, courseTitle: 'Freelance Weekly Report' });
                const newAssignment = new Assignment({
                    title: `Weekly Report - Week ${prevCount + 1}`,
                    courseTitle: 'Freelance Weekly Report',
                    description: 'Weekly progress summary for freelance track.',
                    startDate: startUTC,
                    deadline: deadlineUTC,
                    totalMarks: 10,
                    targetStudents: [user._id],
                    createdBy: user.assignedFaculty || user._id
                });
                await newAssignment.save();
                await new Mark({ assignment: newAssignment._id, student: user._id, isSiteSupervisorGraded: true, siteSupervisorMarks: null, siteSupervisorRemarks: 'Freelance Track — auto-bypass', facultyId: user.assignedFaculty }).save();
            }
        }
        orFilters.push({ targetStudents: user._id, courseTitle: 'Freelance Weekly Report' });
    }

    if (orFilters.length === 0) return res.json([]);

    const [assignments, submissions, marks] = await Promise.all([
        Assignment.find({ $or: orFilters, status: 'Active' }).sort({ createdAt: -1 }),
        Submission.find({ student: req.user.id }),
        Mark.find({ student: req.user.id })
    ]);

    const result = assignments.map(assignment => {
        const submission = submissions.find(s => s.assignment.toString() === assignment._id.toString());
        const mark = marks.find(m => m.assignment.toString() === assignment._id.toString());
        const now = new Date();
        const deadline = new Date(assignment.deadline);
        return {
            ...assignment.toObject(),
            submissionStatus: submission ? 'Submitted' : 'Pending',
            submissionDate: submission ? submission.submissionDate : null,
            status: now <= deadline ? 'Open' : 'Closed',
            studentSubmission: submission ? { fileUrl: submission.fileUrl, fileName: submission.fileName } : null,
            marks: mark ? { siteSupervisorMarks: mark.siteSupervisorMarks, siteSupervisorRemarks: mark.siteSupervisorRemarks, facultyMarks: mark.facultyMarks, facultyRemarks: mark.facultyRemarks, isSiteSupervisorGraded: mark.isSiteSupervisorGraded, isFacultyGraded: mark.isFacultyGraded } : null
        };
    });
    res.json(result);
}));

// @route   POST api/student/submit-assignment/:assignmentId
// @desc    Upload assignment submission
router.post('/submit-assignment/:assignmentId', protect, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const now = new Date();
    const deadline = new Date(assignment.deadline);
    const status = now <= deadline ? 'Submitted' : 'Late Submitted';

    let submission = await Submission.findOne({ assignment: assignmentId, student: req.user.id });
    if (submission) {
        submission.fileUrl = req.file.path;
        submission.fileName = req.file.originalname;
        submission.submissionDate = now;
        submission.status = status;
    } else {
        submission = new Submission({ assignment: assignmentId, student: req.user.id, fileUrl: req.file.path, fileName: req.file.originalname, submissionDate: now, status });
    }
    await submission.save();
    res.json({ message: 'Assignment submitted successfully', submission });
}));

// @route   POST api/student/submit-freelance-report
// @desc    Upload weekly summary for freelance students
router.post('/submit-freelance-report', protect, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const user = await User.findById(req.user.id);
    const now = new Date();
    const assignment = await Assignment.findOne({ targetStudents: user._id, courseTitle: 'Freelance Weekly Report', startDate: { $lte: now }, deadline: { $gte: now } });
    if (!assignment) return res.status(400).json({ message: 'No active freelance assignment window found.' });

    let submission = await Submission.findOne({ assignment: assignment._id, student: user._id });
    if (submission) {
        submission.fileUrl = req.file.path;
        submission.fileName = req.file.originalname;
        submission.submissionDate = now;
        submission.status = 'Submitted';
    } else {
        submission = new Submission({ assignment: assignment._id, student: user._id, fileUrl: req.file.path, fileName: req.file.originalname, status: 'Submitted', submissionDate: now });
    }
    await submission.save();
    res.json({ message: 'Freelance weekly report submitted successfully', submission });
}));

// @route   GET api/student/eligibility/:userId
// @desc    Check if a student is eligible for the internship cycle
router.get('/eligibility/:userId', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId).lean();
    if (!user || user.role !== 'student') return res.status(404).json({ message: 'Student not found.' });

    const currentPhase = await Phase.findOne({ status: 'active' }).lean();
    const phaseOrder = currentPhase ? currentPhase.order : 1;
    const checks = [];
    let eligible = true;

    const eligibleSemesters = new Set(['4', '5', '6', '7', '8']);
    const semOk = eligibleSemesters.has(user.semester);
    checks.push({ key: 'semester', label: 'Academic Semester', detail: semOk ? `Semester ${user.semester} — eligible.` : `Semester ${user.semester || 'N/A'} is not eligible.`, passed: semOk });
    if (!semOk) eligible = false;

    const verified = user.status !== 'unverified';
    checks.push({ key: 'verified', label: 'Account Verification', detail: verified ? 'Account active.' : 'Email not verified.', passed: verified });
    if (!verified) eligible = false;

    const cgpaVal = parseFloat(user.cgpa);
    const cgpaOk = !user.cgpa || (cgpaVal >= 2.0 && cgpaVal <= 4.0);
    checks.push({ key: 'cgpa', label: 'CGPA Requirement', detail: cgpaOk ? (user.cgpa ? `CGPA ${user.cgpa} meets criteria.` : 'CGPA not set.') : `CGPA ${user.cgpa} below 2.00.`, passed: cgpaOk, warning: !user.cgpa });
    if (user.cgpa && !cgpaOk) eligible = false;

    const regOk = !!user.reg;
    checks.push({ key: 'registration', label: 'Registration Number', detail: regOk ? `ID ${user.reg} on record.` : 'ID missing.', passed: regOk });
    if (!regOk) eligible = false;

    const profileComplete = !!(user.fatherName && user.section && user.dateOfBirth && user.profilePicture);
    checks.push({ key: 'profile', label: 'Profile Completeness', detail: profileComplete ? 'Profile complete.' : 'Profile missing data.', passed: profileComplete });

    let p3Eligible = true;
    if (phaseOrder >= 3) {
        const allowedStatuses = new Set(['Assigned', 'Internship Approved', 'Agreement Submitted - Self', 'Agreement Submitted - University Assigned', 'Agreement Approved']);
        p3Eligible = allowedStatuses.has(user.status);
    }
    checks.push({ key: 'phase_eligibility', label: 'Cycle Progression', detail: p3Eligible ? 'Placement steps valid for current phase.' : 'No placement secured.', passed: p3Eligible });

    const hardCriteriaMet = semOk && verified && cgpaOk && regOk && p3Eligible;
    eligible = hardCriteriaMet && profileComplete;

    res.json({ eligible, hardCriteriaMet, profileComplete, studentName: user.name, reg: user.reg, semester: user.semester, checks });
}));

// @route   GET api/student/my-grade
// @desc    Get aggregated grade
router.get('/my-grade', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const marks = await Mark.find({ student: req.user.id, isFacultyGraded: true });
    if (marks.length === 0) return res.json(null);

    const isFreelance = user.internshipRequest?.mode === 'Freelance' || (!user.assignedSiteSupervisor && !user.assignedCompanySupervisor);
    const taskScores = marks.map(m => {
        const fScore = m.facultyMarks || 0;
        const sScore = m.siteSupervisorMarks || 0;
        return isFreelance ? fScore : (fScore + sScore) / 2;
    });

    const avgScore = taskScores.reduce((sum, val) => sum + val, 0) / taskScores.length;
    const pct = Math.round((avgScore / 10) * 100);
    let grade = 'F', gp = '0.00', status = 'Fail';
    if (pct >= 85) { grade = 'A'; gp = '3.67–4.00'; status = 'Pass'; }
    else if (pct >= 80) { grade = 'A-'; gp = '3.34–3.66'; status = 'Pass'; }
    else if (pct >= 75) { grade = 'B+'; gp = '3.01–3.33'; status = 'Pass'; }
    else if (pct >= 71) { grade = 'B'; gp = '2.67–3.00'; status = 'Pass'; }
    else if (pct >= 68) { grade = 'B-'; gp = '2.34–2.66'; status = 'Pass'; }
    else if (pct >= 64) { grade = 'C+'; gp = '2.01–2.33'; status = 'Pass'; }
    else if (pct >= 61) { grade = 'C'; gp = '1.67–2.00'; status = 'Pass'; }
    else if (pct >= 58) { grade = 'C-'; gp = '1.31–1.66'; status = 'Pass'; }
    else if (pct >= 54) { grade = 'D+'; gp = '1.01–1.30'; status = 'Pass'; }
    else if (pct >= 50) { grade = 'D'; gp = '0.10–1.00'; status = 'Pass'; }

    res.json({ 
        assignmentsCount: marks.length, 
        averageMarks: avgScore.toFixed(2), 
        percentage: pct, 
        grade, 
        gradePoints: gp, 
        status,
        certificateUrl: user.certificateUrl
    });
}));

export default router;
