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

/**
 * @swagger
 * tags:
 *   name: Office
 *   description: Internship office and HOD administrative management
 */

const officeAuth = authorize('internship_office', 'hod');

/**
 * @swagger
 * /office/all-students:
 *   get:
 *     summary: Retrieve a paginated list of all registered students in the system
 *     description: Returns a sortable and searchable list of student users, including basic profile and registration metadata.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: The page number to retrieve for pagination
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         description: Number of student records to return per page
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         description: Keyword search across student name, registration number, or email address
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successfully retrieved paginated student list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 students: { type: array, items: { type: object } }
 *                 total: { type: integer, description: "Total count of students matching the query" }
 *                 page: { type: integer }
 *                 pages: { type: integer, description: "Total number of pages available" }
 */
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
        User.find(query).select('name email secondaryEmail reg semester status createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    res.json({ students, total, page, pages: Math.ceil(total / limit) });
}));

/**
 * @swagger
 * /office/faculty-registry:
 *   get:
 *     summary: Retrieve a detailed registry of faculty supervisors with current workload metrics
 *     description: Provides a list of faculty members including their names, emails, and the number of students currently assigned to each.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Pagination page number
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         description: Number of records per page
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         description: Search by name, email, or WhatsApp number
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successfully retrieved faculty registry with workload counts
 */
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

/**
 * @swagger
 * /office/faculty-students/{id}:
 *   get:
 *     summary: Retrieve total roster of students assigned to a specific faculty member
 *     description: Returns a detailed list of students currently under the supervision of the specified faculty supervisor.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, description: "MongoDB User ID of the faculty supervisor" }
 *     responses:
 *       200:
 *         description: Array of student profiles with population status
 */
router.get('/faculty-students/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await User.find({ role: 'student', assignedFaculty: req.params.id }).select('name reg semester email status profilePicture'));
}));

/**
 * @swagger
 * /office/broadcast-email:
 *   post:
 *     summary: Dispatch broadcast emails to specific cohorts or selected individuals
 *     description: Allows the office to send mass communications. Supports dynamic placeholders like {{name}} and {{reg}} which are automatically populated per recipient.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               category: 
 *                 type: string
 *                 description: Predefined user cohort to target
 *                 enum: [Students, Faculty Supervisors, Site Supervisors, Ineligible Students, Students Pending Placement]
 *               selectedRecipients: 
 *                 type: array
 *                 description: Explicit list of user IDs to receive the email (overrides category if provided)
 *                 items: { type: string, example: "60d0fe4f5311236168a109ca" }
 *               subject: 
 *                 type: string
 *                 description: Email subject line. Supports {{name}} placeholder.
 *                 example: "Important Update for Internship Cycle"
 *               message: 
 *                 type: string
 *                 description: Email body content. Supports {{name}} and {{reg}} placeholders.
 *                 example: "Hello {{name}}, please find the attached documents for your registration {{reg}}."
 *     responses:
 *       200:
 *         description: Detailed summary of broadcast execution including success and failure counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string, example: "Broadcast complete. Sent: 10, Failed: 0" }
 *       400:
 *         description: Missing mandatory fields or invalid category selection
 */
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

/**
 * @swagger
 * /office/recipients/{category}:
 *   get:
 *     summary: Retrieve a simple list of potential recipients for a given category
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Students, Faculty Supervisors, Site Supervisors, Ineligible Students, Students Pending Placement]
 *     responses:
 *       200:
 *         description: Array of recipient objects (name, email, reg, role)
 */
/**
 * @desc    Get recipient list filtered by category for broadcast selection
 * @route   GET api/office/recipients/:category
 * @access  Private (Office/HOD)
 */
router.get('/recipients/:category', protect, officeAuth, asyncHandler(async (req, res) => {
    let query = {};
    const { category } = req.params;
    
    // Determine the query based on the requested user category
    if (category === 'Students') query = { role: 'student' };
    else if (category === 'Faculty Supervisors') query = { role: 'faculty_supervisor' };
    else if (category === 'Site Supervisors') query = { role: 'site_supervisor' };
    else if (category === 'Ineligible Students') query = { role: 'student', status: { $nin: ['Assigned', 'Internship Approved', 'Agreement Approved'] } };
    else if (category === 'Students Pending Placement') query = { role: 'student', status: 'Agreement Approved' };
    else return res.status(400).json({ message: 'Invalid category' });

    res.json(await User.find(query).select('name email reg role'));
}));

/**
 * @swagger
 * /office/registered-students:
 *   get:
 *     summary: Retrieve the master registry of all students with deep associations
 *     description: Advanced retrieval of student records with populated faculty and site supervisors. Supports bulk fetching via ID lists and targeted searches.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Page offset index
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         description: Maximum records per request
 *         schema: { type: integer, default: 1000 }
 *       - in: query
 *         name: ids
 *         description: Comma-separated list of MongoDB IDs for bulk lookup
 *         schema: { type: string }
 *       - in: query
 *         name: facultyId
 *         description: Filter results by the assigned faculty supervisor's ID
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         description: Keyword search on name, registration, or email
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detailed student collection with populated supervisor objects
 */
/**
 * @desc    Get detailed student registry with search and relationship population
 * @route   GET api/office/registered-students
 * @access  Private (Office/HOD)
 */
router.get('/registered-students', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    let query = { role: 'student' };
    
    // Apply filters based on query parameters
    if (req.query.ids) query._id = { $in: req.query.ids.split(',').filter(x => x.length > 0) };
    if (req.query.facultyId) query.assignedFaculty = req.query.facultyId;
    
    if (req.query.search) {
        const s = req.query.search;
        query.$or = [{ name: { $regex: s, $options: 'i' } }, { reg: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
    }

    // Execute paginated query with populations
    const [total, students] = await Promise.all([
        User.countDocuments(query),
        User.find(query).populate('assignedFaculty', 'name email').populate('assignedSiteSupervisor', 'name email').select('-profilePicture').sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({ data: students, total, page, pages: Math.ceil(total / limit) });
}));

/**
 * @swagger
 * /office/internship-request-students:
 *   get:
 *     summary: Retrieve students filtered by their internship supervision request status
 *     description: Returns a list of students who have submitted internship requests, categorized by their current approval state.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 15 }
 *       - in: query
 *         name: search
 *         description: Search by student name, reg, email, or targeted company name
 *         schema: { type: string }
 *       - in: query
 *         name: filter
 *         description: Filter by the current status of the request
 *         schema: { type: string, enum: [all, pending, approved, rejected], default: "all" }
 *     responses:
 *       200:
 *         description: List of students matching the request filter
 */
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

/**
 * @swagger
 * /office/internship-request/{id}:
 *   get:
 *     summary: Retrieve detailed internship request for a specific student
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Student document with populated supervisor details
 */
/**
 * @desc    Get detailed internship request profile for a specific student ID
 * @route   GET api/office/internship-request/:id
 * @access  Private (Office/HOD)
 */
router.get('/internship-request/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.id).select('-profilePicture').populate('assignedFaculty', 'name email').populate('assignedSiteSupervisor', 'name email whatsappNumber').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
}));

/**
 * @swagger
 * /office/internship-request-stats:
 *   get:
 *     summary: Retrieve global statistics for internship supervision requests
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counts for all, pending, approved, and rejected requests
 */
/**
 * @desc    Get aggregate statistics for the internship request workflow
 * @route   GET api/office/internship-request-stats
 * @access  Private (Office/HOD)
 */
router.get('/internship-request-stats', protect, officeAuth, asyncHandler(async (req, res) => {
    const stats = await User.aggregate([
        { $match: { role: 'student', status: { $in: ['Internship Request Submitted', 'Internship Approved', 'Internship Rejected'] } } },
        {
            $group: {
                _id: null,
                all: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ["$status", 'Internship Request Submitted'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ["$status", 'Internship Approved'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ["$status", 'Internship Rejected'] }, 1, 0] } }
            }
        }
    ]);

    const result = stats[0] || { all: 0, pending: 0, approved: 0, rejected: 0 };
    res.json(result);
}));

/**
 * @swagger
 * /office/student-stats:
 *   get:
 *     summary: Retrieve comprehensive student analytics for the administrative dashboard
 *     description: Aggregates data across the student population to provide insights on eligibility, internship modes (onsite/remote), GPA distribution, and department demographics.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Multi-dimensional object containing aggregate counts and distributions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer, description: "Grand total of registered students" }
 *                 eligibility: 
 *                   type: object
 *                   properties:
 *                     eligible: { type: integer }
 *                     ineligible: { type: integer }
 *                 modes: 
 *                   type: object
 *                   description: Counts by internship engagement mode
 *                   properties:
 *                     onsite: { type: integer }
 *                     remote: { type: integer }
 *                     hybrid: { type: integer }
 *                     freelance: { type: integer }
 *                     unrequested: { type: integer }
 *                 gpa:
 *                   type: object
 *                   description: CGPA distribution counts
 *                   properties:
 *                     low: { type: integer, description: "< 2.0" }
 *                     medium: { type: integer, description: "2.0 - 3.5" }
 *                     high: { type: integer, description: ">= 3.5" }
 */
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

