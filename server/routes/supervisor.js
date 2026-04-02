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

// Role Check Middleware
const isSiteSupervisor = (req, res, next) => {
    if (req.user.role !== 'site_supervisor') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    next();
};

// @route   GET api/supervisor/profile
router.get('/profile', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
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
            ],
            status: { $nin: ['unverified', 'verified', 'Internship Request Submitted'] }
        }),
        User.find({
            role: 'student',
            $or: [
                { assignedSiteSupervisor: user._id },
                { assignedCompanySupervisorEmail: userEmail },
                { 'internshipRequest.siteSupervisorEmail': userEmail },
                { 'internshipAgreement.companySupervisorEmail': userEmail },
                { assignedCompanySupervisor: { $regex: nameRegex } }
            ],
            status: { $nin: ['unverified', 'verified', 'Internship Request Submitted'] }
        }).select('name reg status profilePicture').limit(10)
    ]);

    res.json({
        user: { id: user._id, name: user.name, email: user.email, whatsappNumber: user.whatsappNumber, role: user.role, status: user.status },
        company: company ? { id: company._id, name: company.name, regNo: company.regNo, scope: company.scope } : null,
        stats: { studentCount, assignmentCount: await Assignment.countDocuments({ createdBy: user._id }) },
        interns
    });
}));

// @route   POST api/supervisor/update-phone
router.post('/update-phone', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const { whatsappNumber } = req.body;
    if (!whatsappNumber) return res.status(400).json({ message: 'WhatsApp number is required.' });

    const user = await User.findById(req.user.id);
    user.whatsappNumber = whatsappNumber;
    await user.save();

    const company = await Company.findOne({ 'siteSupervisors.email': user.email.toLowerCase() });
    if (company) {
        const idx = company.siteSupervisors.findIndex(s => s.email.toLowerCase() === user.email.toLowerCase());
        if (idx > -1) { company.siteSupervisors[idx].whatsappNumber = whatsappNumber; await company.save(); }
    }

    res.json({ message: 'Phone number updated successfully.', whatsappNumber: user.whatsappNumber });
}));

// @route   GET api/supervisor/interns
router.get('/interns', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
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
        ],
        status: { $nin: ['unverified', 'verified', 'Internship Request Submitted'] }
    }).select('name reg status profilePicture internshipRequest');

    res.json(students);
}));

// @route   GET api/supervisor/my-students
router.get('/my-students', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const students = await User.find({ assignedSiteSupervisor: req.user.id, role: 'student' });
    res.json(students.map(s => {
        const isFreelance = s.internshipRequest?.mode === 'Freelance';
        const platform = s.internshipRequest?.freelancePlatform;
        return {
            id: s._id, name: s.name, reg: s.reg, isFreelance,
            company: isFreelance ? `Freelancing${platform ? ` (${platform})` : ''}` : (s.assignedCompany || s.internshipAgreement?.companyName || 'Not Assigned'),
            status: s.status
        };
    }));
}));

// @route   GET api/supervisor/assignments
router.get('/assignments', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    res.json(await Assignment.find({ createdBy: req.user.id }));
}));

// @route   POST api/supervisor/assignments
router.post('/assignments', protect, isSiteSupervisor, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    const { title, description, startDate, deadline, targetStudents } = req.body;
    let students = Array.isArray(targetStudents) ? targetStudents : (targetStudents ? [targetStudents] : []);

    const assignment = new Assignment({
        title, description, startDate, deadline, totalMarks: 10,
        targetStudents: students, fileUrl: req.file ? req.file.path : null,
        createdBy: req.user.id, courseTitle: 'Industrial Task'
    });

    await assignment.save();

    for (const sId of students) {
        await createNotification({ recipient: sId, sender: req.user.id, type: 'assignment_submission', title: 'New Industrial Task', message: `${req.user.name} posted: "${title}".`, link: '/student/assignments' });
    }
    res.status(201).json(assignment);
}));

