import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Mark from '../models/Mark.js';
import Evaluation from '../models/Evaluation.js';
import AuditLog from '../models/AuditLog.js';
import Archive from '../models/Archive.js';
import Submission from '../models/Submission.js';
import Phase from '../models/Phase.js';
import { getArchiveSnapshot } from '../utils/archiver.js';
import {
    sendFacultyNominationEmail,
    sendAssignmentConfirmationEmail,
    sendFacultyAssignmentNotificationEmail,
    sendSupervisorAssignmentNotificationEmail,
    sendFacultyPasswordResetEmail,
    sendStudentActivationEmail,
    sendCompanySupervisorActivationEmail,
    sendBulkEmailService
} from '../emailServices/emailService.js';
import { protect, authorize } from '../middleware/auth.js';
import { normalizeEntityName } from '../utils/normalization.js';
import { createNotification } from '../utils/notifications.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Standardized role authorization used in all office routes
const officeAuth = authorize('internship_office', 'hod');

// @route   GET api/office/all-students
router.get('/all-students', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = { role: 'student' };
    if (search) {
        const s = search.trim();
        query.$or = [{ name: { $regex: s, $options: 'i' } }, { reg: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
    }

    const [total, students] = await Promise.all([
        User.countDocuments(query),
        User.find(query).select('name email secondaryEmail reg semester status createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({ students, total, page, pages: Math.ceil(total / limit) });
}));

// @route   GET api/office/faculty-registry
router.get('/faculty-registry', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

    let query = { role: 'faculty_supervisor' };
    if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { whatsappNumber: { $regex: search, $options: 'i' } }];
    }

    const [total, faculty] = await Promise.all([
        User.countDocuments(query),
        User.find(query).select('name email status whatsappNumber createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    const facultyIds = faculty.map(f => f._id);
    const studentCounts = await User.aggregate([
        { $match: { role: 'student', assignedFaculty: { $in: facultyIds } } },
        { $group: { _id: '$assignedFaculty', count: { $sum: 1 } } }
    ]);

    const countMap = studentCounts.reduce((acc, curr) => { if (curr._id) acc[curr._id.toString()] = curr.count; return acc; }, {});

    res.json({
        data: faculty.map(f => ({ ...f, assignedStudents: countMap[f._id.toString()] || 0 })),
        total, page, pages: Math.ceil(total / limit)
    });
}));

// @route   GET api/office/faculty-students/:id
router.get('/faculty-students/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await User.find({ role: 'student', assignedFaculty: req.params.id }).select('name reg semester email status profilePicture'));
}));

// @route   POST api/office/broadcast-email
router.post('/broadcast-email', protect, officeAuth, asyncHandler(async (req, res) => {
    const { category, subject, message, selectedRecipients } = req.body;
    if ((!category && !selectedRecipients) || !subject || !message) return res.status(400).json({ message: 'Missing fields.' });

    let users = [];
    if (selectedRecipients?.length > 0) {
        users = await User.find({ _id: { $in: selectedRecipients } });
    } else {
        let query = {};
        if (category === 'Students') query = { role: 'student' };
        else if (category === 'Faculty Supervisors') query = { role: 'faculty_supervisor' };
        else if (category === 'Site Supervisors') query = { role: 'site_supervisor' };
        else if (category === 'Ineligible Students') query = { role: 'student', status: { $nin: ['Assigned', 'Internship Approved', 'Agreement Approved'] } };
        else if (category === 'Students Pending Placement') query = { role: 'student', status: 'Agreement Approved' };
        else return res.status(400).json({ message: 'Invalid category' });
        users = await User.find(query);
    }

    if (users.length === 0) return res.status(404).json({ message: 'No recipients found' });

    const hasPlaceholders = message.includes('{{name}}') || message.includes('{{reg}}') || subject.includes('{{name}}');
    let successCount = 0;
    let failureCount = 0;

    if (hasPlaceholders) {
        const BATCH_SIZE = 5;
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(user => {
                const sub = subject.replace(/{{name}}/g, user.name || 'User');
                const msg = message.replace(/{{name}}/g, user.name || 'User').replace(/{{reg}}/g, user.reg || 'N/A');
                return sendBulkEmailService([user.email], sub, msg);
            }));
            results.forEach(res => { if (res.success) successCount++; else failureCount++; });
        }
    } else {
        const recipients = users.map(u => u.email).filter(Boolean);
        const result = await sendBulkEmailService(recipients, subject, message);
        if (result.success) successCount = recipients.length; else failureCount = recipients.length;
    }

    await new AuditLog({ action: 'BROADCAST_EMAIL', performedBy: req.user.id, details: `Broadcast: ${category || 'Selected'}. Sent: ${successCount}. Failed: ${failureCount}.`, ipAddress: req.ip }).save();
    res.json({ success: true, message: `Broadcast complete. Sent: ${successCount}, Failed: ${failureCount}` });
}));

// @route   GET api/office/recipients/:category
router.get('/recipients/:category', protect, officeAuth, asyncHandler(async (req, res) => {
    let query = {};
    const { category } = req.params;
    if (category === 'Students') query = { role: 'student' };
    else if (category === 'Faculty Supervisors') query = { role: 'faculty_supervisor' };
    else if (category === 'Site Supervisors') query = { role: 'site_supervisor' };
    else if (category === 'Ineligible Students') query = { role: 'student', status: { $nin: ['Assigned', 'Internship Approved', 'Agreement Approved'] } };
    else if (category === 'Students Pending Placement') query = { role: 'student', status: 'Agreement Approved' };
    else return res.status(400).json({ message: 'Invalid category' });

    res.json(await User.find(query).select('name email reg role'));
}));