/**
 * @swagger
 * /office/check-faculty-by-email:
 *   get:
 *     summary: Verify existence of a faculty supervisor by email
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Search results containing faculty details if found
 */
/**
 * @desc    Check if a faculty member exists in the system by email
 * @route   GET api/office/check-faculty-by-email
 * @access  Private (Office/HOD)
 */
router.get('/check-faculty-by-email', protect, officeAuth, asyncHandler(async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email required' });
    
    const faculty = await User.findOne({ 
        email: email.toLowerCase().trim(), 
        role: 'faculty_supervisor' 
    }).select('name email status');
    
    res.json({ 
        found: !!faculty, 
        faculty: faculty ? { id: faculty._id, name: faculty.name, email: faculty.email, status: faculty.status } : null 
    });
}));

/**
 * @swagger
 * /office/assign-company:
 *   post:
 *     summary: Manually designate a company placement for a student
 *     description: Overwrites any existing company selection and links the student to the specified company in the registry.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, companyName]
 *             properties:
 *               studentId: 
 *                 type: string
 *                 description: MongoDB ID of the student user
 *               companyName: 
 *                 type: string
 *                 description: Matches an existing company name or creates a record if missing
 *     responses:
 *       200:
 *         description: Company assignment updated successfully
 *       404:
 *         description: studentId does not match any registered student
 */
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

/**
 * @swagger
 * /office/assign-site-supervisor:
 *   post:
 *     summary: Link a student to a specific site supervisor
 *     description: Assigns an existing site supervisor to a student. If only an email is provided and the supervisor exists in the system, the relationship is established by ID.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, siteSupervisorName]
 *             properties:
 *               studentId: { type: string, description: "MongoDB ID of the student" }
 *               siteSupervisorName: { type: string, description: "Full name of the company supervisor" }
 *               siteSupervisorEmail: { type: string, description: "Official email of the supervisor" }
 *               siteSupervisorPhone: { type: string, description: "WhatsApp or contact number" }
 *     responses:
 *       200:
 *         description: Site supervisor assigned and audit log recorded
 *       404:
 *         description: Student not found
 */
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

/**
 * @swagger
 * /office/assign-faculty-override:
 *   post:
 *     summary: Force-assign a faculty supervisor to a student (Administrative Override)
 *     description: Manually links a faculty member to a student, bypassing the normal selection workflow. Automatically sets the request status to 'Accepted'.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, facultyId]
 *             properties:
 *               studentId: { type: string, description: "Target student ID" }
 *               facultyId: { type: string, description: "Target faculty member ID" }
 *     responses:
 *       200:
 *         description: Faculty successfully assigned via administrative override
 */
/**
 * @desc    Manual override to assign a specific faculty member to a student
 * @route   POST api/office/assign-faculty-override
 * @access  Private (Office/HOD)
 */
router.post('/assign-faculty-override', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, facultyId, officeId } = req.body;
    const [student, faculty] = await Promise.all([User.findById(studentId), User.findById(facultyId)]);
    
    if (!student || !faculty || faculty.role !== 'faculty_supervisor') {
        return res.status(404).json({ message: 'Not found.' });
    }

    student.assignedFaculty = facultyId;
    // Set faculty status to Accepted as this is an administrative override
    if (student.internshipRequest) student.internshipRequest.facultyStatus = 'Accepted';
    
    await student.save();
    
    await new AuditLog({ 
        action: 'FACULTY_ASSIGNED_OVERRIDE', 
        performedBy: req.user._id, 
        targetUser: student._id, 
        details: `Faculty "${faculty.name}" assigned via override.`, 
        ipAddress: req.ip 
    }).save();
    
    res.json({ message: 'Faculty assigned.' });
}));

/**
 * @swagger
 * /office/check-site-supervisor-by-email:
 *   get:
 *     summary: Verify existence of a site supervisor by email
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Search results containing supervisor details if found
 */
/**
 * @desc    Check if a site supervisor exists in the system by email
 * @route   GET api/office/check-site-supervisor-by-email
 * @access  Private (Office/HOD)
 */
router.get('/check-site-supervisor-by-email', protect, officeAuth, asyncHandler(async (req, res) => {
    const sup = await User.findOne({ 
        email: req.query.email?.toLowerCase().trim(), 
        role: 'site_supervisor' 
    }).select('name email status whatsappNumber');
    
    res.json({ 
        found: !!sup, 
        supervisor: sup ? { id: sup._id, name: sup.name, email: sup.email, status: sup.status, phone: sup.whatsappNumber } : null 
    });
}));

/**
 * @swagger
 * /office/onboard-and-assign-site-supervisor:
 *   post:
 *     summary: Create a new supervisor account and immediately link to a student
 *     description: Combines the multi-step process of adding a company, creating a supervisor user, sending an activation link, and assigning that supervisor to a student into a single atomic operation.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, siteSupervisorName, siteSupervisorEmail, companyName]
 *             properties:
 *               studentId: { type: string }
 *               siteSupervisorName: { type: string }
 *               siteSupervisorEmail: { type: string }
 *               siteSupervisorPhone: { type: string }
 *               companyName: { type: string }
 *     responses:
 *       200:
 *         description: atomic onboarding and assignment complete
 *       400:
 *         description: Email conflict or missing fields
 */
/**
 * @desc    Onboard a new site supervisor and link them to a student placement
 * @route   POST api/office/onboard-and-assign-site-supervisor
 * @access  Private (Office/HOD)
 */
router.post('/onboard-and-assign-site-supervisor', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, siteSupervisorName, siteSupervisorEmail, siteSupervisorPhone, companyName, officeId } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const email = siteSupervisorEmail?.toLowerCase().trim();
    if (!email) return res.status(400).json({ message: 'Supervisor email is required.' });
    
    // Ensure email is not already used by another role
    const conflict = await User.findOne({ $or: [{ email }, { secondaryEmail: email }] });
    if (conflict) return res.status(400).json({ message: `Email "${email}" in use by ${conflict.role}.` });

    // Link supervisor to the company registry
    const company = await Company.findOneAndUpdate(
        { name: companyName.trim() }, 
        { 
            $setOnInsert: { name: companyName.trim(), source: 'student_submission' }, 
            $addToSet: { siteSupervisors: { name: siteSupervisorName, email, whatsappNumber: siteSupervisorPhone || '' } } 
        }, 
        { upsert: true, new: true }
    );

    let user = await User.findOne({ email });
    if (!user) {
        // Create new supervisor account with activation token
        const rawToken = crypto.randomBytes(32).toString('hex');
        user = new User({ 
            name: siteSupervisorName, 
            email, 
            whatsappNumber: siteSupervisorPhone || '', 
            role: 'site_supervisor', 
            status: 'Pending Activation', 
            activationToken: crypto.createHash('sha256').update(rawToken).digest('hex'), 
            activationExpires: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000, 
            password: crypto.randomBytes(16).toString('hex') 
        });
        await user.save();
        sendCompanySupervisorActivationEmail(email, rawToken, siteSupervisorName, company.name).catch(e => console.error(`[BACKGROUND_MAIL_FAIL] Site Supervisor Email: ${e.message}`));
    }

    // Link the student to the newly onboarded supervisor
    student.assignedCompanySupervisor = siteSupervisorName; 
    student.assignedCompanySupervisorEmail = email; 
    student.assignedSiteSupervisor = user._id;
    
    if (student.internshipRequest) { 
        student.internshipRequest.siteSupervisorName = siteSupervisorName; 
        student.internshipRequest.siteSupervisorEmail = email; 
        student.internshipRequest.siteSupervisorPhone = siteSupervisorPhone || ''; 
    }
    
    await student.save();
    res.json({ message: 'Supervisor onboarded and assigned.' });
}));

/**
 * @swagger
 * /office/onboard-and-assign-faculty:
 *   post:
 *     summary: Create a new faculty member account and assign them to a student
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, name, email]
 *             properties:
 *               studentId: { type: string }
 *               name: { type: string }
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Faculty onboarded and student assigned
 */
/**
 * @desc    Onboard a new faculty member and assign them to a student for supervision
 * @route   POST api/office/onboard-and-assign-faculty
 * @access  Private (Office/HOD)
 */
