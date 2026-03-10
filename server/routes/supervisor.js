import express from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Mark from '../models/Mark.js';
import { protect } from '../middleware/auth.js';
import { uploadCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// @route   GET api/supervisor/profile
// @desc    Get supervisor profile with company details and counts
router.get('/profile', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const userEmail = user.email.toLowerCase();
        const escapeRegex = (s) => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
        const nameRegex = new RegExp(escapeRegex(user.name.trim()), 'i');

        const [company, studentCount, interns] = await Promise.all([
            Company.findOne({ 'siteSupervisors.email': userEmail }),
            User.countDocuments({
                role: 'student',
                $or: [
                    { assignedSiteSupervisor: user._id },
                    { assignedCompanySupervisorEmail: userEmail },
                    { 'internshipRequest.siteSupervisorEmail': userEmail },
                    { 'internshipAgreement.companySupervisorEmail': userEmail },
                    { assignedCompanySupervisor: { $regex: nameRegex } }
                ]
            }),
            User.find({
                role: 'student',
                $or: [
                    { assignedSiteSupervisor: user._id },
                    { assignedCompanySupervisorEmail: userEmail },
                    { 'internshipRequest.siteSupervisorEmail': userEmail },
                    { 'internshipAgreement.companySupervisorEmail': userEmail },
                    { assignedCompanySupervisor: { $regex: nameRegex } }
                ]
            }).select('name reg status profilePicture').limit(10) // Limit to 10 for dashboard preview
        ]);

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                whatsappNumber: user.whatsappNumber,
                role: user.role,
                status: user.status
            },
            company: company ? {
                id: company._id,
                name: company.name,
                regNo: company.regNo,
                scope: company.scope
            } : null,
            stats: {
                studentCount,
                assignmentCount: await Assignment.countDocuments({ createdBy: user._id })
            },
            interns
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/supervisor/update-phone
router.post('/update-phone', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { whatsappNumber } = req.body;
        if (!whatsappNumber) {
            return res.status(400).json({ message: 'WhatsApp number is required.' });
        }

        const user = await User.findById(req.user.id);
        user.whatsappNumber = whatsappNumber;
        await user.save();

        const company = await Company.findOne({ 'siteSupervisors.email': user.email.toLowerCase() });
        if (company) {
            const supervisorIndex = company.siteSupervisors.findIndex(s => s.email.toLowerCase() === user.email.toLowerCase());
            if (supervisorIndex > -1) {
                company.siteSupervisors[supervisorIndex].whatsappNumber = whatsappNumber;
                await company.save();
            }
        }

        res.json({ message: 'Phone number updated successfully.', whatsappNumber: user.whatsappNumber });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/supervisor/interns
router.get('/interns', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const userEmail = req.user.email.toLowerCase().trim();
        const escapeRegex = (s) => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
        const nameRegex = new RegExp(escapeRegex(req.user.name.trim()), 'i');

        const students = await User.find({
            role: 'student',
            $or: [
                { assignedSiteSupervisor: req.user.id },
                { assignedCompanySupervisorEmail: userEmail },
                { 'internshipRequest.siteSupervisorEmail': userEmail },
                { 'internshipAgreement.companySupervisorEmail': userEmail },
                { assignedCompanySupervisor: { $regex: nameRegex } }
            ]
        }).select('name reg status profilePicture');

        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/supervisor/my-students
router.get('/my-students', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const students = await User.find({
            assignedSiteSupervisor: req.user.id,
            role: 'student'
        });

        const result = students.map(s => {
            const isFreelance = s.internshipRequest?.mode === 'Freelance';
            const platform = s.internshipRequest?.freelancePlatform;
            return {
                id: s._id,
                name: s.name,
                reg: s.reg,
                isFreelance,
                company: isFreelance
                    ? `Freelancing${platform ? ` (${platform})` : ''}`
                    : (s.assignedCompany || s.internshipAgreement?.companyName || 'Not Assigned'),
                status: s.status
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/supervisor/assignments
router.get('/assignments', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const assignments = await Assignment.find({ createdBy: req.user.id });
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/supervisor/assignments
router.post('/assignments', protect, uploadCloudinary.single('file'), async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { title, description, startDate, deadline, totalMarks, targetStudents } = req.body;

        // Handle targetStudents which might come as an array or single string from FormData
        let students = [];
        const rawTarget = targetStudents || req.body['targetStudents[]'];
        if (rawTarget) {
            students = Array.isArray(rawTarget) ? rawTarget : [rawTarget];
        }

        const assignment = new Assignment({
            title,
            description,
            startDate,
            deadline,
            totalMarks,
            targetStudents: students,
            fileUrl: req.file ? req.file.path : null,
            createdBy: req.user.id,
            courseTitle: 'Industrial Task'
        });

        await assignment.save();
        res.status(201).json(assignment);
    } catch (err) {
        console.error('Assignment error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/supervisor/submissions/:assignmentId
router.get('/submissions/:assignmentId', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const assignment = await Assignment.findById(req.params.assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

        // Fetch submissions and marks for this assignment
        const [submissions, marks] = await Promise.all([
            import('../models/Submission.js').then(m => m.default.find({ assignment: assignment._id }).populate('student', 'name reg profilePicture')),
            Mark.find({ assignment: assignment._id })
        ]);

        const data = submissions.map(sub => {
            const mark = marks.find(m => m.student.toString() === sub.student._id.toString());
            return {
                _id: sub._id,
                user: sub.student, // Mapping student to user field for frontend compatibility
                fileUrl: sub.fileUrl,
                submittedAt: sub.createdAt,
                marks: mark || null
            };
        });

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/supervisor/grade
router.post('/grade', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { studentId, assignmentId, marks, remarks, criteria } = req.body;

        let mark = await Mark.findOne({ student: studentId, assignment: assignmentId });

        if (!mark) {
            mark = new Mark({
                student: studentId,
                assignment: assignmentId,
                siteSupervisorId: req.user.id
            });
        }

        mark.siteSupervisorMarks = marks;
        mark.siteSupervisorRemarks = remarks;
        mark.siteSupervisorCriteria = criteria || {};
        mark.isSiteSupervisorGraded = true;
        mark.history.push({
            marks,
            remarks,
            updatedBy: req.user.id,
            role: 'site_supervisor'
        });

        await mark.save();
        res.json(mark);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE api/supervisor/assignments/:id
router.delete('/assignments/:id', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found or unauthorized.' });
        }

        const Submission = await import('../models/Submission.js').then(m => m.default);

        // Purge all associated data
        await Promise.all([
            Assignment.findByIdAndDelete(assignment._id),
            Submission.deleteMany({ assignment: assignment._id }),
            Mark.deleteMany({ assignment: assignment._id })
        ]);

        res.json({ message: 'Assignment and all associated submissions/marks purged successfully.' });
    } catch (err) {
        console.error('Delete assignment error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
