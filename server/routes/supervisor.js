import express from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Mark from '../models/Mark.js';
import Submission from '../models/Submission.js';
import { protect } from '../middleware/auth.js';
import { uploadCloudinary } from '../utils/cloudinary.js';
import { createNotification } from '../utils/notifications.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const isSiteSupervisor = (req, res, next) => {
    if (req.user.role !== 'site_supervisor') return res.status(403).json({ message: 'Access denied.' });
    next();
};

/**
 * @swagger
 * tags:
 *   name: Supervisor
 *   description: Industrial / Site supervisor operational management
 */

/**
 * @swagger
 * /supervisor/pending-grading:
 *   get:
 *     summary: Retrieve list of student submissions awaiting industrial evaluation
 *     tags: [Supervisor]
 */
router.get('/pending-grading', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 5, skip = (page - 1) * limit;
    const userEmail = req.user.email.toLowerCase(), nameRegex = new RegExp(req.user.name.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

    const students = await User.find({ role: 'student', $or: [{ assignedSiteSupervisor: req.user._id }, { assignedCompanySupervisorEmail: userEmail }, { 'internshipRequest.siteSupervisorEmail': userEmail }, { 'internshipAgreement.companySupervisorEmail': userEmail }, { assignedCompanySupervisor: { $regex: nameRegex } }] }).select('_id').lean();
    const studentIds = students.map(s => s._id);
    const query = { student: { $in: studentIds }, isSiteSupervisorGraded: false };

    const [count, marks] = await Promise.all([Mark.countDocuments(query), Mark.find(query).populate('student', 'name reg').populate('assignment', 'title').limit(limit).skip(skip).sort({ createdAt: -1 }).lean()]);
    res.json({ data: marks, total: count, page, pages: Math.ceil(count / limit) });
}));

/**
 * @swagger
 * /supervisor/profile:
 *   get:
 *     summary: Retrieve administrative profile and associated company metrics
 *     tags: [Supervisor]
 */
router.get('/profile', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const mail = user.email.toLowerCase(), nameRegex = new RegExp(user.name.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

    const [company, count, interns] = await Promise.all([
        Company.findOne({ 'siteSupervisors.email': mail }),
        User.countDocuments({ role: 'student', $or: [{ assignedSiteSupervisor: user._id }, { assignedCompanySupervisorEmail: mail }, { 'internshipRequest.siteSupervisorEmail': mail }, { 'internshipAgreement.companySupervisorEmail': mail }, { assignedCompanySupervisor: { $regex: nameRegex } }], status: { $nin: ['unverified', 'verified', 'Internship Request Submitted'] } }),
        User.find({ role: 'student', $or: [{ assignedSiteSupervisor: user._id }, { assignedCompanySupervisorEmail: mail }, { 'internshipRequest.siteSupervisorEmail': mail }, { 'internshipAgreement.companySupervisorEmail': mail }, { assignedCompanySupervisor: { $regex: nameRegex } }], status: { $nin: ['unverified', 'verified', 'Internship Request Submitted'] } }).select('name reg status profilePicture').limit(10)
    ]);

    res.json({ user, company, stats: { studentCount: count, assignmentCount: await Assignment.countDocuments({ createdBy: user._id }) }, interns });
}));

/**
 * @swagger
 * /supervisor/update-phone:
 *   post:
 *     summary: Update contact information for the site supervisor
 *     tags: [Supervisor]
 */
router.post('/update-phone', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const { whatsappNumber } = req.body;
    if (!whatsappNumber) return res.status(400).json({ message: 'WhatsApp number required.' });

    const user = await User.findById(req.user.id);
    user.whatsappNumber = whatsappNumber; await user.save();

    const company = await Company.findOne({ 'siteSupervisors.email': user.email.toLowerCase() });
    if (company) {
        const idx = company.siteSupervisors.findIndex(s => s.email.toLowerCase() === user.email.toLowerCase());
        if (idx > -1) { company.siteSupervisors[idx].whatsappNumber = whatsappNumber; await company.save(); }
    }
    res.json({ message: 'Updated.', whatsappNumber: user.whatsappNumber });
}));

/**
 * @swagger
 * /supervisor/interns:
 *   get:
 *     summary: List all active interns currently assigned to this supervisor
 *     tags: [Supervisor]
 */
router.get('/interns', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const mail = req.user.email.toLowerCase().trim(), nameRegex = new RegExp(req.user.name.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    res.json(await User.find({ role: 'student', $or: [{ assignedSiteSupervisor: req.user.id }, { assignedCompanySupervisorEmail: mail }, { 'internshipRequest.siteSupervisorEmail': mail }, { 'internshipAgreement.companySupervisorEmail': mail }, { assignedCompanySupervisor: { $regex: nameRegex } }], status: { $nin: ['unverified', 'verified', 'Internship Request Submitted'] } }).select('name reg status profilePicture internshipRequest'));
}));