router.post('/onboard-and-assign-faculty', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, name, email } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const emailLower = email?.toLowerCase().trim();
    if (!emailLower) return res.status(400).json({ message: 'Faculty email is required.' });
    
    let faculty = await User.findOne({ $or: [{ email: emailLower }, { secondaryEmail: emailLower }] });
    if (!faculty) {
        // Create new faculty account with activation token
        const token = crypto.randomBytes(32).toString('hex');
        faculty = new User({ 
            name, 
            email: emailLower, 
            role: 'faculty_supervisor', 
            status: 'Pending Activation', 
            activationToken: crypto.createHash('sha256').update(token).digest('hex'), 
            activationExpires: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000, 
            password: crypto.randomBytes(16).toString('hex') 
        });
        await faculty.save();
        sendFacultyNominationEmail(emailLower, token, name).catch(e => console.error(`[BACKGROUND_MAIL_FAIL] Faculty Email: ${e.message}`));
    }

    student.assignedFaculty = faculty._id;
    if (student.internshipRequest) student.internshipRequest.facultyStatus = 'Accepted';
    
    await student.save();
    res.json({ message: 'Faculty assigned.' });
}));

/**
 * @swagger
 * /office/decide-request:
 *   post:
 *     summary: Approve or Reject an internship supervision request
 *     description: Processes the initial scholarship request submission. Triggers a notification to the student about the office decision.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, decision]
 *             properties:
 *               studentId: { type: string }
 *               decision: 
 *                 type: string
 *                 enum: [approve, reject]
 *               comment: 
 *                 type: string
 *                 description: Explanatory text for rejections
 *     responses:
 *       200:
 *         description: Decision successfully recorded
 */
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

/**
 * @swagger
 * /office/update-internship-dates:
 *   post:
 *     summary: Reschedule internship start and end dates for a student
 *     tags: [Office]
 */
router.post('/update-internship-dates', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, startDate, endDate, officeId } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    if (!student.internshipRequest) student.internshipRequest = {};
    
    if (startDate) student.internshipRequest.startDate = new Date(startDate);
    if (endDate) student.internshipRequest.endDate = new Date(endDate);
    
    await student.save();
    await new AuditLog({ action: 'INTERNSHIP_DATES_UPDATED', performedBy: req.user._id, targetUser: student._id, details: `Updated dates: ${startDate} to ${endDate}`, ipAddress: req.ip }).save();
    
    res.json({ message: 'Internship dates updated successfully.' });
}));

/**
 * @swagger
 * /office/reverse-student-status:
 *   post:
 *     summary: Revert a student's status to a previous phase
 *     tags: [Office]
 */
router.post('/reverse-student-status', protect, officeAuth, asyncHandler(async (req, res) => {
    const { studentId, newStatus, officeId } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const oldStatus = student.status;
    student.status = newStatus;
    
    await student.save();
    await new AuditLog({ action: 'STUDENT_STATUS_REVERSED', performedBy: req.user._id, targetUser: student._id, details: `Status reversed from "${oldStatus}" to "${newStatus}"`, ipAddress: req.ip }).save();
    
    res.json({ message: `Student status reverted to ${newStatus}.` });
}));

/**
 * @swagger
 * /office/pending-agreements:
 *   get:
 *     summary: Retrieve students with currently pending internship agreement submissions
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of students in agreement-pending states
 */
/**
 * @desc    Get all students who have submitted an agreement awaiting office approval
 * @route   GET api/office/pending-agreements
 * @access  Private (Office/HOD)
 */
router.get('/pending-agreements', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await User.find({ 
        status: { $in: ['Agreement Submitted - Self', 'Agreement Submitted - University Assigned'] }, 
        role: 'student' 
    }).select('-profilePicture'));
}));

/**
 * @swagger
 * /office/decide-agreement:
 *   post:
 *     summary: Authoritative decision on student-submitted internship agreements
 *     description: Approving an agreement marks the student as officially placed and syncs the company/supervisor data to their profile and the global registry.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, decision]
 *             properties:
 *               studentId: { type: string }
 *               decision: 
 *                 type: string
 *                 enum: [approve, reject]
 *               comment: 
 *                 type: string
 *                 description: Feedback provided to the student on rejection
 *     responses:
 *       200:
 *         description: Agreement status updated and registry synced
 */
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

/**
 * @swagger
 * /office/approved-students:
 *   get:
 *     summary: Retrieve students whose internship agreements are approved
 *     description: Returns a list of students who have cleared the agreement phase and are ready for official assignment. Includes populated faculty documentation.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of student objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id: { type: string }
 *                   name: { type: string }
 *                   reg: { type: string }
 *                   status: { type: string, example: "Agreement Approved" }
 *                   assignedFaculty: 
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       email: { type: string }
 */
/**
 * @desc    Get all students with status 'Agreement Approved'
 * @route   GET api/office/approved-students
 * @access  Private (Office/HOD)
 */
router.get('/approved-students', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await User.find({ status: 'Agreement Approved', role: 'student' }).populate('assignedFaculty', 'name email'));
}));

/**
 * @swagger
 * /office/assigned-students:
 *   get:
 *     summary: Retrieve students who have been officially assigned to supervisor and company
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned students with faculty names
 */
/**
 * @desc    Get all students with status 'Assigned'
 * @route   GET api/office/assigned-students
 * @access  Private (Office/HOD)
 */
router.get('/assigned-students', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await User.find({ status: 'Assigned', role: 'student' }).populate('assignedFaculty', 'name'));
}));

/**
 * @swagger
 * /office/assign-student:
 *   post:
 *     summary: Finalize a student's internship placement
 *     description: The final administrative step that officially links a student to a faculty supervisor and a placement company. Triggers confirmation emails to all three parties.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, facultyId, companyName, siteSupervisor]
 *             properties:
 *               studentId: 
 *                 type: string
 *                 description: ID of the student being placed
 *               facultyId: 
 *                 type: string
 *                 description: ID of the assigned faculty supervisor
 *               companyName: 
 *                 type: string
 *                 description: Corporate name of the placement site
 *               siteSupervisor: 
 *                 type: object
 *                 description: Contact details for the industry supervisor
 *                 required: [name, email]
 *                 properties:
 *                   name: { type: string }
 *                   email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Student successfully assigned and notified
 *       400:
 *         description: Validation error or invalid user roles
 */
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

    // Dispatch emails in the background to ensure instant UI response
    Promise.all([
        sendAssignmentConfirmationEmail(student.email, student.name, { companyName, siteSupervisor, facultySupervisor: { name: faculty.name, whatsappNumber: faculty.whatsappNumber } }),
        sendFacultyAssignmentNotificationEmail(faculty.email, faculty.name, { studentName: student.name, studentReg: student.reg, companyName }),
        email ? sendSupervisorAssignmentNotificationEmail(email, siteSupervisor.name, { studentName: student.name, studentReg: student.reg, companyName }) : Promise.resolve()
    ]).catch(err => {
        console.error('[BACKGROUND_MAIL_ERROR] Assignment notifications failed:', err.message);
    });

    res.json({ message: 'Student assigned.' });
}));

/**
 * @swagger
 * /office/companies/dropdown:
 *   get:
 *     summary: Retrieve a simplified list of active companies for selection menus
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies with MOU status and site supervisors
 */
/**
 * @desc    Get active company list for dropdown consumption in frontend
 * @route   GET api/office/companies/dropdown
 * @access  Private (Office/HOD)
 */
router.get('/companies/dropdown', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await Company.find({ status: 'Active' })
        .select('name status siteSupervisors isMOUSigned category')
        .sort({ isMOUSigned: -1, name: 1 })
        .lean());
}));

/**
 * @swagger
 * /office/site-supervisors:
 *   get:
 *     summary: Retrieve human-resource registry of all industry supervisors
 *     description: Aggregates unique supervisors across all company records. Provides current student workload counts per supervisor.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Pagination index
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         description: Page size
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         description: Matches supervisor name or email address
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated unique supervisor list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       email: { type: string }
 *                       whatsappNumber: { type: string }
 *                       assignedStudents: { type: integer, description: "Current workload" }
 */
/**
 * @desc    Build a unique list of site supervisors by extracting them from the Company model
 * @route   GET api/office/site-supervisors
 * @access  Private (Office/HOD)
 */