// @route   GET api/office/registered-students
router.get('/registered-students', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    let query = { role: 'student' };
    if (req.query.ids) query._id = { $in: req.query.ids.split(',').filter(x => x.length > 0) };
    if (req.query.facultyId) query.assignedFaculty = req.query.facultyId;
    if (req.query.search) {
        const s = req.query.search;
        query.$or = [{ name: { $regex: s, $options: 'i' } }, { reg: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
    }

    const [total, students] = await Promise.all([
        User.countDocuments(query),
        User.find(query).populate('assignedFaculty', 'name email').populate('assignedSiteSupervisor', 'name email').select('-profilePicture').sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({ data: students, total, page, pages: Math.ceil(total / limit) });
}));

// @route   GET api/office/internship-request-students
router.get('/internship-request-students', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const filter = req.query.filter || 'all';

    let query = { role: 'student', status: { $in: ['Internship Request Submitted', 'Internship Approved', 'Internship Rejected'] } };
    if (filter === 'pending') query.status = 'Internship Request Submitted';
    else if (filter === 'approved') query.status = 'Internship Approved';
    else if (filter === 'rejected') query.status = 'Internship Rejected';

    if (search) {
        const s = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [{ name: { $regex: s, $options: 'i' } }, { reg: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }, { 'internshipRequest.companyName': { $regex: s, $options: 'i' } }];
    }

    const [total, students] = await Promise.all([
        User.countDocuments(query),
        User.find(query).select('-profilePicture').populate('assignedFaculty', 'name email').populate('assignedSiteSupervisor', 'name email').sort({ 'internshipRequest.submittedAt': 1 }).skip(skip).limit(limit).lean()
    ]);

    res.json({ data: students, total, page, pages: Math.ceil(total / limit) });
}));

// @route   GET api/office/internship-request/:id
router.get('/internship-request/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.id).select('-profilePicture').populate('assignedFaculty', 'name email').populate('assignedSiteSupervisor', 'name email whatsappNumber').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
}));

// @route   GET api/office/internship-request-stats
router.get('/internship-request-stats', protect, officeAuth, asyncHandler(async (req, res) => {
    const [all, pending, approved, rejected] = await Promise.all([
        User.countDocuments({ role: 'student', status: { $in: ['Internship Request Submitted', 'Internship Approved', 'Internship Rejected'] } }),
        User.countDocuments({ role: 'student', status: 'Internship Request Submitted' }),
        User.countDocuments({ role: 'student', status: 'Internship Approved' }),
        User.countDocuments({ role: 'student', status: 'Internship Rejected' })
    ]);
    res.json({ all, pending, approved, rejected });
}));

// @route   GET api/office/student-stats
router.get('/student-stats', protect, officeAuth, asyncHandler(async (req, res) => {
    const students = await User.find({ role: 'student' }).select('semester status cgpa internshipRequest reg');
    const stats = { total: students.length, eligibility: { eligible: 0, ineligible: 0 }, modes: { onsite: 0, remote: 0, hybrid: 0, freelance: 0, unrequested: 0 }, gpa: { low: 0, medium: 0, high: 0 }, completion: { missingSem: 0, missingCGPA: 0, complete: 0 }, departments: { cs: 0, se: 0, other: 0 } };
    const eligibleSemesters = ['4', '5', '6', '7', '8'];

    students.forEach(s => {
        const cgpaVal = parseFloat(s.cgpa) || 0;
        if (eligibleSemesters.includes(s.semester?.toString()) && s.status !== 'unverified' && cgpaVal >= 2.0) stats.eligibility.eligible++; else stats.eligibility.ineligible++;
        const reg = s.reg?.toUpperCase() || '';
        if (reg.includes('-BCS-') || reg.includes('-CS-')) stats.departments.cs++; else if (reg.includes('-BSE-') || reg.includes('-SE-')) stats.departments.se++; else stats.departments.other++;
        const mode = s.internshipRequest?.mode?.toLowerCase();
        if (mode && stats.modes.hasOwnProperty(mode)) stats.modes[mode]++; else if (!mode) stats.modes.unrequested++;
        if (cgpaVal < 2.0) stats.gpa.low++; else if (cgpaVal < 3.5) stats.gpa.medium++; else stats.gpa.high++;
        if (!s.semester) stats.completion.missingSem++; if (!s.cgpa) stats.completion.missingCGPA++; if (s.semester && s.cgpa) stats.completion.complete++;
    });
    res.json(stats);
}));

// @route   GET api/office/check-faculty-by-email
router.get('/check-faculty-by-email', protect, officeAuth, asyncHandler(async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const faculty = await User.findOne({ email: email.toLowerCase().trim(), role: 'faculty_supervisor' }).select('name email status');
    res.json({ found: !!faculty, faculty: faculty ? { id: faculty._id, name: faculty.name, email: faculty.email, status: faculty.status } : null });
}));

