import express from 'express';
import User from '../models/User.js';
import Evaluation from '../models/Evaluation.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Role Check Helper
const isGradingEntity = (req, res, next) => {
    if (!['faculty_supervisor', 'site_supervisor', 'internship_office'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. You do not have grading permissions.' });
    }
    next();
};

// @route   GET api/evaluation/students
router.get('/students', protect, isGradingEntity, asyncHandler(async (req, res) => {
    let query = { role: 'student' };

    if (req.user.role === 'faculty_supervisor') {
        query.assignedFaculty = req.user.id;
    } else if (req.user.role === 'site_supervisor') {
        const userEmail = req.user.email.toLowerCase().trim();
        const escapeRegex = (s) => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
        const nameRegex = new RegExp(escapeRegex(req.user.name.trim()), 'i');
        query.$or = [
            { assignedSiteSupervisor: req.user.id },
            { assignedCompanySupervisorEmail: userEmail },
            { 'internshipRequest.siteSupervisorEmail': userEmail },
            { 'internshipAgreement.companySupervisorEmail': userEmail },
            { assignedCompanySupervisor: { $regex: nameRegex } }
        ];
    }

    const students = await User.find(query).select('name reg email semester assignedCompany status');
    const evaluations = await Evaluation.find({ gradedBy: req.user.id });

    const result = students.map(s => {
        const evalEntry = evaluations.find(e => e.student.toString() === s._id.toString());
        return {
            _id: s._id, name: s.name, reg: s.reg, company: s.assignedCompany || 'N/A', status: s.status,
            evaluationStatus: evalEntry ? evalEntry.status : 'Pending', isGraded: !!evalEntry
        };
    });

    res.json(result);
}));

// @route   GET api/evaluation/:studentId
router.get('/:studentId', protect, isGradingEntity, asyncHandler(async (req, res) => {
    const [evaluation, siteEval] = await Promise.all([
        Evaluation.findOne({ student: req.params.studentId, gradedBy: req.user.id }),
        req.user.role === 'faculty_supervisor' ? Evaluation.findOne({ student: req.params.studentId, source: 'site_supervisor' }) : null
    ]);
    res.json({ evaluation, siteEval });
}));

// @route   POST api/evaluation/submit
router.post('/submit', protect, isGradingEntity, asyncHandler(async (req, res) => {
    const { studentId, marks, checkboxTasks, comments, finalize } = req.body;
    if (!studentId || !marks) return res.status(400).json({ message: 'Student ID and marks are required.' });

    const totalMarks = Object.values(marks).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const source = req.user.role === 'site_supervisor' ? 'site_supervisor' : 'faculty';

    let evaluation = await Evaluation.findOne({ student: studentId, gradedBy: req.user.id });
    if (evaluation && evaluation.status === 'Approved') return res.status(403).json({ message: 'Evaluation locked.' });

    if (evaluation) {
        evaluation.marks = marks;
        evaluation.checkboxTasks = checkboxTasks || evaluation.checkboxTasks;
        evaluation.totalMarks = totalMarks;
        evaluation.comments = comments;
        if (finalize) { evaluation.status = 'Submitted'; evaluation.submittedAt = new Date(); }
    } else {
        evaluation = new Evaluation({
            student: studentId, gradedBy: req.user.id, source, marks, totalMarks, comments,
            checkboxTasks: checkboxTasks || {}, status: finalize ? 'Submitted' : 'Draft',
            submittedAt: finalize ? new Date() : null
        });
        if (req.user.role === 'faculty_supervisor') evaluation.faculty = req.user.id;
        if (req.user.role === 'site_supervisor') evaluation.siteSupervisor = req.user.id;
    }

    await evaluation.save();
    res.json({ message: 'Evaluation saved successfully', evaluation });
}));

export default router;