router.get('/site-supervisors', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

    const [companies, students] = await Promise.all([
        Company.find({ status: 'Active' }).select('name siteSupervisors').lean(),
        User.aggregate([
            { $match: { role: 'student', assignedCompany: { $exists: true, $ne: '' }, assignedCompanySupervisor: { $exists: true, $ne: '' } } },
            { $group: { 
                _id: { email: { $toLower: "$assignedCompanySupervisorEmail" }, name: "$assignedCompanySupervisor" }, 
                company: { $first: "$assignedCompany" },
                whatsapp: { $first: "$whatsappNumber" } 
            } }
        ])
    ]);

    const supervisorMap = {};
    
    // 1. Process from Company Registry
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

    const companyNameMap = Object.fromEntries(companies.map(c => [c.name.toLowerCase().trim(), c]));

    students.forEach(p => {
        const email = p._id.email || '';
        const name = p._id.name || 'Unknown';
        if (search && !new RegExp(search, 'i').test(name) && !new RegExp(search, 'i').test(email)) return;
        
        const key = email || name;
        const targetCompany = companyNameMap[p.company?.toLowerCase().trim()];
        
        if (!supervisorMap[key]) {
            supervisorMap[key] = { name, email, whatsappNumber: p.whatsapp, companies: targetCompany ? [{ id: targetCompany._id, name: targetCompany.name }] : [] };
        } else if (targetCompany) {
            if (!supervisorMap[key].companies.find(comp => comp.id.toString() === targetCompany._id.toString())) {
                supervisorMap[key].companies.push({ id: targetCompany._id, name: targetCompany.name });
            }
        }
    });

    const all = Object.values(supervisorMap);
    const paginated = all.slice((page - 1) * limit, page * limit);
    const emails = paginated.map(s => s.email).filter(Boolean);
    
    // Fetch workload counts and User status for the paginated list
    const [assignments, users] = await Promise.all([
        User.aggregate([
            { $match: { role: 'student', assignedCompanySupervisorEmail: { $in: emails } } }, 
            { $group: { _id: '$assignedCompanySupervisorEmail', count: { $sum: 1 } } }
        ]),
        User.find({ email: { $in: emails }, role: 'site_supervisor' }).select('email status _id').lean()
    ]);

    const countMap = Object.fromEntries(assignments.map(a => [a._id, a.count]));
    const userMapData = Object.fromEntries(users.map(u => [u.email, { status: u.status, id: u._id }]));

    res.json({ 
        data: paginated.map(s => {
            const u = userMapData[s.email];
            return { 
                ...s, 
                assignedStudents: countMap[s.email] || 0,
                status: u ? u.status : 'Not Registered',
                userId: u ? u.id : null
            };
        }), 
        total: all.length, page, pages: Math.ceil(all.length / limit) 
    });
}));

/**
 * @swagger
 * /office/supervisor-students:
 *   get:
 *     summary: Retrieve list of students assigned to a specific company or site supervisor
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company
 *         schema: { type: string }
 *       - in: query
 *         name: supervisor
 *         schema: { type: string }
 *       - in: query
 *         name: email
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of student profiles
 */
/**
 * @desc    Fetch students based on their company or site supervisor identity
 * @route   GET api/office/supervisor-students
 * @access  Private (Office/HOD)
 */
router.get('/supervisor-students', protect, officeAuth, asyncHandler(async (req, res) => {
    const { company, supervisor, email } = req.query;
    if (!company && !supervisor && !email) return res.json([]); 

    const query = { role: 'student' };
    const escapeRegex = string => string?.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&') || '';

    if (email) query.assignedCompanySupervisorEmail = email.toLowerCase().trim();
    if (company) query.assignedCompany = { $regex: new RegExp(`^${escapeRegex(company.trim())}$`, 'i') };
    if (supervisor) query.assignedCompanySupervisor = { $regex: new RegExp(`^${escapeRegex(supervisor.trim())}$`, 'i') };

    res.json(await User.find(query).select('name email reg semester status').lean());
}));

/**
 * @swagger
 * /office/companies:
 *   get:
 *     summary: Fetch the master company registry with detailed engagement metrics
 *     description: Provides a comprehensive overview of all partner companies, including MOU status, internal site supervisors, and active student assignment counts.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Result page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         description: Results per page
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         description: Keyword search on company name, regNo, or scope
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detailed paginated company registry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       isMOUSigned: { type: boolean }
 *                       assignedStudents: { type: integer }
 *                       siteSupervisors: { type: array, items: { type: object } }
 */
/**
 * @desc    Get detailed company registry with search and aggregated assignment metrics
 * @route   GET api/office/companies
 * @access  Private (Office/HOD)
 */
router.get('/companies', protect, officeAuth, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    
    let query = { status: 'Active' };
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } }, 
            { regNo: { $regex: search, $options: 'i' } }, 
            { scope: { $regex: search, $options: 'i' } }
        ];
    }

    const [total, companies] = await Promise.all([
        Company.countDocuments(query), 
        Company.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);
    
    const names = companies.map(c => c.name);
    const emails = companies.flatMap(c => (c.siteSupervisors || []).map(s => s.email?.toLowerCase()?.trim())).filter(Boolean);

    // Fetch aggregate statistics for companies and their supervisors
    const [compAs, emailAs] = await Promise.all([
        User.aggregate([{ $match: { role: 'student', assignedCompany: { $in: names } } }, { $group: { _id: '$assignedCompany', count: { $sum: 1 } } }]),
        User.aggregate([{ $match: { role: 'student', assignedCompanySupervisorEmail: { $in: emails } } }, { $group: { _id: '$assignedCompanySupervisorEmail', count: { $sum: 1 } } }])
    ]);

    const compMap = Object.fromEntries(compAs.map(a => [a._id, a.count]));
    const emailMap = Object.fromEntries(emailAs.map(a => [a._id, a.count]));

    res.json({ 
        data: await Promise.all(companies.map(async (c) => {
            const companyObj = c.toObject();
            
            // 1. Get supervisors explicitly saved in the company document
            const registrySupervisors = companyObj.siteSupervisors || [];
            
            // 2. Fetch supervisors from students actually assigned to this company
            // This catches "Student Lead" submissions that might not have been fully synced to the registry
            const studentPlacements = await User.find({ 
                role: 'student', 
                assignedCompany: c.name,
                assignedCompanySupervisor: { $exists: true, $ne: '' }
            }).select('assignedCompanySupervisor assignedCompanySupervisorEmail whatsappNumber').lean();

            // 3. Merge them based on email or name to ensure no duplicates but full coverage
            const combinedMap = new Map();
            
            // Add from registry first (official ones)
            registrySupervisors.forEach(s => {
                const key = s.email?.toLowerCase().trim() || s.name?.toLowerCase().trim();
                if (key) combinedMap.set(key, { ...s, assignedStudents: emailMap[s.email?.toLowerCase()?.trim()] || 0 });
            });

            // Add from student placements (dynamic ones)
            studentPlacements.forEach(p => {
                const key = p.assignedCompanySupervisorEmail?.toLowerCase().trim() || p.assignedCompanySupervisor?.toLowerCase().trim();
                if (key && !combinedMap.has(key)) {
                    combinedMap.set(key, {
                        name: p.assignedCompanySupervisor,
                        email: p.assignedCompanySupervisorEmail || '',
                        whatsappNumber: p.whatsappNumber || '',
                        assignedStudents: emailMap[p.assignedCompanySupervisorEmail?.toLowerCase()?.trim()] || 0
                    });
                }
            });

            return { 
                ...companyObj, 
                assignedStudents: compMap[c.name] || 0, 
                siteSupervisors: Array.from(combinedMap.values())
            };
        })), 
        total, page, pages: Math.ceil(total / limit) 
    });
}));

/**
 * @swagger
 * /office/add-company:
 *   post:
 *     summary: Add a new partner company to the internship database
 *     description: Manually registers a company and can optionally onboard its supervisors simultaneously.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, description: "Official company name" }
 *               address: { type: string }
 *               regNo: { type: string, description: "Official registration or tax ID" }
 *               scope: { type: string, description: "Business domains/industries" }
 *               hrEmail: { type: string, format: email }
 *               isMOUSigned: { type: boolean }
 *               siteSupervisors: 
 *                 type: array
 *                 items: 
 *                   type: object
 *                   required: [name, email]
 *                   properties:
 *                     name: { type: string }
 *                     email: { type: string }
 *                     whatsappNumber: { type: string }
 *     responses:
 *       200:
 *         description: Company registered and supervisors onboarded
 *       400:
 *         description: Company already exists
 */
/**
 * @desc    Manually add a company and optionally its supervisors to the system
 * @route   POST api/office/add-company
 * @access  Private (Office/HOD)
 */
