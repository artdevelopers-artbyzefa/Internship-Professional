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

const getGrade = (pct) => {
    if (pct >= 85) return { grade: 'A', status: 'Pass' };
    if (pct >= 80) return { grade: 'A-', status: 'Pass' };
    if (pct >= 75) return { grade: 'B+', status: 'Pass' };
    if (pct >= 71) return { grade: 'B', status: 'Pass' };
    if (pct >= 68) return { grade: 'B-', status: 'Pass' };
    if (pct >= 64) return { grade: 'C+', status: 'Pass' };
    if (pct >= 61) return { grade: 'C', status: 'Pass' };
    if (pct >= 58) return { grade: 'C-', status: 'Pass' };
    if (pct >= 54) return { grade: 'D+', status: 'Pass' };
    if (pct >= 50) return { grade: 'D', status: 'Pass' };
    return { grade: 'F', status: 'Fail' };
};

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

/**
 * @swagger
 * /supervisor/submissions/{assignmentId}:
 *   get:
 *     summary: Retrieve submissions for a specific assignment for students assigned to this supervisor
 *     tags: [Supervisor]
 */
router.get('/submissions/:assignmentId', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const userEmail = req.user.email.toLowerCase(), nameRegex = new RegExp(req.user.name.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

    const students = await User.find({
        role: 'student',
        $or: [
            { assignedSiteSupervisor: req.user._id },
            { assignedCompanySupervisorEmail: userEmail },
            { 'internshipRequest.siteSupervisorEmail': userEmail },
            { 'internshipAgreement.companySupervisorEmail': userEmail },
            { assignedCompanySupervisor: { $regex: nameRegex } }
        ]
    }).select('_id name reg profilePicture').lean();

    const studentIds = students.map(s => s._id);
    const [submissions, marks] = await Promise.all([
        Submission.find({ assignment: assignmentId, student: { $in: studentIds } }).lean(),
        Mark.find({ assignment: assignmentId, student: { $in: studentIds } }).lean()
    ]);

    const result = students.map(s => {
        const sub = submissions.find(submission => submission.student.toString() === s._id.toString());
        const m = marks.find(mark => mark.student.toString() === s._id.toString());
        return {
            _id: sub?._id || `temp-${s._id}`,
            user: s,
            fileUrl: sub?.fileUrl,
            fileName: sub?.fileName,
            marks: m || null
        };
    });

    res.json(result);
}));

/**
 * @swagger
 * /supervisor/student-grades:
 *   get:
 *     summary: Retrieve summary of student grades for the supervisor
 *     tags: [Supervisor]
 */
router.get('/student-grades', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 5, skip = (page - 1) * limit;
    const userEmail = req.user.email.toLowerCase(), nameRegex = new RegExp(req.user.name.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

    const studentQuery = {
        role: 'student',
        $or: [
            { assignedSiteSupervisor: req.user._id },
            { assignedCompanySupervisorEmail: userEmail },
            { 'internshipRequest.siteSupervisorEmail': userEmail },
            { 'internshipAgreement.companySupervisorEmail': userEmail },
            { assignedCompanySupervisor: { $regex: nameRegex } }
        ]
    };

    const total = await User.countDocuments(studentQuery);
    const students = await User.find(studentQuery).select('name reg').skip(skip).limit(limit).lean();

    const data = await Promise.all(students.map(async (s) => {
        const marks = await Mark.find({ student: s._id });
        if (!marks.length) {
            return { student: s, assignmentsCount: 0, averageMarks: null, percentage: null, grade: 'N/A', status: 'Pending' };
        }

        const gradedMarks = marks.filter(m => m.isSiteSupervisorGraded || m.isFacultyGraded);
        let avg = 0;
        if(gradedMarks.length > 0) {
            avg = gradedMarks.reduce((acc, m) => {
                let sum = 0, c = 0;
                if (m.isSiteSupervisorGraded) { sum += m.siteSupervisorMarks || 0; c++; }
                if (m.isFacultyGraded) { sum += m.facultyMarks || 0; c++; }
                return acc + (c ? sum / c : 0);
            }, 0) / gradedMarks.length;
        }

        const pct = Math.round((avg / 10) * 100);
        const { grade, status } = getGrade(pct);

        return {
            student: s,
            assignmentsCount: marks.length,
            averageMarks: avg.toFixed(1),
            percentage: pct,
            grade,
            status
        };
    }));

    res.json({ data, total, page, pages: Math.ceil(total / limit) });
}));

/**
 * @swagger
 * /supervisor/certificate-students:
 *   get:
 *     summary: Retrieve students needing certificates
 *     tags: [Supervisor]
 */
router.get('/certificate-students', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const userEmail = req.user.email.toLowerCase(), nameRegex = new RegExp(req.user.name.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

    const students = await User.find({
        role: 'student',
        $or: [
            { assignedSiteSupervisor: req.user._id },
            { assignedCompanySupervisorEmail: userEmail },
            { 'internshipRequest.siteSupervisorEmail': userEmail },
            { 'internshipAgreement.companySupervisorEmail': userEmail },
            { assignedCompanySupervisor: { $regex: nameRegex } }
        ]
    }).lean();

    const data = await Promise.all(students.map(async (s) => {
        const marks = await Mark.find({ student: s._id });
        const gradedMarks = marks.filter(m => m.isSiteSupervisorGraded || m.isFacultyGraded);
        let avgNum = 0;
        if(gradedMarks.length > 0) {
            avgNum = gradedMarks.reduce((acc, m) => {
                let sum = 0, c = 0;
                if (m.isSiteSupervisorGraded) { sum += m.siteSupervisorMarks || 0; c++; }
                if (m.isFacultyGraded) { sum += m.facultyMarks || 0; c++; }
                return acc + (c ? sum / c : 0);
            }, 0) / gradedMarks.length;
        }
        
        const pct = Math.round((avgNum / 10) * 100);
        const { grade } = getGrade(pct);

        return {
            _id: s._id,
            name: s.name,
            reg: s.reg,
            company: s.assignedCompany || (s.internshipRequest?.companyName) || 'Assigned Company',
            mode: s.internshipRequest?.mode || 'Onsite',
            grade: marks.length ? grade : 'N/A',
            percentage: pct,
            certificateUrl: s.certificateUrl
        };
    }));

    res.json(data);
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

router.delete('/assignments/:id', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const a = await Assignment.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!a) return res.status(404).json({ message: 'Assignment not found.' });
    await Submission.deleteMany({ assignment: req.params.id });
    await Mark.deleteMany({ assignment: req.params.id });
    res.json({ message: 'Assignment deleted successfully.' });
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