// @route   POST api/office/assign-company
router.post('/assign-company', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, companyName, officeId } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    await Company.findOneAndUpdate({ name: companyName.trim() }, { $setOnInsert: { name: companyName.trim(), source: 'student_submission', isMOUSigned: false, category: 'Student Self-Assigned' } }, { upsert: true });
    student.assignedCompany = companyName.trim();
    await student.save();
    await new AuditLog({ action: 'COMPANY_ASSIGNED', performedBy: req.user._id, targetUser: student._id, details: `Assigned company "${companyName}"`, ipAddress: req.ip }).save();
    res.json({ message: 'Company assigned.' });
}));

// @route   POST api/office/assign-site-supervisor
router.post('/assign-site-supervisor', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, siteSupervisorName, siteSupervisorEmail, siteSupervisorPhone, officeId } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.assignedCompanySupervisor = siteSupervisorName;
    student.assignedCompanySupervisorEmail = siteSupervisorEmail?.toLowerCase().trim();
    if (siteSupervisorEmail) {
        const sup = await User.findOne({ email: siteSupervisorEmail.toLowerCase().trim(), role: 'site_supervisor' });
        if (sup) student.assignedSiteSupervisor = sup._id;
    }
    if (student.internshipRequest) {
        student.internshipRequest.siteSupervisorName = siteSupervisorName;
        student.internshipRequest.siteSupervisorEmail = siteSupervisorEmail || student.internshipRequest.siteSupervisorEmail;
        student.internshipRequest.siteSupervisorPhone = siteSupervisorPhone || student.internshipRequest.siteSupervisorPhone;
    }
    await student.save();
    await new AuditLog({ action: 'SITE_SUPERVISOR_ASSIGNED', performedBy: req.user._id, targetUser: student._id, details: `Assigned site supervisor "${siteSupervisorName}"`, ipAddress: req.ip }).save();
    res.json({ message: 'Site supervisor assigned.' });
}));

// @route   POST api/office/assign-faculty-override
router.post('/assign-faculty-override', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, facultyId, officeId } = req.body;
    const [student, faculty] = await Promise.all([User.findById(studentId), User.findById(facultyId)]);
    if (!student || !faculty || faculty.role !== 'faculty_supervisor') return res.status(404).json({ message: 'Not found.' });

    student.assignedFaculty = facultyId;
    if (student.internshipRequest) student.internshipRequest.facultyStatus = 'Accepted';
    await student.save();
    await new AuditLog({ action: 'FACULTY_ASSIGNED_OVERRIDE', performedBy: req.user._id, targetUser: student._id, details: `Faculty "${faculty.name}" assigned.`, ipAddress: req.ip }).save();
    res.json({ message: 'Faculty assigned.' });
}));

// @route   GET api/office/check-site-supervisor-by-email
router.get('/check-site-supervisor-by-email', protect, officeAuth, asyncHandler(async (req, res) => {
    const sup = await User.findOne({ email: req.query.email?.toLowerCase().trim(), role: 'site_supervisor' }).select('name email status whatsappNumber');
    res.json({ found: !!sup, supervisor: sup ? { id: sup._id, name: sup.name, email: sup.email, status: sup.status, phone: sup.whatsappNumber } : null });
}));

// @route   POST api/office/onboard-and-assign-site-supervisor
router.post('/onboard-and-assign-site-supervisor', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, siteSupervisorName, siteSupervisorEmail, siteSupervisorPhone, companyName, officeId } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const email = siteSupervisorEmail?.toLowerCase().trim();
    if (!email) return res.status(400).json({ message: 'Supervisor email is required.' });
    const conflict = await User.findOne({ $or: [{ email }, { secondaryEmail: email }] });
    if (conflict) return res.status(400).json({ message: `Email "${email}" in use by ${conflict.role}.` });

    const company = await Company.findOneAndUpdate({ name: companyName.trim() }, { $setOnInsert: { name: companyName.trim(), source: 'student_submission' }, $addToSet: { siteSupervisors: { name: siteSupervisorName, email, whatsappNumber: siteSupervisorPhone || '' } } }, { upsert: true, new: true });
    let user = await User.findOne({ $or: [{ email }, { secondaryEmail: email }] });
    if (!user) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        user = new User({ name: siteSupervisorName, email, whatsappNumber: siteSupervisorPhone || '', role: 'site_supervisor', status: 'Pending Activation', activationToken: crypto.createHash('sha256').update(rawToken).digest('hex'), activationExpires: Date.now() + 86400000, password: crypto.randomBytes(16).toString('hex') });
        await user.save();
        await sendCompanySupervisorActivationEmail(email, rawToken, siteSupervisorName, company.name);
    }

    student.assignedCompanySupervisor = siteSupervisorName; student.assignedCompanySupervisorEmail = email; student.assignedSiteSupervisor = user._id;
    if (student.internshipRequest) { student.internshipRequest.siteSupervisorName = siteSupervisorName; student.internshipRequest.siteSupervisorEmail = email; student.internshipRequest.siteSupervisorPhone = siteSupervisorPhone || ''; }
    await student.save();
    res.json({ message: 'Supervisor onboarded and assigned.' });
}));

// @route   POST api/office/onboard-and-assign-faculty
router.post('/onboard-and-assign-faculty', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, name, email } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const emailLower = email?.toLowerCase().trim();
    if (!emailLower) return res.status(400).json({ message: 'Faculty email is required.' });
    let faculty = await User.findOne({ $or: [{ email: emailLower }, { secondaryEmail: emailLower }] });
    if (!faculty) {
        const token = crypto.randomBytes(32).toString('hex');
        faculty = new User({ name, email: emailLower, role: 'faculty_supervisor', status: 'Pending Activation', activationToken: crypto.createHash('sha256').update(token).digest('hex'), activationExpires: Date.now() + 86400000, password: crypto.randomBytes(16).toString('hex') });
        await faculty.save();
        await sendFacultyNominationEmail(emailLower, token, name);
    }

    student.assignedFaculty = faculty._id;
    if (student.internshipRequest) student.internshipRequest.facultyStatus = 'Accepted';
    await student.save();
    res.json({ message: 'Faculty assigned.' });
}));