router.post('/add-company', protect, officeAuth, async (req, res, next) => {
    try {
        const { name, regNo, siteSupervisors } = req.body;
        
        // Prevent duplicate company entries
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

        // Automatically onboard supervisors if provided during company creation
        if (siteSupervisors?.length > 0) {
            for (const s of siteSupervisors) {
                const email = s.email?.toLowerCase()?.trim();
                if (!email) continue;
                
                if (!await User.findOne({ $or: [{ email }, { secondaryEmail: email }] })) {
                    const token = crypto.randomBytes(32).toString('hex');
                    await new User({ 
                        name: s.name, email, whatsappNumber: s.whatsappNumber, 
                        role: 'site_supervisor', status: 'Pending Activation', 
                        activationToken: crypto.createHash('sha256').update(token).digest('hex'), 
                        activationExpires: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000, 
                        password: crypto.randomBytes(16).toString('hex') 
                    }).save();
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

/**
 * @swagger
 * /office/edit-company/{id}:
 *   post:
 *     summary: Update metadata for an existing company entry
 *     description: Modifies registry details like MOU status, HR contacts, or business scope.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, description: "MongoDB ID of the company record" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               regNo: { type: string }
 *               isMOUSigned: { type: boolean }
 *               hrEmail: { type: string }
 *     responses:
 *       200:
 *         description: Record successfully updated
 *       404:
 *         description: ID not found
 */
/**
 * @desc    Update company metadata and supervisor lists
 * @route   POST api/office/edit-company/:id
 * @access  Private (Office/HOD)
 */
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

/**
 * @swagger
 * /office/add-site-supervisor:
 *   post:
 *     summary: Manually link a site supervisor to a registered company
 *     description: Adds a supervisor to a company's internal registry and creates a user account for them with an activation link.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyId, name, email]
 *             properties:
 *               companyId: { type: string, description: "ID of the company registry entry" }
 *               name: { type: string, description: "Supervisor full name" }
 *               email: { type: string, format: email, description: "Professional email for invitation" }
 *               whatsappNumber: { type: string }
 *     responses:
 *       200:
 *         description: Supervisor linked and user account generated
 *       400:
 *         description: Email conflict or supervisor already linked
 */
/**
 * @desc    Link an individual supervisor to a company and create their user account
 * @route   POST api/office/add-site-supervisor
 * @access  Private (Office/HOD)
 */
router.post('/add-site-supervisor', protect, officeAuth, asyncHandler(async (req, res) => {
    const { companyId, name, email, whatsappNumber, officeId } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Not found.' });

    const mail = email?.toLowerCase()?.trim();
    if (!mail) return res.status(400).json({ message: 'Email is required.' });
    
    // Check for role conflicts or duplicates
    if (await User.findOne({ $or: [{ email: mail }, { secondaryEmail: mail }] })) return res.status(400).json({ message: 'Email in use.' });
    if (company.siteSupervisors.some(s => s.email === mail)) return res.status(400).json({ message: 'Already linked.' });

    company.siteSupervisors.push({ name, email: mail, whatsappNumber });
    await company.save();

    const token = crypto.randomBytes(32).toString('hex');
    await new User({ 
        name, email: mail, whatsappNumber, 
        role: 'site_supervisor', status: 'Pending Activation', 
        activationToken: crypto.createHash('sha256').update(token).digest('hex'), 
        activationExpires: Date.now() + 86400000, 
        password: crypto.randomBytes(16).toString('hex') 
    }).save();
    
    await sendCompanySupervisorActivationEmail(mail, token, name, company.name);

    await new AuditLog({ action: 'SUPERVISOR_LINKED', performedBy: req.user._id, details: `Linked ${name} to ${company.name}`, ipAddress: req.ip }).save();
    res.json({ message: 'Linked.' });
}));

/**
 * @swagger
 * /office/edit-site-supervisor/{id}:
 *   post:
 *     summary: Update profile information for a site supervisor
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, description: "Supervisor email" }
 *     responses:
 *       200:
 *         description: Supervisor profile and company records updated
 */
/**
 * @desc    Update site supervisor profile and sync changes to all associated company records
 * @route   POST api/office/edit-site-supervisor/:id
 * @access  Private (Office/HOD)
 */
router.post('/edit-site-supervisor/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const { name, email, whatsappNumber } = req.body;
    const mail = (email || req.params.id)?.toLowerCase()?.trim();
    
    // Update the supervisor user object
    const user = await User.findOne({ email: mail });
    if (user) { 
        user.name = name || user.name; 
        user.whatsappNumber = whatsappNumber || user.whatsappNumber; 
        await user.save(); 
    }
    
    // Sync the name and phone changes to all companies where this supervisor is listed
    await Company.updateMany(
        { 'siteSupervisors.email': mail }, 
        { $set: { 'siteSupervisors.$.name': name || user?.name, 'siteSupervisors.$.whatsappNumber': whatsappNumber || user?.whatsappNumber } }
    );
    
    await new AuditLog({ action: 'SUPERVISOR_UPDATED', performedBy: req.user._id, details: `Updated: ${mail}`, ipAddress: req.ip }).save();
    res.json({ message: 'Updated.' });
}));

/**
 * @swagger
 * /office/remove-site-supervisor:
 *   post:
 *     summary: Unlink a site supervisor from a company registry entry
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, companyId]
 *             properties:
 *               email: { type: string }
 *               companyId: { type: string }
 *     responses:
 *       200:
 *         description: Supervisor unlinked from the company
 */
router.post('/remove-site-supervisor', protect, officeAuth, asyncHandler(async (req, res) => {
    const { email, companyId } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Not found.' });
    const mailToLink = email?.toLowerCase()?.trim();
    if (!mailToLink) return res.status(400).json({ message: 'Email required.' });
    
    company.siteSupervisors = company.siteSupervisors.filter(s => s.email !== mailToLink);
    await company.save();
    
    // Check if supervisor is linked to any other companies
    const inOtherCompany = await Company.findOne({ 
        _id: { $ne: companyId },
        'siteSupervisors.email': mailToLink 
    });
    
    // If not in any other company, completely remove the User record from the database
    if (!inOtherCompany) {
        await User.findOneAndDelete({ email: mailToLink, role: 'site_supervisor' });
    }

    await new AuditLog({ action: 'SUPERVISOR_REMOVED', performedBy: req.user._id, details: `Removed ${email} from ${company.name}`, ipAddress: req.ip }).save();
    res.json({ message: 'Removed.' });
}));

/**
 * @swagger
 * /office/onboard-faculty:
 *   post:
 *     summary: Manually onboard a new faculty supervisor
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               whatsappNumber: { type: string }
 *     responses:
 *       201:
 *         description: Faculty account created and invitation sent
 */
/**
 * @desc    Create a new faculty account and trigger nomination email
 * @route   POST api/office/onboard-faculty
 * @access  Private (Office/HOD)
 */
router.post('/onboard-faculty', protect, officeAuth, asyncHandler(async (req, res) => {
    const { name, email, whatsappNumber } = req.body;
    const mail = email?.toLowerCase()?.trim();
    if (!mail) return res.status(400).json({ message: 'Email is required.' });
    if (await User.findOne({ $or: [{ email: mail }, { secondaryEmail: mail }] })) return res.status(400).json({ message: 'Email in use.' });

    const token = crypto.randomBytes(32).toString('hex');
    const f = new User({ 
        name, email: mail, whatsappNumber, 
        role: 'faculty_supervisor', status: 'Pending Activation', 
        activationToken: crypto.createHash('sha256').update(token).digest('hex'), 
        activationExpires: Date.now() + 86400000, 
        password: crypto.randomBytes(16).toString('hex') 
    });
    await f.save();
    
    await sendFacultyNominationEmail(mail, token, name);
    await new AuditLog({ action: 'FACULTY_ONBOARD', performedBy: req.user._id, targetUser: f._id, details: `Onboarded ${name}`, ipAddress: req.ip }).save();
    res.status(201).json({ message: 'Faculty onboarded.' });
}));

/**
 * @swagger
 * /office/onboard-student:
 *   post:
 *     summary: Administratively onboard a new student into the system
 *     description: Creates a new student user and dispatches an activation email with a default password. Standardizes registration numbers to CIIT/ROLL/ATD format.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, reg, email]
 *             properties:
 *               name: { type: string, description: "Full student name" }
 *               reg: { type: string, description: "Registration number (e.g., FA21-BCS-001)" }
 *               email: { type: string, format: email }
 *               semester: { type: integer, example: 7 }
 *               fatherName: { type: string }
 *               whatsappNumber: { type: string }
 *               section: { type: string, example: "A" }
 *               cgpa: { type: number, format: float, example: 3.55 }
 *     responses:
 *       201:
 *         description: Student successfully onboarded
 *       400:
 *         description: Student with this email or registration already exists
 */
router.post('/onboard-student', protect, officeAuth, asyncHandler(async (req, res) => {
    const { name, reg, email, semester, fatherName, whatsappNumber, section, cgpa } = req.body;
    const mail = email?.toLowerCase()?.trim();
    let r = reg?.toUpperCase()?.trim();
    
    if (r) {
        // Remove existing CIIT/ and /ATD to avoid duplication if partially entered
        r = r.replace(/^CIIT\//i, '').replace(/\/ATD$/i, '');
        // Re-apply standard format
        r = `CIIT/${r}/ATD`;
    }
    
    if (!mail || !r) return res.status(400).json({ message: 'Email and Registration Number are required.' });
    if (await User.findOne({ $or: [{ email: mail }, { reg: r }] })) return res.status(400).json({ message: 'Exists.' });

    const defaultPassword = 'Megamix@123';
    const defaultHashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    const s = new User({ 
        name: name.trim(), reg: r, email: mail, semester, fatherName: fatherName?.trim(), 
        whatsappNumber: whatsappNumber?.trim(), section: section?.toUpperCase().trim(), 
        cgpa: cgpa ? parseFloat(cgpa).toFixed(2) : null, role: 'student', status: 'verified', 
        password: defaultHashedPassword, mustChangePassword: false 
    });
    
    await s.save();
    await new AuditLog({ action: 'STUDENT_ONBOARD', performedBy: req.user._id, targetUser: s._id, details: `Onboarded ${r}`, ipAddress: req.ip }).save();
    
    try { 
        await sendStudentActivationEmail(mail, name, defaultPassword); 
    } catch (e) { 
        return res.status(201).json({ success: true, message: 'Created, but email failed.' }); 
    }
    res.status(201).json({ success: true, message: 'Onboarded.' });
}));

/**
 * @swagger
 * /office/edit-student/{id}:
 *   post:
 *     summary: Update profile and registration metadata for a student
 *     description: Modifies student core data. Re-validates registration number and email uniqueness if changed.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, description: "Student's MongoDB ID" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               reg: { type: string }
 *               email: { type: string }
 *               semester: { type: integer }
 *               cgpa: { type: number }
 *               whatsappNumber: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *       404:
 *         description: Student not found
 */
/**
 * @desc    Edit student metadata and handle registration/email normalization
 * @route   POST api/office/edit-student/:id
 * @access  Private (Office/HOD)
 */
router.post('/edit-student/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const { name, reg, email, semester, fatherName, whatsappNumber, section, cgpa } = req.body;
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ message: 'Student not found.' });

    const mail = email?.toLowerCase()?.trim();
    let r = reg?.toUpperCase()?.trim();
    if (r) {
        // Enforce registration number formatting
        r = r.replace(/^CIIT\//i, '').replace(/\/ATD$/i, '');
        r = `CIIT/${r}/ATD`;
    }

    if (mail && mail !== student.email) {
        if (await User.findOne({ email: mail })) return res.status(400).json({ message: 'Email already in use.' });
        student.email = mail;
    }
    if (r && r !== student.reg) {
        if (await User.findOne({ reg: r })) return res.status(400).json({ message: 'Registration number already in use.' });
        student.reg = r;
    }

    student.name = name?.trim() || student.name;
    student.semester = semester || student.semester;
    student.fatherName = fatherName?.trim() || student.fatherName;
    student.whatsappNumber = whatsappNumber?.trim() || student.whatsappNumber;
    student.section = section?.toUpperCase().trim() || student.section;
    student.cgpa = cgpa ? parseFloat(cgpa).toFixed(2) : (cgpa === '' ? null : student.cgpa);

    await student.save();
    await new AuditLog({ action: 'STUDENT_EDIT', performedBy: req.user._id, targetUser: student._id, details: `Edited student ${student.reg}`, ipAddress: req.ip }).save();
    res.json({ message: 'Student profile updated.' });
}));

/**
 * @swagger
 * /office/resend-student-activation:
 *   post:
 *     summary: Resend account activation link to a student
 *     tags: [Office]
 */
/**
 * @desc    Generate a new activation token and resend email to an unverified student
 * @route   POST api/office/resend-student-activation
 * @access  Private (Office/HOD)
 */
router.post('/resend-student-activation', protect, officeAuth, asyncHandler(async (req, res) => {
    const s = await User.findById(req.body.studentId);
    if (!s) return res.status(404).json({ message: 'Student not found.' });
    
    const defaultPassword = 'Megamix@123';
    const result = await sendStudentActivationEmail(s.email, s.name, defaultPassword); 

    if (!result.success) {
        return res.status(500).json({ message: `Email failed: ${result.error || 'Server rejection'}` });
    }
    
    res.json({ message: 'Resent.' });
}));
/**
 * @swagger
 * /office/resend-faculty-activation:
 *   post:
 *     summary: Resend account activation link to a faculty member
 *     tags: [Office]
 */
/**
 * @desc    Generate a new activation token and resend nomination email to a faculty supervisor
 * @route   POST api/office/resend-faculty-activation
 * @access  Private (Office/HOD)
 */
router.post('/resend-faculty-activation', protect, officeAuth, asyncHandler(async (req, res) => {
    const f = await User.findById(req.body.facultyId);
    if (!f || f.status === 'Active') return res.status(400).json({ message: 'User is already active or invalid.' });
    
    const tok = crypto.randomBytes(32).toString('hex');
    f.activationToken = crypto.createHash('sha256').update(tok).digest('hex'); 
    f.activationExpires = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
    await f.save();
    
    const result = await sendFacultyNominationEmail(f.email, tok, f.name);
    if (!result.success) {
        return res.status(500).json({ message: `Activation dispatch failed: ${result.error || 'Check service'}` });
    }
    
    res.json({ message: 'Resent.' });
}));

/**
 * @swagger
 * /office/resend-supervisor-activation:
 *   post:
 *     summary: Resend account activation link to a site supervisor
 *     tags: [Office]
 */
router.post('/resend-supervisor-activation', protect, officeAuth, asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'site_supervisor' });
    if (!user) return res.status(404).json({ message: 'Supervisor account not found.' });
    if (user.status !== 'Pending Activation') return res.status(400).json({ message: 'Supervisor is already active or cannot be resent activation.' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.activationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.activationExpires = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000; 
    await user.save();

    const company = await Company.findOne({ 'siteSupervisors.email': user.email });
    const result = await sendCompanySupervisorActivationEmail(user.email, rawToken, user.name, company?.name || 'Assigned Company');
    
    if (!result.success) {
        return res.status(500).json({ message: `Failed to send email: ${result.error}` });
    }

    res.json({ message: 'Activation link resent successfully.' });
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
    if (f) { 
        await User.findByIdAndDelete(req.params.id); 
        await AuditLog.create({ action: 'FACULTY_DELETED', performedBy: req.user._id, details: `Deleted faculty ${f.email}`, ipAddress: req.ip });
    }
    res.json({ message: 'Faculty permanently deleted from database.' });
}));

