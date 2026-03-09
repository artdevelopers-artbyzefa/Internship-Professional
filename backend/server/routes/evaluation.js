import express from 'express';
import User from '../models/User.js';
import Evaluation from '../models/Evaluation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Role Check Helper
const isGradingEntity = (req, res, next) => {
    if (!['faculty_supervisor', 'site_supervisor', 'internship_office'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. You do not have grading permissions.' });
    }
    next();
};

// @route   GET api/evaluation/students
// @desc    Get assigned students for the current evaluator
router.get('/students', protect, isGradingEntity, async (req, res) => {
    try {
        let query = { role: 'student' };

        if (req.user.role === 'faculty_supervisor') {
            query.assignedFaculty = req.user.id;
        } else if (req.user.role === 'site_supervisor') {
            const userEmail = req.user.email.toLowerCase().trim();
            const nameRegex = new RegExp(req.user.name.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
            query.$or = [
                { assignedCompanySupervisorEmail: userEmail },
                { 'internshipRequest.siteSupervisorEmail': userEmail },
                { 'internshipAgreement.companySupervisorEmail': userEmail },
                { assignedCompanySupervisor: { $regex: nameRegex } }
            ];
        }

        const students = await User.find(query).select('name reg email semester assignedCompany status');

        // Fetch evaluations for these students by this evaluator
        const evaluations = await Evaluation.find({
            gradedBy: req.user.id
        });

        const result = students.map(s => {
            const evalEntry = evaluations.find(e => e.student.toString() === s._id.toString());
            return {
                _id: s._id,
                name: s.name,
                reg: s.reg,
                company: s.assignedCompany || 'N/A',
                status: s.status,
                evaluationStatus: evalEntry ? evalEntry.status : 'Pending',
                isGraded: !!evalEntry
            };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/evaluation/:studentId
// @desc    Get evaluation for a specific student by current evaluator
router.get('/:studentId', protect, isGradingEntity, async (req, res) => {
    try {
        const evaluation = await Evaluation.findOne({
            student: req.params.studentId,
            gradedBy: req.user.id
        });
        res.json(evaluation || null);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/evaluation/submit
// @desc    Submit or update evaluation marks
router.post('/submit', protect, isGradingEntity, async (req, res) => {
    try {
        const { studentId, marks, comments, finalize } = req.body;

        if (!studentId || !marks) {
            return res.status(400).json({ message: 'Student ID and marks are required.' });
        }

        const totalMarks = Object.values(marks).reduce((sum, val) => sum + (Number(val) || 0), 0);
        const source = req.user.role === 'site_supervisor' ? 'site_supervisor' : 'faculty';

        let evaluation = await Evaluation.findOne({
            student: studentId,
            gradedBy: req.user.id
        });

        if (evaluation && evaluation.status === 'Approved') {
            return res.status(403).json({ message: 'Evaluation is already approved and locked.' });
        }

        if (evaluation) {
            evaluation.marks = marks;
            evaluation.totalMarks = totalMarks;
            evaluation.comments = comments;
            if (finalize) {
                evaluation.status = 'Submitted';
                evaluation.submittedAt = new Date();
            }
        } else {
            evaluation = new Evaluation({
                student: studentId,
                gradedBy: req.user.id,
                source,
                marks,
                totalMarks,
                comments,
                status: finalize ? 'Submitted' : 'Draft',
                submittedAt: finalize ? new Date() : null
            });
            if (req.user.role === 'faculty_supervisor') evaluation.faculty = req.user.id;
            if (req.user.role === 'site_supervisor') evaluation.siteSupervisor = req.user.id;
        }

        await evaluation.save();
        res.json({ message: 'Evaluation saved successfully', evaluation });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