// @route   POST api/office/decide-request
router.post('/decide-request', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, decision, comment, officeId } = req.body;
    const student = await User.findById(studentId);
    if (!student || student.status !== 'Internship Request Submitted') return res.status(404).json({ message: 'Request not found or processed.' });

    student.status = decision === 'approve' ? 'Internship Approved' : 'Internship Rejected';
    if (decision === 'reject') student.internshipRequest.rejectionReason = comment || 'No reason.';
    await student.save();

    await createNotification({ recipient: studentId, sender: officeId || studentId, type: 'internship_request', title: `Request ${decision}`, message: decision === 'approve' ? 'Approved.' : `Rejected: ${comment}`, link: '/student/dashboard' });
    res.json({ message: `Decision recorded.` });
}));

// @route   GET api/office/pending-agreements
router.get('/pending-agreements', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await User.find({ status: { $in: ['Agreement Submitted - Self', 'Agreement Submitted - University Assigned'] }, role: 'student' }).select('-profilePicture'));
}));

// @route   POST api/office/decide-agreement
router.post('/decide-agreement', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, decision, comment } = req.body;
    const user = await User.findById(studentId);
    if (!user) return res.status(404).json({ message: 'Student not found' });

    if (decision === 'approve') {
        user.status = 'Agreement Approved';
        const agr = user.internshipAgreement;
        if (agr && agr.companyName) {
            user.assignedCompany = agr.companyName;
            user.assignedCompanySupervisor = agr.companySupervisorName || user.assignedCompanySupervisor;
            user.assignedCompanySupervisorEmail = agr.companySupervisorEmail || user.assignedCompanySupervisorEmail;

            if (user.internshipRequest?.type === 'Self') {
                await Company.findOneAndUpdate(
                    { name: agr.companyName },
                    { 
                        name: agr.companyName, 
                        address: agr.companyAddress, 
                        regNo: agr.companyRegNo, 
                        scope: agr.companyScope, 
                        hrEmail: agr.companyHREmail, 
                        $addToSet: { 
                            siteSupervisors: { 
                                name: agr.companySupervisorName, 
                                email: agr.companySupervisorEmail, 
                                whatsappNumber: agr.whatsappNumber 
                            } 
                        }, 
                        source: 'student_submission' 
                    }, 
                    { upsert: true }
                );
            }
        }
    } else {
        user.status = 'Agreement Rejected';
        user.internshipAgreement.rejectionComments = comment;
    }

    await user.save();
    await createNotification({ recipient: studentId, sender: req.user._id, type: 'internship_request', title: `Agreement ${decision.toUpperCase()}`, message: decision === 'approve' ? 'Approved.' : `Rejected: ${comment}`, link: '/student/dashboard' });
    res.json({ message: `Agreement decision saved.` });
}));

// @route   GET api/office/approved-students
router.get('/approved-students', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await User.find({ status: 'Agreement Approved', role: 'student' }).populate('assignedFaculty', 'name email'));
}));

// @route   GET api/office/assigned-students
router.get('/assigned-students', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await User.find({ status: 'Assigned', role: 'student' }).populate('assignedFaculty', 'name'));
}));

// @route   POST api/office/assign-student
router.post('/assign-student', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, facultyId, companyName, siteSupervisor, officeId } = req.body;
    const [student, faculty] = await Promise.all([User.findById(studentId), User.findById(facultyId)]);
    if (!student || !faculty || faculty.role !== 'faculty_supervisor') return res.status(400).json({ message: 'Invalid data.' });

    student.assignedFaculty = facultyId; student.assignedCompany = companyName; student.assignedCompanySupervisor = siteSupervisor.name;
    const email = siteSupervisor.email?.toLowerCase().trim();
    if (email) {
        student.assignedCompanySupervisorEmail = email;
        const sup = await User.findOne({ email, role: 'site_supervisor' });
        if (sup) student.assignedSiteSupervisor = sup._id;
    }
    student.status = 'Assigned';
    await student.save();

    await createNotification({ recipient: studentId, sender: officeId, type: 'internship_request', title: 'Placement Finalized', message: `Assigned to ${companyName}.`, link: '/student/dashboard' });
    await new AuditLog({ action: 'INTERNSHIP_ASSIGNMENT', performedBy: req.user._id, targetUser: student._id, details: `Assigned to ${companyName}`, ipAddress: req.ip }).save();

    await Promise.all([
        sendAssignmentConfirmationEmail(student.email, student.name, { companyName, siteSupervisor, facultySupervisor: { name: faculty.name, whatsappNumber: faculty.whatsappNumber } }),
        sendFacultyAssignmentNotificationEmail(faculty.email, faculty.name, { studentName: student.name, studentReg: student.reg, companyName }),
        email ? sendSupervisorAssignmentNotificationEmail(email, siteSupervisor.name, { studentName: student.name, studentReg: student.reg, companyName }) : Promise.resolve()
    ]);
    res.json({ message: 'Student assigned.' });
}));