// @route   GET api/supervisor/submissions/:assignmentId
router.get('/submissions/:assignmentId', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    const [submissions, marks] = await Promise.all([
        Submission.find({ assignment: assignment._id }).populate('student', 'name reg profilePicture'),
        Mark.find({ assignment: assignment._id })
    ]);

    res.json(submissions.map(sub => ({
        _id: sub._id, user: sub.student, fileUrl: sub.fileUrl, submittedAt: sub.createdAt,
        marks: marks.find(m => m.student.toString() === sub.student._id.toString()) || null
    })));
}));

// @route   POST api/supervisor/grade
router.post('/grade', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const { studentId, assignmentId, marks, remarks, criteria } = req.body;

    let mark = await Mark.findOne({ student: studentId, assignment: assignmentId });
    if (!mark) mark = new Mark({ student: studentId, assignment: assignmentId, siteSupervisorId: req.user.id });

    mark.siteSupervisorMarks = marks;
    mark.siteSupervisorRemarks = remarks;
    mark.siteSupervisorCriteria = criteria || {};
    mark.isSiteSupervisorGraded = true;
    mark.history.push({ marks, remarks, updatedBy: req.user.id, role: 'site_supervisor' });

    await mark.save();

    const assignment = await Assignment.findById(assignmentId);
    await createNotification({ recipient: studentId, sender: req.user.id, type: 'assignment_submission', title: 'Task Graded (Industrial)', message: `Your site supervisor graded "${assignment?.title || 'task'}".`, link: '/student/marks' });
    res.json(mark);
}));

// @route   DELETE api/supervisor/assignments/:id
router.delete('/assignments/:id', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    await Promise.all([
        Assignment.findByIdAndDelete(assignment._id),
        Submission.deleteMany({ assignment: assignment._id }),
        Mark.deleteMany({ assignment: assignment._id })
    ]);

    res.json({ message: 'Assignment and all associated records purged.' });
}));

// @route   GET api/supervisor/student-grades
router.get('/student-grades', protect, isSiteSupervisor, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const supEmail = req.user.email?.toLowerCase();
    const supName = req.user.name?.trim();
    const escapeRegex = s => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    const nameRegex = new RegExp(escapeRegex(supName), 'i');

    const query = {
        role: 'student',
        $or: [{ assignedCompanySupervisorEmail: supEmail }, { 'internshipRequest.siteSupervisorEmail': supEmail }, { assignedCompanySupervisor: nameRegex }]
    };

    const [total, students] = await Promise.all([
        User.countDocuments(query),
        User.find(query).select('name reg assignedCompany').skip(skip).limit(limit)
    ]);

    const results = [];
    for (const s of students) {
        const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
        if (marks.length === 0) {
            results.push({ student: { id: s._id, name: s.name, reg: s.reg }, grade: 'N/A', percentage: null, assignmentsCount: 0 });
            continue;
        }

        const totalMarks = marks.reduce((sum, m) => sum + (m.facultyMarks || 0), 0);
        const avg = totalMarks / marks.length;
        const pct = Math.round((avg / 10) * 100);

        let grade = 'F';
        if (pct >= 85) grade = 'A';
        else if (pct >= 80) grade = 'A-';
        else if (pct >= 75) grade = 'B+';
        else if (pct >= 71) grade = 'B';
        else if (pct >= 68) grade = 'B-';
        else if (pct >= 64) grade = 'C+';
        else if (pct >= 61) grade = 'C';
        else if (pct >= 58) grade = 'C-';
        else if (pct >= 54) grade = 'D+';
        else if (pct >= 50) grade = 'D';

        results.push({ 
            student: { id: s._id, name: s.name, reg: s.reg }, 
            company: s.assignedCompany || 'N/A', 
            assignmentsCount: marks.length, 
            averageMarks: avg.toFixed(2), 
            percentage: pct, 
            grade, 
            status: pct >= 50 ? 'Pass' : 'Fail' 
        });
    }

    res.json({
        data: results,
        total,
        page,
        pages: Math.ceil(total / limit)
    });
}));

export default router;
