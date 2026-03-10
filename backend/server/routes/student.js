import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import Mark from '../models/Mark.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Evaluation from '../models/Evaluation.js';
import Phase from '../models/Phase.js';
import { protect } from '../middleware/auth.js';
import { getPKTTime } from '../utils/time.js';
import { uploadCloudinary, cloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// @route   POST api/student/submit-request
// @desc    Submit Internship Approval Form
router.post('/submit-request', async (req, res) => {
    try {
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
            description
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
            submittedAt: Date.now()
        };
        user.status = 'Internship Request Submitted';

        await user.save();
        console.log(`[${getPKTTime()}] [STUDENT] Internship Request Submitted by ${user.email}`);

        res.json({ message: 'Internship request submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/available-supervisors
// @desc    Fetch registered faculty supervisors who have < 5 students assigned or pending
router.get('/available-supervisors', protect, async (req, res) => {
    try {
        // Fetch all registered faculty supervisors
        const faculty = await User.find({ role: 'faculty_supervisor' })
            .select('name email section')
            .lean();

        // For each faculty, count their current load
        // Load = (Students currently assigned to them) OR (Students who have requested them and request is NOT rejected)
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

        // Only return available faculty
        const availableFaculty = facultyWithLoad.filter(f => f.available);

        res.json(availableFaculty);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/student/submit-agreement
// @desc    Submit Student Agreement Form
router.post('/submit-agreement', async (req, res) => {
    try {
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
        console.log(`[${getPKTTime()}] [STUDENT] Agreement Submitted by ${user.email}`);

        res.json({ message: 'Agreement submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/my-marks
// @desc    Get current student's marks
router.get('/my-marks', protect, async (req, res) => {
    try {
        const [marks, submissions] = await Promise.all([
            Mark.find({ student: req.user.id })
                .populate('assignment', 'title deadline totalMarks status')
                .sort({ createdAt: -1 }),
            Submission.find({ student: req.user.id }).select('assignment fileUrl fileName')
        ]);

        const consolidated = marks.map(m => {
            const sub = submissions.find(s => s.assignment.toString() === m.assignment._id.toString());
            return {
                ...m.toObject(),
                submissionFileUrl: sub?.fileUrl || null,
                submissionFileName: sub?.fileName || null
            };
        });

        res.json(consolidated);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/my-evaluations
// @desc    Get current student's evaluations (Internal / Final)
router.get('/my-evaluations', protect, async (req, res) => {
    try {
        const evaluations = await Evaluation.find({ student: req.user.id, status: 'Submitted' })
            .select('marks totalMarks maxTotal source comments submittedAt');
        res.json(evaluations);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT api/student/update-profile
// @desc    Update student profile information
router.put('/update-profile', protect, async (req, res) => {
    try {
        const { fatherName, section, dateOfBirth, profilePicture, secondaryEmail, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (fatherName) user.fatherName = fatherName;
        if (section) user.section = section;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (secondaryEmail) {
            const lowerEmail = secondaryEmail.toLowerCase().trim();

            // Prevent editing if already set
            if (user.secondaryEmail && user.secondaryEmail !== lowerEmail) {
                return res.status(400).json({ message: 'Secondary email is already registered and cannot be modified.' });
            }

            // Crucial Security: Ensure secondary email is not already a PRIMARY email or someone else's secondary
            const collision = await User.findOne({
                _id: { $ne: user._id },
                $or: [
                    { email: lowerEmail },
                    { secondaryEmail: lowerEmail }
                ]
            });

            if (collision) {
                return res.status(400).json({ message: 'The secondary email is already linked to another account.' });
            }

            user.secondaryEmail = lowerEmail;
        }

        // Handle Password Change
        if (newPassword && newPassword.trim() !== "") {
            const bcrypt = await import('bcryptjs').then(m => m.default);
            user.password = await bcrypt.hash(newPassword, 12);
        }

        // Check if the uploaded string is a new Base64 image
        if (profilePicture && profilePicture.startsWith('data:image')) {
            // Upload to Cloudinary using their uploader
            const uploadRes = await cloudinary.uploader.upload(profilePicture, {
                folder: 'dims/profiles',
                upload_preset: 'public_preset',
                public_id: `profile_${user._id}`
            });

            user.profilePicture = uploadRes.secure_url;
        } else if (profilePicture) {
            // Unchanged url
            user.profilePicture = profilePicture;
        }

        await user.save();

        // Fetch populated user to ensure all fields needed for dashboard are present
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

                // Keep these for dashboard
                internshipRequest: populatedUser.internshipRequest,
                internshipAgreement: populatedUser.internshipAgreement,
                assignedFaculty: populatedUser.assignedFaculty,
                assignedCompany: populatedUser.assignedCompany,
                assignedCompanySupervisor: populatedUser.assignedCompanySupervisor
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/assignments
// @desc    Get assignments from the assigned faculty
router.get('/assignments', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        console.log('\n[ASSIGNMENT DEBUG] Student:', user.name, '|', user.email);
        console.log('[ASSIGNMENT DEBUG] assignedSiteSupervisor:', user.assignedSiteSupervisor);
        console.log('[ASSIGNMENT DEBUG] assignedCompanySupervisorEmail:', user.assignedCompanySupervisorEmail);
        console.log('[ASSIGNMENT DEBUG] assignedFaculty:', user.assignedFaculty);

        // Define filters for all potential assignment sources
        const orFilters = [];

        // 1. From Faculty Supervisor (Global to their assigned students)
        if (user.assignedFaculty) {
            orFilters.push({ createdBy: user.assignedFaculty });
        }

        // 2. From Site Supervisor — try every possible field to find the link
        let siteSupervisorId = user.assignedSiteSupervisor; // Direct ObjectId (best case)

        if (!siteSupervisorId) {
            // Collect all candidate emails from every workflow stage
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

            console.log('[ASSIGNMENT DEBUG] Candidate emails:', candidateEmails);
            console.log('[ASSIGNMENT DEBUG] Candidate names:', candidateNames);

            if (candidateEmails.length > 0) {
                const supByEmail = await User.findOne({ email: { $in: candidateEmails }, role: 'site_supervisor' }, '_id');
                if (supByEmail) {
                    siteSupervisorId = supByEmail._id;
                    console.log('[ASSIGNMENT DEBUG] Resolved by email:', siteSupervisorId);
                }
            }

            // Name-based fallback as last resort
            if (!siteSupervisorId && candidateNames.length > 0) {
                for (const name of candidateNames) {
                    const regex = new RegExp(name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                    const supByName = await User.findOne({ name: { $regex: regex }, role: 'site_supervisor' }, '_id');
                    if (supByName) {
                        siteSupervisorId = supByName._id;
                        console.log('[ASSIGNMENT DEBUG] Resolved by name:', name, '->', siteSupervisorId);
                        break;
                    }
                }
            }
        }

        console.log('[ASSIGNMENT DEBUG] Final siteSupervisorId:', siteSupervisorId || 'NOT SET — no supervisor link found on student record');

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

        // 3. From Internship Office (Global administrative tasks)
        const officeUsers = await User.find({ role: 'internship_office' }, '_id');
        if (officeUsers.length > 0) {
            orFilters.push({ createdBy: { $in: officeUsers.map(u => u._id) } });
        }

        // 4. From Student mapping (Freelance uploads)
        if (user.internshipRequest?.mode === 'Freelance') {
            orFilters.push({ createdBy: user._id, courseTitle: 'Freelance Weekly Report' });
        }

        console.log('[ASSIGNMENT DEBUG] orFilters count:', orFilters.length, JSON.stringify(orFilters, null, 2));

        if (orFilters.length === 0) {
            console.log('[ASSIGNMENT DEBUG] No filters built — returning empty array');
            return res.json([]);
        }

        // DEBUG: also query ALL assignments by the supervisor regardless of filters
        if (siteSupervisorId) {
            const allSupAssignments = await Assignment.find({ createdBy: siteSupervisorId });
            console.log('[ASSIGNMENT DEBUG] ALL assignments by supervisor (raw):', allSupAssignments.length, allSupAssignments.map(a => ({ id: a._id, title: a.title, status: a.status, targetStudents: a.targetStudents })));
        }

        const [assignments, submissions, marks] = await Promise.all([
            Assignment.find({
                $or: orFilters,
                status: 'Active'
            }).sort({ createdAt: -1 }),
            Submission.find({ student: req.user.id }),
            Mark.find({ student: req.user.id })
        ]);

        console.log('[ASSIGNMENT DEBUG] Final assignments returned:', assignments.length);


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
                studentSubmission: submission ? {
                    fileUrl: submission.fileUrl,
                    fileName: submission.fileName
                } : null,
                marks: mark ? {
                    siteSupervisorMarks: mark.siteSupervisorMarks,
                    siteSupervisorRemarks: mark.siteSupervisorRemarks,
                    facultyMarks: mark.facultyMarks,
                    facultyRemarks: mark.facultyRemarks,
                    isSiteSupervisorGraded: mark.isSiteSupervisorGraded,
                    isFacultyGraded: mark.isFacultyGraded
                } : null
            };
        });

        res.json(result);
    } catch (err) {
        console.error('Fetch assignments error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/student/submit-assignment/:assignmentId
// @desc    Upload assignment submission
router.post('/submit-assignment/:assignmentId', protect, uploadCloudinary.single('file'), async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const now = new Date();
        const deadline = new Date(assignment.deadline);
        const status = now <= deadline ? 'Submitted' : 'Late Submitted';

        // Check if submission already exists
        let submission = await Submission.findOne({ assignment: assignmentId, student: req.user.id });

        if (submission) {
            // Note: Old file won't be deleted automatically from Cloudinary without explicit API call, saving DB operations
            submission.fileUrl = req.file.path;
            submission.fileName = req.file.originalname;
            submission.submissionDate = now;
            submission.status = status;
        } else {
            submission = new Submission({
                assignment: assignmentId,
                student: req.user.id,
                fileUrl: req.file.path,
                fileName: req.file.originalname,
                submissionDate: now,
                status
            });
        }

        await submission.save();

        res.json({ message: 'Assignment submitted successfully', submission });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/student/submit-freelance-report
// @desc    Upload weekly summary for freelance students
router.post('/submit-freelance-report', protect, uploadCloudinary.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const user = await User.findById(req.user.id);

        const existingAssignments = await Assignment.find({
            targetStudents: user._id,
            courseTitle: 'Freelance Weekly Report'
        });

        const weekNumber = existingAssignments.length + 1;

        const assignment = new Assignment({
            title: `Weekly Report - Week ${weekNumber}`,
            courseTitle: 'Freelance Weekly Report',
            description: 'Autogenerated assignment for freelance weekly reporting',
            startDate: new Date(),
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            totalMarks: 10,
            targetStudents: [user._id],
            createdBy: user.assignedFaculty || user._id
        });
        await assignment.save();

        const submission = new Submission({
            assignment: assignment._id,
            student: user._id,
            fileUrl: req.file.path,
            fileName: req.file.originalname,
            status: 'Submitted'
        });
        await submission.save();

        const mark = new Mark({
            assignment: assignment._id,
            student: user._id,
            isSiteSupervisorGraded: true,
            siteSupervisorMarks: null,
            siteSupervisorRemarks: 'Freelance Track - Auto bypassed site supervisor',
            facultyId: user.assignedFaculty
        });
        await mark.save();

        res.json({ message: 'Freelance weekly report submitted successfully', submission });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/eligibility/:userId
// @desc    Check if a student is eligible for the internship cycle
router.get('/eligibility/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user || user.role !== 'student') {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const checks = [];
        let eligible = true;

        // 1. Eligible semester (4-8)
        const eligibleSemesters = ['4', '5', '6', '7', '8'];
        const semOk = eligibleSemesters.includes(user.semester);
        checks.push({
            key: 'semester',
            label: 'Academic Semester',
            detail: semOk
                ? `Currently in Semester ${user.semester} — eligible for internship.`
                : `Semester ${user.semester || 'N/A'} is not eligible. Internship is only available for 4th semester students and onwards.`,
            passed: semOk
        });
        if (!semOk) eligible = false;

        // 2. Account verified
        const verified = user.status !== 'unverified';
        checks.push({
            key: 'verified',
            label: 'Account Verification',
            detail: verified
                ? 'Your email address is verified and your account is active.'
                : 'Your account email is not verified. Please activate your account first.',
            passed: verified
        });
        if (!verified) eligible = false;

        // 3. CGPA (if present, must be >= 2.0)
        const cgpa = parseFloat(user.cgpa);
        const cgpaProvided = !!user.cgpa;
        const cgpaOk = !cgpaProvided || (cgpa >= 2.0 && cgpa <= 4.0);
        checks.push({
            key: 'cgpa',
            label: 'CGPA Requirement',
            detail: !cgpaProvided
                ? 'CGPA not yet entered in your profile. Please update it in Profile Settings. (Minimum: 2.00)'
                : cgpaOk
                    ? `Your CGPA is ${user.cgpa} — meets the minimum requirement of 2.00.`
                    : `Your CGPA is ${user.cgpa} — below the minimum required CGPA of 2.00.`,
            passed: cgpaOk,
            warning: !cgpaProvided
        });
        if (cgpaProvided && !cgpaOk) eligible = false;

        // 4. Registration Number
        const regOk = !!user.reg;
        checks.push({
            key: 'registration',
            label: 'Registration Number',
            detail: regOk
                ? `Registration number ${user.reg} is on record.`
                : 'No registration number found. Please contact the Internship Office.',
            passed: regOk
        });
        if (!regOk) eligible = false;

        // 5. Profile completeness (Mandatory for Phase 2 entry)
        const profileComplete = !!(user.fatherName && user.section && user.dateOfBirth && user.profilePicture);
        checks.push({
            key: 'profile',
            label: 'Profile Completeness',
            detail: profileComplete
                ? 'Your profile is complete with all required personal details.'
                : "Mandatory Profile Action: Father's Name, Section, Date of Birth, or Profile Picture is missing. Complete your profile to unlock the internship workflow.",
            passed: profileComplete,
            warning: false
        });

        // 6. Phase-based eligibility (LOCKED if Phase 3+ started and status != Assigned)
        const currentPhase = await Phase.findOne({ status: 'active' });
        const phaseOrder = currentPhase ? currentPhase.order : 1;
        let p3Eligible = true;
        let p3Detail = "The internship cycle is in preliminary stages.";

        if (phaseOrder >= 3) {
            const allowed = [
                'Assigned',
                'Internship Approved',
                'Agreement Submitted - Self',
                'Agreement Submitted - University Assigned',
                'Agreement Approved'
            ];

            if (allowed.includes(user.status)) {
                p3Detail = "Placement confirmed or pending final sign-off. You are eligible for internship tasks and evaluations.";
                p3Eligible = true;
            } else {
                p3Detail = "Internship Commenced: Unfortunately, you did not secure an approved placement before the start of Phase 3. You are ineligible to proceed.";
                p3Eligible = false;
            }
        } else {
            p3Detail = `Phase ${phaseOrder} is currently active. Please complete your placement steps to ensure eligibility for Phase 3.`;
            p3Eligible = true; // Still eligible to finish phase 1/2
        }

        checks.push({
            key: 'phase_eligibility',
            label: 'Cycle Progression Eligibility',
            detail: p3Detail,
            passed: p3Eligible
        });

        // Hard criteria are those that the student CANNOT change (Semester, Verification, CGPA, Reg)
        const hardCriteriaMet = semOk && verified && cgpaOk && regOk && p3Eligible;

        // Final eligibility is both hard criteria AND profile completion
        eligible = hardCriteriaMet && profileComplete;

        res.json({
            eligible,
            hardCriteriaMet,
            profileComplete,
            studentName: user.name,
            reg: user.reg,
            semester: user.semester,
            checks
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/my-grade
// @desc    Get the logged-in student's aggregated grade (avg of faculty marks)
router.get('/my-grade', protect, async (req, res) => {
    try {
        const marks = await Mark.find({ student: req.user.id, isFacultyGraded: true });
        if (marks.length === 0) return res.json(null);

        const totalObtained = marks.reduce((sum, m) => sum + (m.facultyMarks || 0), 0);
        const avgScore = totalObtained / marks.length;   // out of 10
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
            status
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