// @route   GET api/office/companies/dropdown
router.get('/companies/dropdown', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await Company.find({ status: 'Active' }).select('name status siteSupervisors isMOUSigned category').sort({ isMOUSigned: -1, name: 1 }).lean());
}));

// @route   GET api/office/site-supervisors
router.get('/site-supervisors', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

    const companies = await Company.find({ status: 'Active' }).select('name siteSupervisors');
    const supervisorMap = {};
    companies.forEach(c => {
        (c.siteSupervisors || []).forEach(s => {
            const email = s.email?.toLowerCase().trim() || '';
            const name = s.name?.trim() || 'Unknown';
            if (search && !new RegExp(search, 'i').test(name) && !new RegExp(search, 'i').test(email)) return;
            const key = email || name;
            if (!supervisorMap[key]) supervisorMap[key] = { name: s.name, email, whatsappNumber: s.whatsappNumber, companies: [{ id: c._id, name: c.name }] };
            else if (!supervisorMap[key].companies.find(comp => comp.id.toString() === c._id.toString())) supervisorMap[key].companies.push({ id: c._id, name: c.name });
        });
    });

    const all = Object.values(supervisorMap);
    const paginated = all.slice((page - 1) * limit, page * limit);
    const emails = paginated.map(s => s.email).filter(Boolean);
    const assignments = await User.aggregate([{ $match: { role: 'student', assignedCompanySupervisorEmail: { $in: emails } } }, { $group: { _id: '$assignedCompanySupervisorEmail', count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(assignments.map(a => [a._id, a.count]));

    res.json({ data: paginated.map(s => ({ ...s, assignedStudents: countMap[s.email] || 0 })), total: all.length, page, pages: Math.ceil(all.length / limit) });
}));

// @route   GET api/office/supervisor-students
router.get('/supervisor-students', protect, officeAuth, asyncHandler(async (req, res) => {
    const { company, supervisor, email } = req.query;
    if (!company && !supervisor && !email) return res.json([]); // Return empty to avoid full registry dump

    const query = { role: 'student' };
    const s = string => string?.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&') || '';

    if (email) query.assignedCompanySupervisorEmail = email.toLowerCase().trim();
    if (company) query.assignedCompany = { $regex: new RegExp(`^${s(company.trim())}$`, 'i') };
    if (supervisor) query.assignedCompanySupervisor = { $regex: new RegExp(`^${s(supervisor.trim())}$`, 'i') };

    res.json(await User.find(query).select('name email reg semester status').lean());
}));

// @route   GET api/office/companies
router.get('/companies', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 10, skip = (page - 1) * limit, search = (req.query.search || '').trim();
    let query = { status: 'Active' };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { regNo: { $regex: search, $options: 'i' } }, { scope: { $regex: search, $options: 'i' } }];

    const [total, companies] = await Promise.all([Company.countDocuments(query), Company.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)]);
    const names = companies.map(c => c.name);
    const emails = companies.flatMap(c => (c.siteSupervisors || []).map(s => s.email?.toLowerCase()?.trim())).filter(Boolean);

    const [compAs, emailAs] = await Promise.all([
        User.aggregate([{ $match: { role: 'student', assignedCompany: { $in: names } } }, { $group: { _id: '$assignedCompany', count: { $sum: 1 } } }]),
        User.aggregate([{ $match: { role: 'student', assignedCompanySupervisorEmail: { $in: emails } } }, { $group: { _id: '$assignedCompanySupervisorEmail', count: { $sum: 1 } } }])
    ]);

    const compMap = Object.fromEntries(compAs.map(a => [a._id, a.count]));
    const emailMap = Object.fromEntries(emailAs.map(a => [a._id, a.count]));

    res.json({ data: companies.map(c => ({ ...c.toObject(), assignedStudents: compMap[c.name] || 0, siteSupervisors: (c.siteSupervisors || []).map(s => ({ ...s, assignedStudents: emailMap[s.email?.toLowerCase()?.trim()] || 0 })) })), total, page, pages: Math.ceil(total / limit) });
}));

// @route   POST api/office/add-company
router.post('/add-company', protect, officeAuth, async (req, res, next) => {
    try {
        const { name, regNo, siteSupervisors } = req.body;
        const existing = await Company.findOne({ 
            $or: regNo ? [{ name }, { regNo }] : [{ name }] 
        });
        if (existing) return res.status(400).json({ message: 'A company with this name or registration number already exists.' });

        const company = new Company({ 
            ...req.body, 
            mouSignedDate: req.body.mouSignedDate ? new Date(req.body.mouSignedDate) : null,
            source: 'manual' 
        });
        await company.save();

        if (siteSupervisors?.length > 0) {
            for (const s of siteSupervisors) {
                const email = s.email?.toLowerCase()?.trim();
                if (!email) continue;
                if (!await User.findOne({ $or: [{ email }, { secondaryEmail: email }] })) {
                    const token = crypto.randomBytes(32).toString('hex');
                    await new User({ name: s.name, email, whatsappNumber: s.whatsappNumber, role: 'site_supervisor', status: 'Pending Activation', activationToken: crypto.createHash('sha256').update(token).digest('hex'), activationExpires: Date.now() + 86400000, password: crypto.randomBytes(16).toString('hex') }).save();
                    await sendCompanySupervisorActivationEmail(email, token, s.name, name);
                }
            }
        }
        await new AuditLog({ action: 'COMPANY_ADDED', performedBy: req.user._id, details: `Added: ${name}`, ipAddress: req.ip }).save();
        res.json({ message: 'Company and supervisors added.' });
    } catch (error) {
        console.error('CRITICAL COMPANY REGISTRATION ERROR:', error);
        next(error);
    }
});