/**
 * @swagger
 * /office/delete-student/{id}:
 *   post:
 *     summary: Permanently delete a student record from the system
 *     tags: [Office]
 */
router.post('/delete-student/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const s = await User.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Student not found.' });
    
    await User.findByIdAndDelete(req.params.id);
    await AuditLog.create({ action: 'STUDENT_DELETED', performedBy: req.user._id, details: `Deleted student ${s.email} (${s.reg})`, ipAddress: req.ip });
    
    res.json({ message: 'Student permanently deleted from database.' });
}));

/**
 * @swagger
 * /office/reset-supervisor-password/{id}:
 *   post:
 *     summary: Administratively reset industry supervisor password
 *     tags: [Office]
 */
router.post('/reset-supervisor-password/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const s = await User.findById(req.params.id);
    if (!s || s.role !== 'site_supervisor') return res.status(404).json({ message: 'Not found.' });
    
    const pw = Math.random().toString(36).slice(-8);
    s.password = await bcrypt.hash(pw, 12); 
    s.mustChangePassword = false;
    await s.save();
    
    await sendFacultyPasswordResetEmail(s.email, pw, s.name); // Using same template is fine as it's generic
    res.json({ message: 'Password reset and email sent.' });
}));

/**
 * @swagger
 * /office/reset-faculty-password/{id}:
 *   post:
 *     summary: Force-reset a faculty supervisor's password
 *     tags: [Office]
 */
/**
 * @desc    Generate a temporary password for a faculty member and send it via email
 * @route   POST api/office/reset-faculty-password/:id
 * @access  Private (Office/HOD)
 */
