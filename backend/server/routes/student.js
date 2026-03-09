import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import Mark from '../models/Mark.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
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
        const marks = await Mark.find({ student: req.user.id })
            .populate('assignment', 'title deadline totalMarks status')
            .sort({ createdAt: -1 });
        res.json(marks);
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
        if (!user.assignedFaculty) {
            return res.json([]);
        }

        const assignments = await Assignment.find({
            createdBy: user.assignedFaculty,
            status: 'Active',
            startDate: { $lte: new Date() }
        }).sort({ startDate: -1 });

        // Get submissions for these assignments
        const submissions = await Submission.find({ student: req.user.id });

        const result = assignments.map(assignment => {
            const submission = submissions.find(s => s.assignment.toString() === assignment._id.toString());
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
                } : null
            };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
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

        // Hard criteria are those that the student CANNOT change (Semester, Verification, CGPA, Reg)
        const hardCriteriaMet = semOk && verified && cgpaOk && regOk;

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

export default router;