// @route   POST api/office/edit-company/:id
router.post('/edit-company/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const { name, address, regNo, scope, hrEmail, mouSignedDate, isMOUSigned, siteSupervisors, officeId } = req.body;
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Not found.' });
    Object.assign(company, { 
        name, address, regNo, scope, hrEmail, isMOUSigned, siteSupervisors,
        mouSignedDate: mouSignedDate ? new Date(mouSignedDate) : null
    });
    await company.save();
    await new AuditLog({ action: 'COMPANY_UPDATED', performedBy: req.user._id, details: `Updated: ${company.name}`, ipAddress: req.ip }).save();
    res.json({ message: 'Updated.' });
}));

// @route   POST api/office/add-site-supervisor
router.post('/add-site-supervisor', protect, officeAuth, asyncHandler(async (req, res) => {
    const { companyId, name, email, whatsappNumber, officeId } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Not found.' });

    const mail = email?.toLowerCase()?.trim();
    if (!mail) return res.status(400).json({ message: 'Email is required.' });
    if (await User.findOne({ $or: [{ email: mail }, { secondaryEmail: mail }] })) return res.status(400).json({ message: 'Email in use.' });
    if (company.siteSupervisors.some(s => s.email === mail)) return res.status(400).json({ message: 'Already linked.' });

    company.siteSupervisors.push({ name, email: mail, whatsappNumber });
    await company.save();

    const token = crypto.randomBytes(32).toString('hex');
    await new User({ name, email: mail, whatsappNumber, role: 'site_supervisor', status: 'Pending Activation', activationToken: crypto.createHash('sha256').update(token).digest('hex'), activationExpires: Date.now() + 86400000, password: crypto.randomBytes(16).toString('hex') }).save();
    await sendCompanySupervisorActivationEmail(mail, token, name, company.name);

    await new AuditLog({ action: 'SUPERVISOR_LINKED', performedBy: req.user._id, details: `Linked ${name} to ${company.name}`, ipAddress: req.ip }).save();
    res.json({ message: 'Linked.' });
}));

// @route   POST api/office/edit-site-supervisor/:id
router.post('/edit-site-supervisor/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const { name, email, whatsappNumber } = req.body;
    const mail = (email || req.params.id)?.toLowerCase()?.trim();
    const user = await User.findOne({ email: mail });
    if (user) { user.name = name || user.name; user.whatsappNumber = whatsappNumber || user.whatsappNumber; await user.save(); }
    await Company.updateMany({ 'siteSupervisors.email': mail }, { $set: { 'siteSupervisors.$.name': name || user?.name, 'siteSupervisors.$.whatsappNumber': whatsappNumber || user?.whatsappNumber } });
    await new AuditLog({ action: 'SUPERVISOR_UPDATED', performedBy: req.user._id, details: `Updated: ${mail}`, ipAddress: req.ip }).save();
    res.json({ message: 'Updated.' });
}));

// @route   POST api/office/remove-site-supervisor
router.post('/remove-site-supervisor', protect, officeAuth, asyncHandler(async (req, res) => {
    const { email, companyId } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Not found.' });
    const mailToLink = email?.toLowerCase()?.trim();
    if (!mailToLink) return res.status(400).json({ message: 'Email required.' });
    company.siteSupervisors = company.siteSupervisors.filter(s => s.email !== mailToLink);
    await company.save();
    await new AuditLog({ action: 'SUPERVISOR_REMOVED', performedBy: req.user._id, details: `Removed ${email} from ${company.name}`, ipAddress: req.ip }).save();
    res.json({ message: 'Removed.' });
}));

// @route   POST api/office/onboard-faculty
router.post('/onboard-faculty', protect, officeAuth, asyncHandler(async (req, res) => {
    const { name, email, whatsappNumber } = req.body;
    const mail = email?.toLowerCase()?.trim();
    if (!mail) return res.status(400).json({ message: 'Email is required.' });
    if (await User.findOne({ $or: [{ email: mail }, { secondaryEmail: mail }] })) return res.status(400).json({ message: 'Email in use.' });

    const token = crypto.randomBytes(32).toString('hex');
    const f = new User({ name, email: mail, whatsappNumber, role: 'faculty_supervisor', status: 'Pending Activation', activationToken: crypto.createHash('sha256').update(token).digest('hex'), activationExpires: Date.now() + 86400000, password: crypto.randomBytes(16).toString('hex') });
    await f.save();
    await sendFacultyNominationEmail(mail, token, name);
    await new AuditLog({ action: 'FACULTY_ONBOARD', performedBy: req.user._id, targetUser: f._id, details: `Onboarded ${name}`, ipAddress: req.ip }).save();
    res.status(201).json({ message: 'Faculty onboarded.' });
}));