router.post('/reset-faculty-password/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const f = await User.findById(req.params.id);
    if (!f || f.role !== 'faculty_supervisor') return res.status(404).json({ message: 'Not found.' });
    
    // Generate an 8-character random hex password
    const pw = crypto.randomBytes(4).toString('hex');
    f.password = await bcrypt.hash(pw, 12); 
    f.mustChangePassword = false;
    
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

/**
 * @swagger
 * /office/create-assignment:
 *   post:
 *     summary: Generate a global internship assignment or task
 *     description: Creates a new grading or submission requirement for all students. Logs creation in the audit trail.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, totalMarks, deadline]
 *             properties:
 *               title: { type: string, example: "Midway Progress Report" }
 *               instructions: { type: string }
 *               totalMarks: { type: integer, example: 10 }
 *               deadline: { type: string, format: date-time }
 *               type: { type: string, enum: [submission, evaluation, other] }
 *     responses:
 *       200:
 *         description: Assignment successfully deployed
 */
router.post('/create-assignment', protect, officeAuth, asyncHandler(async (req, res) => {
    const a = new Assignment({ ...req.body, createdBy: req.user._id });
    await a.save();
    await new AuditLog({ action: 'ASSIGNMENT_CREATED', performedBy: req.user._id, details: `Created: ${a.title}`, ipAddress: req.ip }).save();
    res.json({ message: 'Created.', assignment: a });
}));

/**
 * @swagger
 * /office/assignments:
 *   get:
 *     summary: Retrieve all global internship assignments
 *     tags: [Office]
 */
/**
 * @desc    Get complete list of assignments sorted by creation date
 * @route   GET api/office/assignments
 * @access  Private (Office/HOD)
 */
router.get('/assignments', protect, officeAuth, asyncHandler(async (req, res) => {
    res.json(await Assignment.find().sort({ createdAt: -1 }));
}));

/**
 * @swagger
 * /office/update-assignment/{id}:
 *   put:
 *     summary: Update an existing internship assignment's details
 *     tags: [Office]
 */
/**
 * @desc    Modify assignment fields (title, instructions, deadline, etc.)
 * @route   PUT api/office/update-assignment/:id
 * @access  Private (Office/HOD)
 */
router.put('/update-assignment/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const a = await Assignment.findById(req.params.id);
    if (a) { Object.assign(a, req.body); await a.save(); }
    res.json({ message: 'Updated.', assignment: a });
}));

/**
 * @swagger
 * /office/override-deadline:
 *   post:
 *     summary: Configure a faculty-specific deadline override
 *     description: Allows the office to extend or restrict deadlines for students assigned to a particular faculty member.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignmentId, facultyId, newDeadline]
 *             properties:
 *               assignmentId: { type: string }
 *               facultyId: { type: string }
 *               newDeadline: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Override successfully applied
 */
/**
 * @desc    Create or update a deadline override for a specific faculty member
 * @route   POST api/office/override-deadline
 * @access  Private (Office/HOD)
 */
router.post('/override-deadline', protect, officeAuth, asyncHandler(async (req, res) => {
    const a = await Assignment.findById(req.body.assignmentId);
    if (!a) return res.status(404).json({ message: 'Not found.' });
    
    const idx = a.overrides.findIndex(o => o.facultyId.toString() === req.body.facultyId);
    if (idx > -1) a.overrides[idx].deadline = req.body.newDeadline; 
    else a.overrides.push({ facultyId: req.body.facultyId, deadline: req.body.newDeadline });
    
    await a.save();
    res.json({ message: 'Override applied.' });
}));

/**
 * @swagger
 * /office/all-marks:
 *   get:
 *     summary: Retrieve grading records across all students and assignments
 *     tags: [Office]
 */
/**
 * @desc    Get comprehensive marks list with filtering by program and semester
 * @route   GET api/office/all-marks
 * @access  Private (Office/HOD)
 */
router.get('/all-marks', protect, officeAuth, asyncHandler(async (req, res) => {
    const { program, semester } = req.query;
    let match = { role: 'student' };
    
    // Filter by department/program
    if (program === 'BCS' || program === 'CS') match.reg = { $regex: /-BCS-/i }; 
    else if (program === 'BSE' || program === 'SE') match.reg = { $regex: /-BSE-/i };
    
    if (semester && semester !== 'All') match.semester = parseInt(semester);
    
    const marks = await Mark.find()
        .populate({ path: 'student', select: 'name reg semester', match })
        .populate('assignment', 'title totalMarks')
        .populate('faculty', 'name')
        .sort({ createdAt: -1 });
        
    res.json(marks.filter(m => m.student));
}));

/**
 * @swagger
 * /office/bulk-update-marks:
 *   post:
 *     summary: Administratively apply grades to a cohort of students
 *     description: Directly inserts or overwrites marks for multiple students. Any existing marks are moved to the mark history registry.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignmentId, facultyId, marksData]
 *             properties:
 *               assignmentId: { type: string }
 *               facultyId: { type: string }
 *               marksData: 
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [studentId, marks]
 *                   properties:
 *                     studentId: { type: string }
 *                     marks: { type: number }
 *     responses:
 *       200:
 *         description: Batch grading complete
 */
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

/**
 * @swagger
 * /office/evaluations:
 *   get:
 *     summary: Retrieve all student internship evaluations
 *     tags: [Office]
 */
/**
 * @desc    Get evaluation records with student details
 * @route   GET api/office/evaluations
 * @access  Private (Office/HOD)
 */
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

/**
 * @swagger
 * /office/aggregated-marks:
 *   get:
 *     summary: Generate final academic grades for the internship cycle
 *     description: Performs a complex calculation averaging Site Supervisor and Faculty scores. Applies standard CUI grade boundaries (A to F) and determines final Pass/Fail status.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: program
 *         description: Filter by department (BCS/BSE)
 *         schema: { type: string, enum: [BCS, BSE, All] }
 *       - in: query
 *         name: semester
 *         description: Filter by academic semester
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Master grade sheet generated
 */
/**
 * @desc    Aggregates site supervisor and faculty scores into a final grade and pass/fail status
 * @route   GET api/office/aggregated-marks
 * @access  Private (Office/HOD)
 */
router.get('/aggregated-marks', protect, officeAuth, asyncHandler(async (req, res) => {
    const { program, semester } = req.query;
    let match = { role: 'student' };
    if (program === 'BCS' || program === 'CS') match.reg = { $regex: /-BCS-/i }; 
    else if (program === 'BSE' || program === 'SE') match.reg = { $regex: /-BSE-/i };
    if (semester && semester !== 'All') match.semester = parseInt(semester);

    const students = await User.find(match)
        .select('-profilePicture')
        .populate('assignedFaculty', 'name email whatsappNumber')
        .populate('assignedSiteSupervisor', 'name email whatsappNumber');
        
    const results = [];
    
    // Grading logic helper based on CUI standard
    const calculateGrade = (p) => {
        if (p >= 85) return { grade: 'A', status: 'Pass' }; 
        if (p >= 80) return { grade: 'A-', status: 'Pass' }; 
        if (p >= 75) return { grade: 'B+', status: 'Pass' }; 
        if (p >= 71) return { grade: 'B', status: 'Pass' };
        if (p >= 68) return { grade: 'B-', status: 'Pass' }; 
        if (p >= 64) return { grade: 'C+', status: 'Pass' }; 
        if (p >= 61) return { grade: 'C', status: 'Pass' }; 
        if (p >= 58) return { grade: 'C-', status: 'Pass' };
        if (p >= 54) return { grade: 'D+', status: 'Pass' }; 
        if (p >= 50) return { grade: 'D', status: 'Pass' }; 
        return { grade: 'F', status: 'Fail' };
    };

    for (const s of students) {
        const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
        // Freelancers only have faculty marks; others have averaged site+faculty marks
        const hasSiteSupervisor = s.assignedSiteSupervisor || s.assignedCompanySupervisor;
        const scores = marks.map(m => !hasSiteSupervisor ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2);
        
        const avg = marks.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const pct = Math.round((avg / 10) * 100);
        let { grade, status } = calculateGrade(pct);
        
        // Handle edge cases for pending students
        if (marks.length === 0) { 
            grade = 'N/A'; 
            status = (s.status === 'Assigned' || s.status === 'Agreement Approved') ? 'Pending' : (s.status === 'Fail' ? 'Fail' : 'Ineligible'); 
        }
        
        results.push({ 
            student: { name: s.name, reg: s.reg, email: s.email }, 
            faculty: s.assignedFaculty, 
            siteSupervisor: s.assignedSiteSupervisor, 
            company: s.assignedCompany || 'N/A', 
            assignmentsCount: marks.length, 
            averageMarks: avg.toFixed(2), 
            percentage: pct, 
            grade, 
            reportStatus: status 
        });
    }
    res.json(results);
}));

/**
 * @swagger
 * /office/archives:
 *   get:
 *     summary: Retrieve summary list of internship cycles
 *     description: Returns curated metadata for archives (names, years, basic stats) to optimize performance. Full data is fetched per cycle.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of archive summaries
 */