/**
 * @swagger
 * /supervisor/assignments:
 *   get:
 *     summary: Retrieve tasks and assignments created by the supervisor
 *     tags: [Supervisor]
 *   post:
 *     summary: Create a new technical task for assigned interns
 *     tags: [Supervisor]
 */
router.get('/assignments', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    res.json(await Assignment.find({ createdBy: req.user.id }));
}));

router.post('/assignments', protect, isSiteSupervisor, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    const { title, description, startDate, deadline, targetStudents } = req.body;
    const targets = Array.isArray(targetStudents) ? targetStudents : (targetStudents ? [targetStudents] : []);
    const a = new Assignment({ title, description, startDate, deadline, totalMarks: 10, targetStudents: targets, fileUrl: req.file ? req.file.path : null, createdBy: req.user.id, courseTitle: 'Technical Task' });
    await a.save();

    for (const s of targets) {
        await createNotification({ recipient: s, sender: req.user.id, type: 'assignment_submission', title: 'New Task', message: `${req.user.name} posted: "${title}".`, link: '/student/assignments' });
    }
    res.status(201).json(a);
}));

/**
 * @swagger
 * /supervisor/grade:
 *   post:
 *     summary: Record grading scores for a specific student submission
 *     tags: [Supervisor]
 */
router.post('/grade', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const { studentId, assignmentId, marks, remarks, criteria } = req.body;
    let m = await Mark.findOne({ student: studentId, assignment: assignmentId });
    if (!m) m = new Mark({ student: studentId, assignment: assignmentId, siteSupervisorId: req.user.id });

    Object.assign(m, { siteSupervisorMarks: marks, siteSupervisorRemarks: remarks, siteSupervisorCriteria: criteria || {}, isSiteSupervisorGraded: true });
    m.history.push({ marks, remarks, updatedBy: req.user.id, role: 'site_supervisor' });
    await m.save();

    const a = await Assignment.findById(assignmentId);
    await createNotification({ recipient: studentId, sender: req.user.id, type: 'assignment_submission', title: 'Task Graded', message: `Site supervisor graded "${a?.title || 'task'}".`, link: '/student/marks' });
    res.json(m);
}));

/**
 * @swagger
 * /supervisor/weekly-evaluations/{studentId}:
 *   get:
 *     summary: Retrieve historical weekly performance for a specific student
 *     tags: [Supervisor]
 *   post:
 *     summary: Submit bulk weekly performance evaluations
 *     tags: [Supervisor]
 */
router.get('/weekly-evaluations/:studentId', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const [marks, submissions] = await Promise.all([Mark.find({ student: req.params.studentId }).populate('assignment', 'title totalMarks deadline fileUrl'), Submission.find({ student: req.params.studentId }).select('assignment fileUrl fileName')]);
    res.json(marks.filter(m => m.assignment).map(m => ({ ...m.toObject(), submission: submissions.find(s => s.assignment.toString() === m.assignment._id.toString()) || null })));
}));

router.post('/weekly-evaluations/:studentId', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const { grades } = req.body;
    for (const g of grades) {
        if (!g.markId || g.siteSupervisorMarks == null) continue;
        const m = await Mark.findById(g.markId);
        if (m && m.student.toString() === req.params.studentId) {
            Object.assign(m, { siteSupervisorMarks: Number(g.siteSupervisorMarks), siteSupervisorRemarks: g.remarks || m.siteSupervisorRemarks, isSiteSupervisorGraded: true, siteSupervisorId: req.user.id });
            m.history.push({ marks: Number(g.siteSupervisorMarks), remarks: g.remarks, role: 'site_supervisor', updatedBy: req.user.id });
            await m.save();
            await createNotification({ recipient: req.params.studentId, sender: req.user.id, type: 'assignment_submission', title: 'Task Evaluated', message: `Task evaluated by site supervisor ${req.user.name}.`, link: '/student/marks' });
        }
    }
    res.json({ message: 'Grades updated.' });
}));

/**
 * @swagger
 * /supervisor/upload-certificate/{studentId}:
 *   post:
 *     summary: Finalize internship by uploading the official completion certificate
 *     tags: [Supervisor]
 */
router.post('/upload-certificate/:studentId', protect, isSiteSupervisor, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Missing file.' });
    const s = await User.findById(req.params.studentId);
    if (!s) return res.status(404).json({ message: 'Student not found.' });

    s.certificateUrl = req.file.path; await s.save();
    await createNotification({ recipient: s._id, sender: req.user.id, type: 'assignment_submission', title: 'Official Certificate Uploaded', message: `${req.user.name} has uploaded your completion certificate.`, link: '/student/results' });
    res.json({ message: 'Certificate uploaded successfully.', certificateUrl: s.certificateUrl });
}));

export default router;
