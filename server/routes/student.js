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

const router = express.Router();

// Multer Setup for Student Submissions
const submissionStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/submissions';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `student-${Date.now()}-${file.originalname}`);
    }
});
const uploadSubmission = multer({
    storage: submissionStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST api/student/submit-request
// @desc    Submit Internship Approval Form
router.post('/submit-request', async (req, res) => {
    try {
        const { userId, internshipType, companyName, duration, startDate, endDate, mode, description } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.internshipRequest = {
            type: internshipType,
            companyName: internshipType === 'Self' ? companyName : 'University Assigned',
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
        const { fatherName, section, dateOfBirth, profilePicture } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (fatherName) user.fatherName = fatherName;
        if (section) user.section = section;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (profilePicture) user.profilePicture = profilePicture;

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
router.post('/submit-assignment/:assignmentId', protect, uploadSubmission.single('file'), async (req, res) => {
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
            // Delete old file if updating
            const oldPath = submission.fileUrl.startsWith('/') ? submission.fileUrl.substring(1) : submission.fileUrl;
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

            submission.fileUrl = `/uploads/submissions/${req.file.filename}`;
            submission.fileName = req.file.originalname;
            submission.submissionDate = now;
            submission.status = status;
        } else {
            submission = new Submission({
                assignment: assignmentId,
                student: req.user.id,
                fileUrl: `/uploads/submissions/${req.file.filename}`,
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

export default router;