router.get('/archives', protect, officeAuth, asyncHandler(async (req, res) => {
    // Only select fields needed for the oversight dashboard cards to minimize payload
    const [archives, activePhase] = await Promise.all([
        Archive.find()
            .select('cycleName year statistics createdAt pdfUrl excelUrl')
            .sort({ createdAt: -1 })
            .lean(),
        Phase.findOne({ status: 'active' }).lean()
    ]);
    
    // Build a LIGHTWEIGHT live snapshot preview (no heavy getArchiveSnapshot call)
    if (activePhase && (activePhase.order === 4 || activePhase.order === 5)) {
        try {
            // Only fetch the minimum data needed for the live preview card
            const [students, phases, companies, faculty, siteSupervisors] = await Promise.all([
                User.find({ role: 'student' }).select('name reg email whatsappNumber status assignedCompany assignedFaculty assignedSiteSupervisor assignedCompanySupervisor internshipRequest internshipAgreement cgpa ineligibleReason').populate('assignedFaculty', 'name email whatsappNumber').populate('assignedSiteSupervisor', 'name email whatsappNumber').lean(),
                Phase.find({}).sort({ order: 1 }).lean(),
                Company.find({}).select('name status').lean(),
                User.find({ role: 'faculty_supervisor' }).select('name email status whatsappNumber').lean(),
                User.find({ role: 'site_supervisor' }).select('name email status company whatsappNumber assignedCompany').lean()
            ]);
            
            // Batch-fetch all marks in one query instead of per-student
            const allMarks = await Mark.find({}).select('student facultyMarks siteSupervisorMarks isFacultyGraded isSiteSupervisorGraded siteSupervisorId').lean();
            
            // Build a marks index by student ID for O(1) lookups
            const marksByStudent = {};
            allMarks.forEach(m => {
                const sid = m.student?.toString();
                if (sid) {
                    if (!marksByStudent[sid]) marksByStudent[sid] = [];
                    marksByStudent[sid].push(m);
                }
            });
            
            // Process students with lightweight computation
            const processedStudents = students.map(s => {
                const marks = marksByStudent[s._id.toString()] || [];
                const gradedMarks = marks.filter(m => m.isFacultyGraded);
                const isFreelance = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
                
                let avg = 0, pct = 0, grade = 'F';
                if (gradedMarks.length > 0) {
                    const scores = gradedMarks.map(m => isFreelance ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2);
                    avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                    pct = Math.round((avg / 10) * 100);
                    if (pct >= 85) grade = 'A'; else if (pct >= 80) grade = 'A-'; else if (pct >= 75) grade = 'B+'; else if (pct >= 71) grade = 'B'; else if (pct >= 68) grade = 'B-'; else if (pct >= 64) grade = 'C+'; else if (pct >= 61) grade = 'C'; else if (pct >= 58) grade = 'C-'; else if (pct >= 54) grade = 'D+'; else if (pct >= 50) grade = 'D';
                }
                
                const didParticipate = gradedMarks.length > 0;
                const isIneligible = !didParticipate && !['Assigned', 'Internship Approved', 'Agreement Approved'].includes(s.status);
                let finalStatus;
                if (isIneligible) finalStatus = 'Ineligible';
                else if (!didParticipate) finalStatus = 'No Submissions';
                else if (pct >= 50) finalStatus = 'Pass';
                else finalStatus = 'Fail';
                
                const siteSup = s.assignedSiteSupervisor ? { name: s.assignedSiteSupervisor.name || 'N/A', email: s.assignedSiteSupervisor.email || 'N/A', phone: s.assignedSiteSupervisor.whatsappNumber || 'N/A' } : { name: s.internshipRequest?.siteSupervisorName || s.assignedCompanySupervisor || 'N/A', email: s.internshipRequest?.siteSupervisorEmail || 'N/A', phone: 'N/A' };
                
                return {
                    name: s.name, reg: s.reg, email: s.email, phone: s.whatsappNumber || 'N/A',
                    grade, percentage: pct, avgMarks: Math.round(avg * 100) / 100, status: s.status, finalStatus,
                    company: s.assignedCompany || s.internshipRequest?.companyName || 'N/A',
                    mode: s.internshipRequest?.mode || 'N/A',
                    faculty: { name: s.assignedFaculty?.name || 'N/A', email: s.assignedFaculty?.email || 'N/A', phone: s.assignedFaculty?.whatsappNumber || 'N/A' },
                    siteSupervisor: siteSup,
                    marks: [], evaluations: [], submissions: []
                };
            });
            
            const participated = processedStudents.filter(a => a.finalStatus !== 'Ineligible' && a.finalStatus !== 'No Submissions');
            const passedCount = processedStudents.filter(a => a.finalStatus === 'Pass').length;
            const failedCount = processedStudents.filter(a => a.finalStatus === 'Fail').length;
            const pcts = participated.map(a => a.percentage);
            const avgPct = pcts.length > 0 ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length * 10) / 10 : 0;
            
            // Build site supervisor matrix (lightweight)
            const ssMatrix = siteSupervisors.map(ss => {
                const interns = processedStudents.filter(a => a.siteSupervisor?.email === ss.email);
                const gradedTasks = allMarks.filter(m => m.siteSupervisorId?.toString() === ss._id.toString() && m.isSiteSupervisorGraded).length;
                return { ...ss, internCount: interns.length, tasksGraded: gradedTasks };
            });
            
            const liveSnapshot = {
                _id: 'live-snapshot-id',
                cycleName: `Live Preview — Internship Cycle — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
                year: new Date().getFullYear(),
                statistics: {
                    totalStudents: processedStudents.length,
                    totalParticipated: participated.length,
                    totalPassed: passedCount,
                    totalFailed: failedCount,
                    totalIneligible: processedStudents.length - participated.length,
                    totalPhysical: participated.filter(a => a.mode !== 'Freelance').length,
                    totalFreelance: participated.filter(a => a.mode === 'Freelance').length,
                    averagePercentage: avgPct
                },
                students: processedStudents,
                phases: phases,
                rawSnapshot: { entities: { faculty, siteSupervisors: ssMatrix, companies } },
                isLive: true,
                createdAt: new Date(),
                pdfUrl: null,
                excelUrl: null
            };
            archives.unshift(liveSnapshot);
        } catch (err) {
            console.error('Failed to generate live snapshot for archive list:', err);
        }
    }

    res.json(archives);
}));

/**
 * @swagger
 * /office/archives/{id}:
 *   get:
 *     summary: Retrieve full details for a specific archive cycle
 *     description: Fetches exhaustive archival data including student rosters, performance analytics, and phase chronologies.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full archive record retrieved successfully
 *       404:
 *         description: Archive record not found
 */
router.get('/archives/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const archive = await Archive.findById(req.params.id)
        .select('-rawSnapshot.entities.marks -rawSnapshot.entities.submissions')
        .lean();
    if (!archive) return res.status(404).json({ message: 'Archive record not found' });
    res.json(archive);
}));

/**
 * @swagger
 * /office/archives/bulk-delete:
 *   delete:
 *     summary: Bulk remove multiple historical archives from institutional memory
 *     description: Permanently purges a collection of archive records identified by their unique database IDs.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: A list of archive IDs to be permanently removed
 *     responses:
 *       200:
 *         description: Successfully deleted the requested archives
 *       400:
 *         description: IDs array must be provided and non-empty
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - HOD/Office role required
 *       500:
 *         description: Database error occurred during bulk deletion
 */
router.delete('/archives/bulk-delete', protect, officeAuth, asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Invalid or empty IDs array provided' });
    }
    
    const result = await Archive.deleteMany({ _id: { $in: ids } });
    await new AuditLog({ action: 'ARCHIVE_BULK_DELETE', performedBy: req.user._id, details: `Bulk deleted ${result.deletedCount} archives`, ipAddress: req.ip }).save();
    
    res.json({ message: `Successfully deleted ${result.deletedCount} archives` });
}));

/**
 * @swagger
 * /office/archives/{id}:
 *   delete:
 *     summary: Permanently delete a single historical archive record
 *     description: Removes a specific internship cycle snapshot from the HOD Oversight archives.
 *     tags: [Office]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique MongoDB ID of the archive to purge
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archive purged successfully
 *       404:
 *         description: Archive record not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during archive removal
 */
router.delete('/archives/:id', protect, officeAuth, asyncHandler(async (req, res) => {
    const archive = await Archive.findByIdAndDelete(req.params.id);
    if (!archive) return res.status(404).json({ message: 'Archive record not found' });
    
    await new AuditLog({ action: 'ARCHIVE_DELETED', performedBy: req.user._id, details: `Deleted archive: ${archive.cycleName}`, ipAddress: req.ip }).save();
    res.json({ message: 'Archive deleted successfully' });
}));

export default router;