// @route   POST api/office/onboard-student
router.post('/onboard-student', protect, officeAuth, asyncHandler(async (req, res) => {
    const { name, reg, email, semester, fatherName, whatsappNumber, section, cgpa } = req.body;
    const mail = email?.toLowerCase()?.trim(), r = reg?.toUpperCase()?.trim();
    if (!mail || !r) return res.status(400).json({ message: 'Email and Registration Number are required.' });
    if (await User.findOne({ $or: [{ email: mail }, { reg: r }] })) return res.status(400).json({ message: 'Exists.' });

    const token = crypto.randomBytes(32).toString('hex');
    const s = new User({ name: name.trim(), reg: r, email: mail, semester, fatherName: fatherName?.trim(), whatsappNumber: whatsappNumber?.trim(), section: section?.toUpperCase().trim(), cgpa: cgpa ? parseFloat(cgpa).toFixed(2) : null, role: 'student', status: 'unverified', emailVerificationToken: token, emailVerificationExpires: Date.now() + 172800000, password: crypto.randomBytes(16).toString('hex') });
    await s.save();
    await new AuditLog({ action: 'STUDENT_ONBOARD', performedBy: req.user._id, targetUser: s._id, details: `Onboarded ${r}`, ipAddress: req.ip }).save();
    try { await sendStudentActivationEmail(mail, token, name); } catch (e) { return res.status(201).json({ success: true, message: 'Created, but email failed.' }); }
    res.status(201).json({ success: true, message: 'Onboarded.' });
}));

// @route   POST api/office/resend-student-activation
router.post('/resend-student-activation', protect, officeAuth, asyncHandler(async (req, res) => {
    const s = await User.findById(req.body.studentId);
    if (!s || s.status !== 'unverified') return res.status(400).json({ message: 'Invalid or already active.' });
    const tok = crypto.randomBytes(32).toString('hex');
    s.emailVerificationToken = tok; s.emailVerificationExpires = Date.now() + 172800000;
    await s.save();
    await sendStudentActivationEmail(s.email, tok, s.name);
    res.json({ message: 'Resent.' });
}));
// @route   POST api/office/resend-faculty-activation
router.post('/resend-faculty-activation', protect, officeAuth, asyncHandler(async (req, res) => {
    const f = await User.findById(req.body.facultyId);
    if (!f || f.status !== 'Pending Activation') return res.status(400).json({ message: 'Invalid.' });
    const tok = crypto.randomBytes(32).toString('hex');
    f.activationToken = crypto.createHash('sha256').update(tok).digest('hex'); f.activationExpires = Date.now() + 86400000;
    await f.save();
    await sendFacultyNominationEmail(f.email, tok, f.name);
    res.json({ message: 'Resent.' });
}));

// @route   PUT api/office/edit-faculty/:id
router.put('/edit-faculty/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const f = await User.findById(req.params.id);
    if (!f || f.role !== 'faculty_supervisor') return res.status(404).json({ message: 'Not found.' });
    f.name = req.body.name || f.name; f.whatsappNumber = req.body.whatsappNumber || f.whatsappNumber;
    await f.save();
    res.json({ message: 'Updated.' });
}));

// @route   POST api/office/delete-faculty/:id
router.post('/delete-faculty/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const f = await User.findById(req.params.id);
    if (f) { f.status = 'Inactive'; await f.save(); }
    res.json({ message: 'Deactivated.' });
}));

// @route   POST api/office/reset-faculty-password/:id
router.post('/reset-faculty-password/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const f = await User.findById(req.params.id);
    if (!f || f.role !== 'faculty_supervisor') return res.status(404).json({ message: 'Not found.' });
    const pw = crypto.randomBytes(4).toString('hex');
    f.password = await bcrypt.hash(pw, 12); f.mustChangePassword = true;
    await f.save();
    await sendFacultyPasswordResetEmail(f.email, pw, f.name);
    res.json({ message: 'Reset.' });
}));

// @route   POST api/office/delete-company/:id
router.post('/delete-company/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const c = await Company.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found.' });
    if (await User.countDocuments({ assignedCompany: c.name }) > 0) return res.status(400).json({ message: 'Students assigned.' });
    c.status = 'Inactive'; await c.save();
    res.json({ message: 'Deactivated.' });
}));

// @route   POST api/office/create-assignment
router.post('/create-assignment', protect, officeAuth, asyncHandler(async (req, res) => {
    const a = new Assignment({ ...req.body, createdBy: req.user._id });
    await a.save();
    await new AuditLog({ action: 'ASSIGNMENT_CREATED', performedBy: req.user._id, details: `Created: ${a.title}`, ipAddress: req.ip }).save();
    res.json({ message: 'Created.', assignment: a });
}));

// @route   GET api/office/assignments
router.get('/assignments', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await Assignment.find().sort({ createdAt: -1 }));
}));

// @route   PUT api/office/update-assignment/:id
router.put('/update-assignment/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const a = await Assignment.findById(req.params.id);
    if (a) { Object.assign(a, req.body); await a.save(); }
    res.json({ message: 'Updated.', assignment: a });
}));

// @route   POST api/office/override-deadline
router.post('/override-deadline', protect, officeAuth, asyncHandler(async (req, res) => {
    const a = await Assignment.findById(req.body.assignmentId);
    if (!a) return res.status(404).json({ message: 'Not found.' });
    const idx = a.overrides.findIndex(o => o.facultyId.toString() === req.body.facultyId);
    if (idx > -1) a.overrides[idx].deadline = req.body.newDeadline; else a.overrides.push({ facultyId: req.body.facultyId, deadline: req.body.newDeadline });
    await a.save();
    res.json({ message: 'Override applied.' });
}));

