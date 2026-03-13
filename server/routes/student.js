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
import { createNotification } from '../utils/notifications.js';

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

        // Notify Internship Office
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

        console.log(`[${getPKTTime()}] [STUDENT] Agreement Submitted by ${user.email}`);

        res.json({ message: 'Agreement submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/my-marks
// @desc    Get current student's marks with consolidated final scores
router.get('/my-marks', protect, async (req, res) => {
    try {
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

            // Calculate obtained marks based on track
            let obtained = 0;
            if (isFreelance) {
                obtained = m.facultyMarks || 0;
            } else {
                // Average of both if standard track
                obtained = ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2;
            }

            return {
                ...m.toObject(),
                marks: obtained, // Map the calculated score to 'marks' for frontend compatibility
                submissionFileUrl: sub?.fileUrl || null,
                submissionFileName: sub?.fileName || null,
                studentStatus: user.status
            };
        });

        res.json(consolidated);
    } catch (err) {
        console.error(err);
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
        const { fatherName, section, dateOfBirth, profilePicture, secondaryEmail, whatsappNumber, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (fatherName) user.fatherName = fatherName;
        if (section) user.section = section;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;
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
                whatsappNumber: populatedUser.whatsappNumber,

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
            try {
                const currentPhase = await Phase.findOne({ status: 'active' }).lean();
                if (currentPhase && currentPhase.order === 3) {
                    // Calculate current week boundaries in PKT (UTC+5)
                    const now = new Date();
                    const pktOffset = 5 * 60 * 60 * 1000;
                    const pktNow = new Date(now.getTime() + pktOffset);
                    
                    const day = pktNow.getUTCDay(); // 0-Sunday, 1-Monday...
                    const diffToMonday = (day === 0 ? 6 : day - 1);
                    
                    const mondayPKT = new Date(pktNow);
                    mondayPKT.setUTCDate(pktNow.getUTCDate() - diffToMonday);
                    mondayPKT.setUTCHours(0, 0, 0, 0);
                    
                    const sundayPKT = new Date(mondayPKT);
                    sundayPKT.setUTCDate(mondayPKT.getUTCDate() + 6);
                    sundayPKT.setUTCHours(18, 30, 0, 0);
                    
                    const startUTC = new Date(mondayPKT.getTime() - pktOffset);
                    let deadlineUTC = new Date(sundayPKT.getTime() - pktOffset);
                    
                    // Cap deadline if Phase 3 ends during this week
                    if (currentPhase.scheduledEndAt) {
                        const phaseEnd = new Date(currentPhase.scheduledEndAt);
                        if (phaseEnd > startUTC && phaseEnd < deadlineUTC) {
                            deadlineUTC = phaseEnd;
                        }
                    }

                    // Check if assignment exists for this student and this specific week
                    const existing = await Assignment.findOne({
                        targetStudents: user._id,
                        courseTitle: 'Freelance Weekly Report',
                        startDate: startUTC
                    });

                    if (!existing) {
                        const prevCount = await Assignment.countDocuments({
                            targetStudents: user._id,
                            courseTitle: 'Freelance Weekly Report'
                        });

                        const newAssignment = new Assignment({
                            title: `Weekly Report - Week ${prevCount + 1}`,
                            courseTitle: 'Freelance Weekly Report',
                            description: 'Weekly progress summary for freelance track. Subject to automatic Monday-Sunday 18:30 (PKT) deadline.',
                            startDate: startUTC,
                            deadline: deadlineUTC,
                            totalMarks: 10,
                            targetStudents: [user._id],
                            createdBy: user.assignedFaculty || user._id
                        });
                        await newAssignment.save();

                        // Auto-create mark record for faculty grading
                        await new Mark({
                            assignment: newAssignment._id,
                            student: user._id,
                            isSiteSupervisorGraded: true,
                            siteSupervisorMarks: null,
                            siteSupervisorRemarks: 'Freelance Track - Auto bypassed site supervisor',
                            facultyId: user.assignedFaculty
                        }).save();
                        
                        console.log(`[FREELANCE] Auto-generated assignment for ${user.email} (Week ${prevCount + 1})`);
                    }
                }
            } catch (err) {
                console.error('Freelance auto-gen error:', err);
            }
            orFilters.push({ targetStudents: user._id, courseTitle: 'Freelance Weekly Report' });
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
        
        // Find the currently active/open freelance assignment
        const now = new Date();
        const assignment = await Assignment.findOne({
            targetStudents: user._id,
            courseTitle: 'Freelance Weekly Report',
            startDate: { $lte: now },
            deadline: { $gte: now }
        });

        if (!assignment) {
            return res.status(400).json({ 
                message: 'No active freelance assignment found for this week. Please ensure you are within the Monday-Sunday 18:30 window.' 
            });
        }

        // Check if submission already exists
        let submission = await Submission.findOne({ assignment: assignment._id, student: user._id });

        if (submission) {
            submission.fileUrl = req.file.path;
            submission.fileName = req.file.originalname;
            submission.submissionDate = now;
            submission.status = 'Submitted';
        } else {
            submission = new Submission({
                assignment: assignment._id,
                student: user._id,
                fileUrl: req.file.path,
                fileName: req.file.originalname,
                status: 'Submitted',
                submissionDate: now
            });
        }

        await submission.save();

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
        // Use .lean() for faster read-only access
        const user = await User.findById(req.params.userId).lean();
        if (!user || user.role !== 'student') {
            return res.status(404).json({ message: 'Student not found.' });
        }

        // Parallelize Phase lookup with other potential future lookups
        const currentPhase = await Phase.findOne({ status: 'active' }).lean();
        const phaseOrder = currentPhase ? currentPhase.order : 1;

        const checks = [];
        let eligible = true;

        // 1. Eligible semester (4-8) - Optimized with Set for O(1) lookups
        const eligibleSemesters = new Set(['4', '5', '6', '7', '8']);
        const semOk = eligibleSemesters.has(user.semester);
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
        const cgpaVal = parseFloat(user.cgpa);
        const cgpaProvided = !!user.cgpa;
        const cgpaOk = !cgpaProvided || (cgpaVal >= 2.0 && cgpaVal <= 4.0);
        checks.push({
            key: 'cgpa',
            label: 'CGPA Requirement',
            detail: !cgpaProvided
                ? 'CGPA not yet entered in your profile. Minimum: 2.00 required.'
                : cgpaOk
                    ? `Your CGPA is ${user.cgpa} — meets requirement.`
                    : `Your CGPA is ${user.cgpa} — below the minimum required 2.00.`,
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
                : 'No registration number found.',
            passed: regOk
        });
        if (!regOk) eligible = false;

        // 5. Profile completeness (Mandatory for Phase 2 entry)
        const profileComplete = !!(user.fatherName && user.section && user.dateOfBirth && user.profilePicture);
        checks.push({
            key: 'profile',
            label: 'Profile Completeness',
            detail: profileComplete
                ? 'Your profile is complete.'
                : "Profile missing: Father's Name, Section, DOB, or Picture.",
            passed: profileComplete,
            warning: false
        });

        // 6. Phase-based eligibility
        let p3Eligible = true;
        let p3Detail = "Internship cycle is in early stages.";

        if (phaseOrder >= 3) {
            const allowedStatuses = new Set([
                'Assigned',
                'Internship Approved',
                'Agreement Submitted - Self',
                'Agreement Submitted - University Assigned',
                'Agreement Approved'
            ]);

            if (allowedStatuses.has(user.status)) {
                p3Detail = "Placement confirmed. Eligible for Phase 3.";
                p3Eligible = true;
            } else {
                p3Detail = "Ineligible: No approved placement secured before Phase 3.";
                p3Eligible = false;
            }
        } else {
            p3Detail = `Phase ${phaseOrder} is active. Complete placement steps for Phase 3.`;
            p3Eligible = true;
        }

        checks.push({
            key: 'phase_eligibility',
            label: 'Cycle Progression',
            detail: p3Detail,
            passed: p3Eligible
        });

        const hardCriteriaMet = semOk && verified && cgpaOk && regOk && p3Eligible;
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
        console.error('Eligibility check error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/my-grade
// @desc    Get the logged-in student's aggregated grade (avg of faculty marks)
router.get('/my-grade', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const marks = await Mark.find({ student: req.user.id, isFacultyGraded: true });
        if (marks.length === 0) return res.json(null);

        const isFreelance = user.internshipRequest?.mode === 'Freelance' || (!user.assignedSiteSupervisor && !user.assignedCompanySupervisor);

        // Task Score = (Site + Faculty) / 2 OR Faculty if Freelance
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
            status
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