// @route   GET api/office/all-marks
router.get('/all-marks', protect, officeAuth, asyncHandler(async (req, res) => {
    const { program, semester } = req.query;
    let match = { role: 'student' };
    if (program === 'BCS' || program === 'CS') match.reg = { $regex: /-BCS-/i }; else if (program === 'BSE' || program === 'SE') match.reg = { $regex: /-BSE-/i };
    if (semester && semester !== 'All') match.semester = parseInt(semester);
    const marks = await Mark.find().populate({ path: 'student', select: 'name reg semester', match }).populate('assignment', 'title totalMarks').populate('faculty', 'name').sort({ createdAt: -1 });
    res.json(marks.filter(m => m.student));
}));

// @route   POST api/office/bulk-update-marks
router.post('/bulk-update-marks', protect, officeAuth, asyncHandler(async (req, res) => {
    const { assignmentId, facultyId, marksData, officeId } = req.body;
    const a = await Assignment.findById(assignmentId);
    if (!a) return res.status(404).json({ message: 'Not found.' });

    for (let item of marksData) {
        if (!item.marks || item.marks > a.totalMarks) continue;
        let m = await Mark.findOne({ assignment: assignmentId, student: item.studentId });
        if (m) {
            if (m.marks !== item.marks) { m.history.push({ marks: m.marks, updatedBy: req.user._id, updatedAt: new Date(), reason: 'Override' }); m.marks = item.marks; m.lastUpdatedBy = req.user._id; await m.save(); }
        } else {
            await new Mark({ assignment: assignmentId, student: item.studentId, faculty: facultyId, marks: item.marks, createdBy: req.user._id, lastUpdatedBy: req.user._id }).save();
        }
    }
    res.json({ message: 'Done.' });
}));

// @route   GET api/office/evaluations
router.get('/evaluations', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await Evaluation.find().populate('student', 'name reg semester').sort({ submittedAt: -1 }));
}));

// @route   DELETE api/office/delete-assignment/:id
router.delete('/delete-assignment/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const a = await Assignment.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Not found.' });
    await Promise.all([Assignment.findByIdAndDelete(a._id), Submission.deleteMany({ assignment: a._id }), Mark.deleteMany({ assignment: a._id })]);
    res.json({ message: 'Purged.' });
}));

// @route   GET api/office/aggregated-marks
router.get('/aggregated-marks', protect, officeAuth, asyncHandler(async (req, res) => {
    const { program, semester } = req.query;
    let match = { role: 'student' };
    if (program === 'BCS' || program === 'CS') match.reg = { $regex: /-BCS-/i }; else if (program === 'BSE' || program === 'SE') match.reg = { $regex: /-BSE-/i };
    if (semester && semester !== 'All') match.semester = parseInt(semester);

    const students = await User.find(match).select('-profilePicture').populate('assignedFaculty', 'name email whatsappNumber').populate('assignedSiteSupervisor', 'name email whatsappNumber');
    const results = [];
    const calc = (p) => {
        if (p >= 85) return { grade: 'A', status: 'Pass' }; if (p >= 80) return { grade: 'A-', status: 'Pass' }; if (p >= 75) return { grade: 'B+', status: 'Pass' }; if (p >= 71) return { grade: 'B', status: 'Pass' };
        if (p >= 68) return { grade: 'B-', status: 'Pass' }; if (p >= 64) return { grade: 'C+', status: 'Pass' }; if (p >= 61) return { grade: 'C', status: 'Pass' }; if (p >= 58) return { grade: 'C-', status: 'Pass' };
        if (p >= 54) return { grade: 'D+', status: 'Pass' }; if (p >= 50) return { grade: 'D', status: 'Pass' }; return { grade: 'F', status: 'Fail' };
    };

    for (const s of students) {
        const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
        const free = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
        const scores = marks.map(m => free ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2);
        const avg = marks.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const pct = Math.round((avg / 10) * 100);
        let { grade, status } = calc(pct);
        if (marks.length === 0) { grade = 'N/A'; status = (s.status === 'Assigned' || s.status === 'Agreement Approved') ? 'Pending' : (s.status === 'Fail' ? 'Fail' : 'Ineligible'); }
        results.push({ student: { name: s.name, reg: s.reg, email: s.email }, faculty: s.assignedFaculty, siteSupervisor: s.assignedSiteSupervisor, company: s.assignedCompany || 'N/A', assignmentsCount: marks.length, averageMarks: avg.toFixed(2), percentage: pct, grade, reportStatus: status });
    }
    res.json(results);
}));

// @route   GET api/office/archives
router.get('/archives', protect, officeAuth, asyncHandler(async (req, res) => {
    const archives = await Archive.find().sort({ createdAt: -1 }).lean();
    
    // Inject Live Snapshot if phase is 4 or 5
    const activePhase = await Phase.findOne({ status: 'active' }).lean();
    if (activePhase && (activePhase.order === 4 || activePhase.order === 5)) {
        try {
            const snapshot = await getArchiveSnapshot();
            const liveSnapshot = {
                _id: 'live-snapshot-id',
                cycleName: `Live Preview — ${snapshot.cycleName}`,
                year: snapshot.year,
                statistics: snapshot.statistics,
                students: snapshot.students,
                isLive: true,
                createdAt: new Date(),
                pdfUrl: null, // No PDF yet
                excelUrl: null // No Excel yet
            };
            archives.unshift(liveSnapshot);
        } catch (err) {
            console.error('Failed to generate live snapshot for archive list:', err);
        }
    }

    res.json(archives);
}));

export default router;
