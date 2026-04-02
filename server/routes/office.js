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
import {
    sendFacultyNominationEmail,
    sendAssignmentConfirmationEmail,
    sendFacultyPasswordResetEmail,
    sendStudentActivationEmail,
    sendCompanySupervisorActivationEmail,
    sendBulkEmailService
} from '../emailServices/emailService.js';
import { getPKTTime } from '../utils/time.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// @route   GET api/office/all-students
// @desc    Get paginated student accounts (for registry)
router.get('/all-students', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

        let query = { role: 'student' };
        if (search) {
            const s = search.trim();
            query.$or = [
                { name: { $regex: s, $options: 'i' } },
                { reg: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(query);
        const students = await User.find(query)
            .select('name email secondaryEmail reg semester status createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            students,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('[FETCH ALL STUDENTS ERROR]', err);
        res.status(500).json({ message: 'Server error while fetching students' });
    }
});

// @route   GET api/office/faculty-registry
// @desc    Get paginated faculty supervisors (Optimized for Vercel Edge Cache)
router.get('/faculty-registry', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

        let query = { role: 'faculty_supervisor' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { whatsappNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const [total, faculty] = await Promise.all([
            User.countDocuments(query),
            User.find(query)
                .select('name email status whatsappNumber createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const facultyIds = faculty.map(f => f._id);
        
        const studentCounts = await User.aggregate([
            { $match: { role: 'student', assignedFaculty: { $in: facultyIds } } },
            { $group: { _id: '$assignedFaculty', count: { $sum: 1 } } }
        ]);

        const countMap = studentCounts.reduce((acc, curr) => {
            if (curr._id) acc[curr._id.toString()] = curr.count;
            return acc;
        }, {});

        const data = faculty.map(f => ({
            ...f,
            assignedStudents: countMap[f._id.toString()] || 0
        }));

        res.json({
            data,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('[FACULTY REGISTRY ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/faculty-students/:id
// @desc    Get all students assigned to a specific faculty supervisor
router.get('/faculty-students/:id', async (req, res) => {
    try {
        const students = await User.find({ 
            role: 'student', 
            assignedFaculty: req.params.id 
        }).select('name reg semester email status profilePicture');
        
        res.json(students);
    } catch (err) {
        console.error('[FACULTY STUDENTS ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/broadcast-email
// @desc    Send bulk emails to a specific category of users
router.post('/broadcast-email', protect, async (req, res) => {
    const { category, subject, message, selectedRecipients } = req.body;

    if ((!category && !selectedRecipients) || !subject || !message) {
        return res.status(400).json({ message: 'Category/Recipients, subject and message are required' });
    }

    try {
        let recipients = [];
        let users = [];

        if (selectedRecipients && Array.isArray(selectedRecipients) && selectedRecipients.length > 0) {
            users = await User.find({ _id: { $in: selectedRecipients } });
        } else {
            let query = {};
            if (category === 'Students') {
                query = { role: 'student' };
            } else if (category === 'Faculty Supervisors') {
                query = { role: 'faculty_supervisor' };
            } else if (category === 'Site Supervisors') {
                query = { role: 'site_supervisor' };
            } else if (category === 'All Internal Roles') {
                query = { role: { $in: ['student', 'faculty_supervisor'] } };
            } else if (category === 'Ineligible Students') {
                // Logic based on the 'Ineligible' flag we use on frontend
                // Roughly: Status is NOT 'Assigned', 'Internship Approved', or 'Agreement Approved'
                query = { 
                    role: 'student', 
                    status: { $nin: ['Assigned', 'Internship Approved', 'Agreement Approved'] }
                };
            } else if (category === 'Students Pending Placement') {
                // Agreement approved but not yet assigned
                query = { 
                    role: 'student', 
                    status: 'Agreement Approved'
                };
            } else {
                 return res.status(400).json({ message: 'Invalid category' });
            }
            users = await User.find(query);
        }

        if (users.length === 0) {
            return res.status(404).json({ message: 'No recipients found' });
        }

        const hasPlaceholders = message.includes('{{name}}') || message.includes('{{reg}}') || subject.includes('{{name}}');

        let successCount = 0;
        let failureCount = 0;
        let lastError = null;

        if (hasPlaceholders) {
            // Must send individual emails for personalization
            // Chunk processing to avoid Vercel timeouts (Batches of 5 parallel requests)
            const BATCH_SIZE = 5;
            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);
                const promises = batch.map(async (user) => {
                    if (!user.email) return { success: false };

                    const personalizedSubject = subject.replace(/{{name}}/g, user.name || 'User');
                    const personalizedMessage = message
                        .replace(/{{name}}/g, user.name || 'User')
                        .replace(/{{reg}}/g, user.reg || 'N/A');

                    return sendBulkEmailService([user.email], personalizedSubject, personalizedMessage);
                });

                const results = await Promise.all(promises);
                results.forEach(res => {
                    if (res.success) successCount++;
                    else {
                        failureCount++;
                        lastError = res.error;
                    }
                });
            }
        } else {
            // Fast bulk send using BCC
            recipients = users.map(u => u.email).filter(e => e);
            const result = await sendBulkEmailService(recipients, subject, message);
            if (result.success) {
                successCount = recipients.length;
            } else {
                failureCount = recipients.length;
                lastError = result.error;
            }
        }

        if (successCount > 0) {
            await new AuditLog({
                action: 'BROADCAST_EMAIL',
                performedBy: req.user.id,
                details: `Broadcast: ${category || 'Selected Items'}. Sent: ${successCount}. Failed: ${failureCount}. Personalizer: ${hasPlaceholders ? 'ON' : 'OFF'}`,
                ipAddress: req.ip
            }).save();

            return res.json({ 
                success: true, 
                message: `Broadcast completed. Sent: ${successCount}${failureCount > 0 ? `, Failed: ${failureCount}` : ''}` 
            });
        } else {
            console.error('[BROADCAST FAILED]', lastError);
            return res.status(500).json({ 
                success: false, 
                message: lastError || 'Failed to send emails. Please check SMTP configuration.' 
            });
        }
    } catch (err) {
        console.error('[BROADCAST EMAIL ERROR]', err);
        res.status(500).json({ message: 'Server error while broadcasting email' });
    }
});

// @route   GET api/office/recipients/:category
// @desc    Get list of potential recipients for a category
router.get('/recipients/:category', protect, async (req, res) => {
    try {
        const { category } = req.params;
        let query = {};
        if (category === 'Students') {
            query = { role: 'student' };
        } else if (category === 'Faculty Supervisors') {
            query = { role: 'faculty_supervisor' };
        } else if (category === 'Site Supervisors') {
            query = { role: 'site_supervisor' };
        } else if (category === 'All Internal Roles') {
            query = { role: { $in: ['student', 'faculty_supervisor'] } };
        } else if (category === 'Ineligible Students') {
            query = { role: 'student', status: { $nin: ['Assigned', 'Internship Approved', 'Agreement Approved'] } };
        } else if (category === 'Students Pending Placement') {
            query = { role: 'student', status: 'Agreement Approved' };
        } else {
            return res.status(400).json({ message: 'Invalid category' });
        }
        
        const users = await User.find(query).select('name email reg role');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/registered-students
// @desc    Get all students with populated supervisor details. Can filter by facultyId. Supports pagination.
router.get('/registered-students', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000; // Default large but can be paginated
        const skip = (page - 1) * limit;

        let query = { role: 'student' };
        
        // Handle specific IDs if provided (comma-separated list)
        if (req.query.ids) {
            const idArray = req.query.ids.split(',').filter(x => x.length > 0);
            if (idArray.length > 0) {
                query._id = { $in: idArray };
            }
        }

        if (req.query.facultyId) {
            query.assignedFaculty = req.query.facultyId;
        }
        if (req.query.search) {
            const s = req.query.search;
            query.$or = [
                { name: { $regex: s, $options: 'i' } },
                { reg: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(query);
        const students = await User.find(query)
            .populate('assignedFaculty', 'name email')
            .populate('assignedSiteSupervisor', 'name email')
            .select('name email secondaryEmail reg semester status whatsappNumber fatherName section assignedFaculty assignedSiteSupervisor assignedCompany assignedCompanySupervisor internshipRequest internshipAgreement createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: students,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/internship-request-students
// @desc    Get all students with internship requests — FIFO order (oldest first = First In, First Out)
router.get('/internship-request-students', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const filter = req.query.filter || 'all';

        let query = {
            role: 'student',
            status: { $in: ['Internship Request Submitted', 'Internship Approved', 'Internship Rejected'] }
        };

        if (filter === 'pending') query.status = 'Internship Request Submitted';
        else if (filter === 'approved') query.status = 'Internship Approved';
        else if (filter === 'rejected') query.status = 'Internship Rejected';

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { reg: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { 'internshipRequest.companyName': { $regex: search, $options: 'i' } }
            ];
        }

        const [total, students] = await Promise.all([
            User.countDocuments(query),
            User.find(query)
                .populate('assignedFaculty', 'name email')
                .populate('assignedSiteSupervisor', 'name email')
                .sort({ 'internshipRequest.submittedAt': 1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        res.json({ data: students, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('[INTERNSHIP REQUESTS ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/internship-request/:id
// @desc    Get full details for a specific internship request
router.get('/internship-request/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id)
            .populate('assignedFaculty', 'name email')
            .populate('assignedSiteSupervisor', 'name email whatsappNumber')
            .lean();

        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    } catch (err) {
        console.error('[DETAIL FETCH ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/internship-request-stats
// @desc    Get counts for all internship request filters in one go
router.get('/internship-request-stats', async (req, res) => {
    try {
        const [all, pending, approved, rejected] = await Promise.all([
            User.countDocuments({ role: 'student', status: { $in: ['Internship Request Submitted', 'Internship Approved', 'Internship Rejected'] } }),
            User.countDocuments({ role: 'student', status: 'Internship Request Submitted' }),
            User.countDocuments({ role: 'student', status: 'Internship Approved' }),
            User.countDocuments({ role: 'student', status: 'Internship Rejected' })
        ]);
        res.json({ all, pending, approved, rejected });
    } catch (err) {
        console.error('[STATS ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/student-stats
// @desc    Get aggregate stats for Student Records charts
router.get('/student-stats', protect, async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('semester status cgpa internshipRequest');

        const stats = {
            total: students.length,
            eligibility: { eligible: 0, ineligible: 0 },
            modes: { onsite: 0, remote: 0, hybrid: 0, freelance: 0, unrequested: 0 },
            gpa: { low: 0, medium: 0, high: 0 },
            completion: { missingSem: 0, missingCGPA: 0, complete: 0 },
            departments: { cs: 0, se: 0, other: 0 }
        };

        const eligibleSemesters = ['4', '5', '6', '7', '8'];

        students.forEach(s => {
            // Eligibility
            const semOk = eligibleSemesters.includes(s.semester?.toString());
            const verified = s.status !== 'unverified';
            const cgpaVal = parseFloat(s.cgpa) || 0;
            const cgpaOk = cgpaVal >= 2.0;

            if (semOk && verified && cgpaOk) stats.eligibility.eligible++;
            else stats.eligibility.ineligible++;

            // Departments
            const reg = s.reg?.toUpperCase() || '';
            if (reg.includes('-BCS-') || reg.includes('-CS-')) stats.departments.cs++;
            else if (reg.includes('-BSE-') || reg.includes('-SE-')) stats.departments.se++;
            else stats.departments.other++;

            // Modes
            const mode = s.internshipRequest?.mode?.toLowerCase();
            if (mode && stats.modes.hasOwnProperty(mode)) {
                stats.modes[mode]++;
            } else if (!mode) {
                stats.modes.unrequested++;
            }

            // GPA Range
            if (cgpaVal < 2.0) stats.gpa.low++;
            else if (cgpaVal < 3.5) stats.gpa.medium++;
            else stats.gpa.high++;

            // Completion
            if (!s.semester) stats.completion.missingSem++;
            if (!s.cgpa) stats.completion.missingCGPA++;
            if (s.semester && s.cgpa) stats.completion.complete++;
        });

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/check-faculty-by-email
// @desc    Check if a faculty exists in the DB by email
router.get('/check-faculty-by-email', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'Email is required' });
        const faculty = await User.findOne({ email: email.toLowerCase().trim(), role: 'faculty_supervisor' })
            .select('name email status');
        if (!faculty) return res.json({ found: false });
        res.json({ found: true, faculty: { id: faculty._id, name: faculty.name, email: faculty.email, status: faculty.status } });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/assign-company
// @desc    Assign company to student (independently), upsert into Company registry as Student-SelfAssigned
router.post('/assign-company', async (req, res) => {
    try {
        const { studentId, companyName, officeId } = req.body;
        if (!studentId || !companyName) return res.status(400).json({ message: 'studentId and companyName are required' });

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Upsert into Company registry with student_submission source
        await Company.findOneAndUpdate(
            { name: companyName.trim() },
            {
                $setOnInsert: {
                    name: companyName.trim(),
                    source: 'student_submission',
                    isMOUSigned: false,
                    category: 'Student Self-Assigned'
                }
            },
            { upsert: true, new: true }
        );

        student.assignedCompany = companyName.trim();
        await student.save();

        await new AuditLog({
            action: 'COMPANY_ASSIGNED',
            performedBy: officeId,
            targetUser: student._id,
            details: `Assigned company "${companyName}" to ${student.name}`,
            ipAddress: req.ip
        }).save();

        console.log(`[${getPKTTime()}] [OFFICE] Company "${companyName}" assigned to ${student.email}`);
        res.json({ message: 'Company assigned successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/assign-site-supervisor
// @desc    Assign site supervisor to student independently
router.post('/assign-site-supervisor', async (req, res) => {
    try {
        const { studentId, siteSupervisorName, siteSupervisorEmail, siteSupervisorPhone, officeId } = req.body;
        if (!studentId || !siteSupervisorName) return res.status(400).json({ message: 'studentId and siteSupervisorName are required' });

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        student.assignedCompanySupervisor = siteSupervisorName;
        student.assignedCompanySupervisorEmail = siteSupervisorEmail?.toLowerCase().trim();

        // Link the ObjectId if the supervisor already exists as a user
        if (siteSupervisorEmail) {
            const supervisorUser = await User.findOne({ email: siteSupervisorEmail.toLowerCase().trim(), role: 'site_supervisor' });
            if (supervisorUser) {
                student.assignedSiteSupervisor = supervisorUser._id;
            }
        }

        // Also update internship request fields for record
        if (student.internshipRequest) {
            student.internshipRequest.siteSupervisorName = siteSupervisorName;
            student.internshipRequest.siteSupervisorEmail = siteSupervisorEmail || student.internshipRequest.siteSupervisorEmail;
            student.internshipRequest.siteSupervisorPhone = siteSupervisorPhone || student.internshipRequest.siteSupervisorPhone;
        }
        await student.save();

        await new AuditLog({
            action: 'SITE_SUPERVISOR_ASSIGNED',
            performedBy: officeId,
            targetUser: student._id,
            details: `Assigned site supervisor "${siteSupervisorName}" to ${student.name}`,
            ipAddress: req.ip
        }).save();

        console.log(`[${getPKTTime()}] [OFFICE] Site Supervisor "${siteSupervisorName}" assigned to ${student.email}`);
        res.json({ message: 'Site supervisor assigned successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/assign-faculty-override
// @desc    Force-assign an existing faculty supervisor to a student (only if in DB)
router.post('/assign-faculty-override', async (req, res) => {
    try {
        const { studentId, facultyId, officeId } = req.body;
        if (!studentId || !facultyId) return res.status(400).json({ message: 'studentId and facultyId are required' });

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const faculty = await User.findById(facultyId);
        if (!faculty || faculty.role !== 'faculty_supervisor') return res.status(404).json({ message: 'Faculty supervisor not found' });

        student.assignedFaculty = facultyId;
        if (student.internshipRequest) student.internshipRequest.facultyStatus = 'Accepted';
        await student.save();

        await new AuditLog({
            action: 'FACULTY_ASSIGNED_OVERRIDE',
            performedBy: officeId,
            targetUser: student._id,
            details: `Office assigned faculty "${faculty.name}" to ${student.name}`,
            ipAddress: req.ip
        }).save();

        console.log(`[${getPKTTime()}] [OFFICE] Faculty "${faculty.name}" force-assigned to ${student.email}`);
        res.json({ message: 'Faculty supervisor assigned successfully.', faculty: { id: faculty._id, name: faculty.name } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/check-site-supervisor-by-email
// @desc    Check if a site supervisor exists in the DB by email
router.get('/check-site-supervisor-by-email', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'Email is required' });
        const supervisor = await User.findOne({ email: email.toLowerCase().trim(), role: 'site_supervisor' })
            .select('name email status whatsappNumber');
        if (!supervisor) return res.json({ found: false });
        res.json({ found: true, supervisor: { id: supervisor._id, name: supervisor.name, email: supervisor.email, status: supervisor.status, phone: supervisor.whatsappNumber } });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/onboard-and-assign-site-supervisor
// @desc    Onboard a new site supervisor, assigned them to a company, and assign to student
router.post('/onboard-and-assign-site-supervisor', async (req, res) => {
    try {
        const { studentId, siteSupervisorName, siteSupervisorEmail, siteSupervisorPhone, companyName, officeId } = req.body;
        if (!studentId || !siteSupervisorName || !siteSupervisorEmail || !companyName) {
            return res.status(400).json({ message: 'Mandatory fields missing' });
        }

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const emailLower = siteSupervisorEmail.toLowerCase().trim();

        // Global Uniqueness Check
        const conflict = await User.findOne({
            $or: [{ email: emailLower }, { secondaryEmail: emailLower }]
        });
        if (conflict) {
            return res.status(400).json({ 
                message: `The email "${emailLower}" is already in use by another account (${conflict.role}). Each supervisor must have a unique email.` 
            });
        }

        // 1. Create/Find Company and link
        const company = await Company.findOneAndUpdate(
            { name: companyName.trim() },
            {
                $setOnInsert: { name: companyName.trim(), source: 'student_submission', category: 'Student Self-Assigned' },
                $addToSet: { siteSupervisors: { name: siteSupervisorName, email: emailLower, whatsappNumber: siteSupervisorPhone || '' } }
            },
            { upsert: true, new: true }
        );

        // 2. See if user exists, if not onboard
        let user = await User.findOne({ 
            $or: [
                { email: emailLower },
                { secondaryEmail: emailLower }
            ]
        });
        if (!user) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiry = Date.now() + 24 * 60 * 60 * 1000;

            user = new User({
                name: siteSupervisorName,
                email: emailLower,
                whatsappNumber: siteSupervisorPhone || '',
                role: 'site_supervisor',
                status: 'Pending Activation',
                activationToken: tokenHash,
                activationExpires: expiry,
                password: crypto.randomBytes(16).toString('hex')
            });
            await user.save();
            await sendCompanySupervisorActivationEmail(emailLower, rawToken, siteSupervisorName, company.name);
        }

        // 3. Update Student
        student.assignedCompanySupervisor = siteSupervisorName;
        student.assignedCompanySupervisorEmail = emailLower;
        student.assignedSiteSupervisor = user._id; // Linked ObjectId

        if (student.internshipRequest) {
            student.internshipRequest.siteSupervisorName = siteSupervisorName;
            student.internshipRequest.siteSupervisorEmail = emailLower;
            student.internshipRequest.siteSupervisorPhone = siteSupervisorPhone || '';
        }
        await student.save();

        res.json({ message: 'Supervisor onboarded and assigned.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/onboard-and-assign-faculty
// @desc    Onboard a new faculty and force-assign them to a student
router.post('/onboard-and-assign-faculty', async (req, res) => {
    try {
        const { studentId, name, email, department, officeId } = req.body;
        if (!studentId || !name || !email) return res.status(400).json({ message: 'studentId, name, and email are required' });

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const emailLower = email.toLowerCase().trim();

        // Check if exists
        let faculty = await User.findOne({ 
            $or: [
                { email: emailLower },
                { secondaryEmail: emailLower }
            ]
        });
        if (!faculty) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours

            faculty = new User({
                name,
                email: emailLower,
                role: 'faculty_supervisor',
                status: 'Pending Activation',
                activationToken: tokenHash,
                activationExpires: expiry,
                password: crypto.randomBytes(16).toString('hex')
            });
            await faculty.save();
            await sendFacultyNominationEmail(emailLower, rawToken, name);
        }

        // Assign to student
        student.assignedFaculty = faculty._id;
        if (student.internshipRequest) student.internshipRequest.facultyStatus = 'Accepted';
        await student.save();

        res.json({ message: 'Faculty onboarded and assigned to student.', faculty: { id: faculty._id, name: faculty.name } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});



// @route   POST api/office/decide-request
// @desc    Approve or Reject internship request
router.post('/decide-request', async (req, res) => {
    try {
        const { studentId, decision, comment, officeId } = req.body;
        if (!studentId || !decision) return res.status(400).json({ message: 'studentId and decision are required' });

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Concurrency Protection: Only process if they are still pending
        const currentStatus = student.status;
        if (currentStatus !== 'Internship Request Submitted') {
            return res.status(409).json({ 
                message: `The request for ${student.name} was already processed by another administrator (Current Status: ${currentStatus}).` 
            });
        }

        if (decision === 'approve') {
            student.status = 'Internship Approved';
        } else if (decision === 'reject') {
            student.status = 'Internship Rejected';
            if (student.internshipRequest) {
                student.internshipRequest.rejectionReason = comment || 'No reason provided';
            }
        } else {
            return res.status(400).json({ message: 'Invalid decision. Must be approve or reject.' });
        }

        await student.save();

        // Safe notification — no req.user required (no protect middleware on this route)
        try {
            await createNotification({
                recipient: studentId,
                sender: officeId || studentId, // fallback to student if no officeId sent
                type: 'internship_request',
                title: `Internship Request ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
                message: decision === 'approve'
                    ? 'Your internship request has been approved. Please proceed to the agreement stage.'
                    : `Your internship request was rejected: ${comment || 'No reason provided'}`,
                link: '/student/dashboard'
            });
        } catch (notifErr) {
            // Non-critical — don't fail the whole request if notification fails
            console.warn('[NOTIFY WARN]', notifErr.message);
        }

        console.log(`[${getPKTTime()}] [OFFICE] Internship Request ${decision === 'approve' ? 'Approved' : 'Rejected'} for ${student.email}`);
        res.json({ message: `Internship request ${decision}d successfully.` });
    } catch (err) {
        console.error('[DECIDE REQUEST ERROR]', err);
        res.status(500).json({ message: 'Server error while processing decision.' });
    }
});

// @route   GET api/office/pending-agreements
// @desc    Get all students with pending agreements
router.get('/pending-agreements', async (req, res) => {
    try {
        const students = await User.find({
            status: { $in: ['Agreement Submitted - Self', 'Agreement Submitted - University Assigned'] },
            role: 'student'
        }).select('name email secondaryEmail reg status fatherName section internshipRequest internshipAgreement');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/decide-agreement
// @desc    Approve or Reject agreement
router.post('/decide-agreement', async (req, res) => {
    try {
        const { studentId, decision, comment } = req.body;

        const user = await User.findById(studentId);
        if (!user) return res.status(404).json({ message: 'Student not found' });

        if (decision === 'approve') {
            user.status = 'Agreement Approved';

            // Automation for Self-Arranged Internships
            if (user.internshipRequest && user.internshipRequest.type === 'Self') {
                const agr = user.internshipAgreement;

                // Create or Update Company in Registry
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
                    { upsert: true, new: true }
                );
            }
        } else {
            user.status = 'Agreement Rejected';
            user.internshipAgreement.rejectionComments = comment;
        }

        await user.save();

        // Notify Student
        await createNotification({
            recipient: studentId,
            sender: req.user._id,
            type: 'internship_request',
            title: `Agreement ${decision.toUpperCase()}`,
            message: decision === 'approve'
                ? 'Your internship agreement has been verified and approved. You are now authorized to start the cycle.'
                : `Your internship agreement was rejected: ${comment}`,
            link: '/student/dashboard'
        });

        console.log(`[${getPKTTime()}] [OFFICE] Agreement ${decision === 'approve' ? 'Approved' : 'Rejected'} for ${user.email}`);

        res.json({ message: `Agreement ${decision}d` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/approved-students
// @desc    Get all students with status Agreement Approved
router.get('/approved-students', async (req, res) => {
    try {
        const students = await User.find({ status: 'Agreement Approved', role: 'student' })
            .populate('assignedFaculty', 'name email');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/assigned-students
// @desc    Get all students with status Assigned
router.get('/assigned-students', async (req, res) => {
    try {
        const students = await User.find({ status: 'Assigned', role: 'student' })
            .populate('assignedFaculty', 'name');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/assign-student
// @desc    Assign Faculty Supervisor and Company details
router.post('/assign-student', async (req, res) => {
    try {
        const { studentId, facultyId, companyName, siteSupervisor, officeId } = req.body;

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const faculty = await User.findById(facultyId);
        if (!faculty || faculty.role !== 'faculty_supervisor') {
            return res.status(400).json({ message: 'Invalid Faculty Supervisor selected.' });
        }

        // 1. Update Student Record
        student.assignedFaculty = facultyId;
        student.assignedCompany = companyName;

        // siteSupervisor is an object { name, email, whatsappNumber }
        student.assignedCompanySupervisor = siteSupervisor.name;
        student.assignedCompanySupervisorEmail = siteSupervisor.email?.toLowerCase().trim();

        // Link ObjectId for site supervisor if exists
        if (siteSupervisor.email) {
            const supervisorUser = await User.findOne({ email: siteSupervisor.email.toLowerCase().trim(), role: 'site_supervisor' });
            if (supervisorUser) {
                student.assignedSiteSupervisor = supervisorUser._id;
            }
        }

        student.status = 'Assigned';
        await student.save();

        // Notify Student
        await createNotification({
            recipient: studentId,
            sender: officeId,
            type: 'internship_request',
            title: 'Placement Finalized',
            message: `You have been officially assigned to ${companyName}. Academic supervisor: ${faculty.name}.`,
            link: '/student/dashboard'
        });

        // 2. Log Action
        await new AuditLog({
            action: 'INTERNSHIP_ASSIGNMENT',
            performedBy: officeId,
            targetUser: student._id,
            details: `Assigned to ${companyName} (Site: ${siteSupervisor.name}, Faculty: ${faculty.name})`,
            ipAddress: req.ip
        }).save();

        // 3. Send Automated Email
        await sendAssignmentConfirmationEmail(student.email, student.name, {
            companyName,
            siteSupervisor,
            facultySupervisor: {
                name: faculty.name,
                whatsappNumber: faculty.whatsappNumber
            }
        });

        console.log(`[${getPKTTime()}] [OFFICE] Student ${student.email} Assigned to ${companyName}`);
        res.json({ message: 'Student assigned and notification email sent.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/faculty-students/:facultyId
// @desc    Get all students assigned to a specific faculty supervisor
router.get('/faculty-students/:facultyId', async (req, res) => {
    try {
        const students = await User.find({
            role: 'student',
            assignedFaculty: req.params.facultyId
        })
        .select('name email reg semester status')
        .lean(); // RAW JSON Optimized
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/companies/dropdown
// @desc    Get a lightweight list of companies for Select inputs
router.get('/companies/dropdown', async (req, res) => {
    try {
        const companies = await Company.find({ status: 'Active' })
            .select('name status siteSupervisors isMOUSigned category')
            .sort({ isMOUSigned: -1, name: 1 }) // MOU companies first
            .lean();
        res.json(companies);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching company list' });
    }
});


// @route   GET api/office/site-supervisors
// @desc    Get paginated site supervisors with their student counts
router.get('/site-supervisors', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = (req.query.search || '').trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

        let compQuery = { status: 'Active' };
        const companies = await Company.find(compQuery).select('name siteSupervisors');
        
        const supervisorMap = {};
        companies.forEach(c => {
            (c.siteSupervisors || []).forEach(s => {
                const email = s.email?.toLowerCase().trim() || '';
                const name = s.name?.trim() || 'Unknown';
                const key = email || name;

                if (search) {
                    const rgx = new RegExp(search, 'i');
                    if (!rgx.test(name) && !rgx.test(email)) return;
                }

                if (!supervisorMap[key]) {
                    supervisorMap[key] = {
                        name: s.name,
                        email: s.email,
                        whatsappNumber: s.whatsappNumber,
                        companies: [{ id: c._id, name: c.name }]
                    };
                } else {
                    if (!supervisorMap[key].companies.find(comp => comp.id.toString() === c._id.toString())) {
                        supervisorMap[key].companies.push({ id: c._id, name: c.name });
                    }
                }
            });
        });

        const allSupervisors = Object.values(supervisorMap);
        const total = allSupervisors.length;
        const paginated = allSupervisors.slice((page - 1) * limit, page * limit);

        const emails = paginated.map(s => s.email?.toLowerCase().trim()).filter(Boolean);
        const supervisorAssignments = await User.aggregate([
            { $match: { role: 'student', assignedCompanySupervisorEmail: { $in: emails } } },
            { $group: { _id: '$assignedCompanySupervisorEmail', count: { $sum: 1 } } }
        ]);
        const emailCountMap = Object.fromEntries(supervisorAssignments.map(a => [a._id, a.count]));

        const data = paginated.map(s => ({
            ...s,
            assignedStudents: emailCountMap[s.email?.toLowerCase().trim()] || 0
        }));

        res.json({
            data,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('[FETCH SUPERVISORS ERROR]', err);
        res.status(500).json({ message: 'Server error while fetching supervisors' });
    }
});

// @route   GET api/office/supervisor-students
// @desc    Get all students assigned to a specific site supervisor within a company
router.get('/supervisor-students', async (req, res) => {
    try {
        const { company, supervisor, email } = req.query;
        if (!email && (!company || !supervisor)) {
            return res.status(400).json({ message: 'Email or Company/Supervisor name are required.' });
        }

        const query = { role: 'student' };
        if (email) {
            const escapeRegex = (string) => string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
            const emailLower = email.toLowerCase().trim();
            const conditions = [
                { assignedCompanySupervisorEmail: emailLower }
            ];

            if (company && supervisor) {
                conditions.push({
                    assignedCompany: { $regex: new RegExp(`^${escapeRegex(company.trim())}$`, 'i') },
                    assignedCompanySupervisor: { $regex: new RegExp(`^${escapeRegex(supervisor.trim())}$`, 'i') }
                });
            } else if (supervisor) {
                conditions.push({
                    assignedCompanySupervisor: { $regex: new RegExp(`^${escapeRegex(supervisor.trim())}$`, 'i') }
                });
            }

            query.$or = conditions;
        } else {
            const escapeRegex = (string) => string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
            query.assignedCompany = { $regex: new RegExp(`^${escapeRegex(company.trim())}$`, 'i') };
            query.assignedCompanySupervisor = { $regex: new RegExp(`^${escapeRegex(supervisor.trim())}$`, 'i') };
        }

        const students = await User.find(query).select('name email reg semester status');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/companies
// @desc    Get paginated companies with optimized student counts
router.get('/companies', async (req, res) => {
    try {
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

        const total = await Company.countDocuments(query);
        const companies = await Company.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const companyNames = companies.map(c => c.name);
        const supervisorEmails = companies.flatMap(c => (c.siteSupervisors || []).map(s => s.email?.toLowerCase().trim())).filter(Boolean);

        // 1. Get total students per company in this page
        const companyAssignments = await User.aggregate([
            { $match: { role: 'student', assignedCompany: { $in: companyNames } } },
            { $group: { _id: '$assignedCompany', count: { $sum: 1 } } }
        ]);

        // 2. Get students per supervisor email (Preferred)
        const emailAssignments = await User.aggregate([
            { $match: { role: 'student', assignedCompanySupervisorEmail: { $in: supervisorEmails } } },
            { $group: { _id: '$assignedCompanySupervisorEmail', count: { $sum: 1 } } }
        ]);

        // 3. Fallback: Get students per supervisor name+company 
        const nameAssignments = await User.aggregate([
            { $match: { 
                role: 'student', 
                assignedCompany: { $in: companyNames },
                assignedCompanySupervisor: { $exists: true, $ne: null }
            }},
            { $group: { 
                _id: { company: '$assignedCompany', supervisor: '$assignedCompanySupervisor' }, 
                count: { $sum: 1 } 
            } }
        ]);

        // 4. Handle student-submitted companies dynamically (Pull supervisors from student records)
        const studentSubmittedNames = companies.filter(c => c.source === 'student_submission').map(c => c.name);
        const dynamicSupervisors = {};
        if (studentSubmittedNames.length > 0) {
            const students = await User.find({
                role: 'student',
                assignedCompany: { $in: studentSubmittedNames },
                assignedCompanySupervisor: { $exists: true, $ne: '' }
            }).select('assignedCompany assignedCompanySupervisor assignedCompanySupervisorEmail internshipRequest');

            students.forEach(s => {
                const comp = s.assignedCompany;
                const email = (s.assignedCompanySupervisorEmail || s.internshipRequest?.siteSupervisorEmail || '').toLowerCase().trim();
                const name = s.assignedCompanySupervisor || s.internshipRequest?.siteSupervisorName || '';
                const key = email || name;

                if (!dynamicSupervisors[comp]) dynamicSupervisors[comp] = {};
                if (!dynamicSupervisors[comp][key]) {
                    dynamicSupervisors[comp][key] = {
                        name,
                        email,
                        whatsappNumber: s.internshipRequest?.siteSupervisorPhone || '',
                        assignedStudents: 1
                    };
                } else {
                    dynamicSupervisors[comp][key].assignedStudents++;
                }
            });
        }

        const compCountMap = Object.fromEntries(companyAssignments.map(a => [a._id, a.count]));
        const emailCountMap = Object.fromEntries(emailAssignments.map(a => [a._id, a.count]));
        const nameCountMap = {};
        nameAssignments.forEach(a => {
            const key = `${(a._id.company || '').toLowerCase().trim()}|${(a._id.supervisor || '').toLowerCase().trim()}`;
            nameCountMap[key] = a.count;
        });

        const data = companies.map(c => {
            const companyObj = c.toObject();
            companyObj.assignedStudents = compCountMap[c.name] || 0;

            // Process static supervisors
            companyObj.siteSupervisors = (companyObj.siteSupervisors || []).map(sup => {
                const email = sup.email?.toLowerCase().trim();
                const name = sup.name?.toLowerCase().trim();
                const comp = c.name?.toLowerCase().trim();
                const key = `${comp}|${name}`;
                return {
                    ...sup,
                    assignedStudents: emailCountMap[email] || nameCountMap[key] || 0
                };
            });

            // Merge dynamic supervisors for student submissions
            if (c.source === 'student_submission' && dynamicSupervisors[c.name]) {
                const extraSups = Object.values(dynamicSupervisors[c.name]);
                extraSups.forEach(extra => {
                    const alreadyExists = companyObj.siteSupervisors.some(s => 
                        (s.email && s.email.toLowerCase().trim() === extra.email) || 
                        (s.name.toLowerCase().trim() === extra.name.toLowerCase().trim())
                    );
                    if (!alreadyExists) companyObj.siteSupervisors.push(extra);
                });
            }

            return companyObj;
        });

        res.json({
            data,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('[FETCH COMPANIES ERROR]', err);
        res.status(500).json({ message: 'Server error while fetching companies' });
    }
});

// @route   POST api/office/add-company
// @desc    Manually add an MOU company and onboard site supervisors
router.post('/add-company', async (req, res) => {
    try {
        const { name, regNo, siteSupervisors, officeId } = req.body;

        // 1. Uniqueness check
        const query = { $or: [{ name }] };
        if (regNo) query.$or.push({ regNo });

        const existing = await Company.findOne(query);
        if (existing) {
            const field = existing.name === name ? 'Company name' : 'Registration Number';
            return res.status(400).json({ message: `${field} already exists in the registry.` });
        }

        // 2. Save Company
        const company = new Company({
            ...req.body,
            source: 'manual',
            isMOUSigned: true
        });
        await company.save();

        // 3. Automated Supervisor Onboarding & Global Uniqueness Check
        if (siteSupervisors && siteSupervisors.length > 0) {
            // Pre-check ALL emails for conflicts before processing
            for (const supervisor of siteSupervisors) {
                const supervisorEmail = supervisor.email.toLowerCase().trim();
                const conflict = await User.findOne({
                    $or: [{ email: supervisorEmail }, { secondaryEmail: supervisorEmail }]
                });
                if (conflict) {
                    return res.status(400).json({ 
                        message: `The email "${supervisorEmail}" for supervisor "${supervisor.name}" is already registered in the system (Role: ${conflict.role}). Registration aborted.` 
                    });
                }
            }

            for (const supervisor of siteSupervisors) {
                try {
                    const supervisorEmail = supervisor.email.toLowerCase().trim();

                    // Check if user already exists
                    let user = await User.findOne({ 
                        $or: [
                            { email: supervisorEmail },
                            { secondaryEmail: supervisorEmail }
                        ]
                    });
                    if (!user) {
                        // Generate Activation Token
                        const rawToken = crypto.randomBytes(32).toString('hex');
                        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
                        const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours

                        user = new User({
                            name: supervisor.name,
                            email: supervisorEmail,
                            whatsappNumber: supervisor.whatsappNumber,
                            role: 'site_supervisor',
                            status: 'Pending Activation',
                            activationToken: tokenHash,
                            activationExpires: expiry,
                            password: crypto.randomBytes(16).toString('hex') // Placeholder
                        });
                        await user.save();

                        // Send Formal Invitation
                        await sendCompanySupervisorActivationEmail(supervisorEmail, rawToken, supervisor.name, name);
                    }
                } catch (emailErr) {
                    console.error(`[SUPERVISOR ONBOARD FAIL] ${supervisor.email}:`, emailErr);
                    // We continue the loop so other supervisors get their emails
                }
            }
        }

        // 4. Audit Log
        await new AuditLog({
            action: 'COMPANY_ADDED',
            performedBy: officeId,
            details: `Added MOU Company: ${name} with ${siteSupervisors?.length || 0} supervisors`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'MOU Company registered and Supervisor invitations sent.' });
    } catch (err) {
        console.error('[ADD COMPANY ERROR]', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// @route   POST api/office/edit-company/:id
// @desc    Update company details and its supervisor list
router.post('/edit-company/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, regNo, scope, hrEmail, mouSignedDate, siteSupervisors, officeId } = req.body;

        const company = await Company.findById(id);
        if (!company) return res.status(404).json({ message: 'Company not found.' });

        // Update fields
        company.name = name || company.name;
        company.address = address || company.address;
        company.regNo = regNo || company.regNo;
        company.scope = scope || company.scope;
        company.hrEmail = hrEmail || company.hrEmail;
        company.mouSignedDate = mouSignedDate || company.mouSignedDate;

        // Handle site supervisor list updates
        // For simplicity, we replace the list. In a real app, we might want to sync with User accounts.
        company.siteSupervisors = siteSupervisors;

        await company.save();

        // Audit Log
        await new AuditLog({
            action: 'COMPANY_UPDATED',
            performedBy: officeId,
            details: `Updated company: ${company.name}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Company details updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/add-site-supervisor
// @desc    Add a supervisor to an existing company and onboard them
router.post('/add-site-supervisor', async (req, res) => {
    try {
        const { companyId, name, email, whatsappNumber, officeId } = req.body;

        // 1. Find Company
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: 'Company not found.' });

        const supervisorEmail = email.toLowerCase().trim();

        // Global Uniqueness Check
        const conflict = await User.findOne({
            $or: [{ email: supervisorEmail }, { secondaryEmail: supervisorEmail }]
        });
        if (conflict) {
            return res.status(400).json({ 
                message: `The email "${supervisorEmail}" is already linked to an existing account (${conflict.role}). Registration denied.` 
            });
        }

        // 2. Check if supervisor already exists in user database or company's list
        const supervisorExistsInCompany = company.siteSupervisors.some(s => s.email === supervisorEmail);
        if (supervisorExistsInCompany) {
            return res.status(400).json({ message: 'Supervisor already linked to this company.' });
        }

        // 3. Update Company Record
        company.siteSupervisors.push({ name, email: supervisorEmail, whatsappNumber });
        await company.save();

        // 4. Onboard User
        let user = await User.findOne({ 
            $or: [
                { email: supervisorEmail },
                { secondaryEmail: supervisorEmail }
            ]
        });
        if (!user) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours

            user = new User({
                name,
                email: supervisorEmail,
                whatsappNumber,
                role: 'site_supervisor',
                status: 'Pending Activation',
                activationToken: tokenHash,
                activationExpires: expiry,
                password: crypto.randomBytes(16).toString('hex')
            });
            await user.save();

            // Send Activation Email
            await sendCompanySupervisorActivationEmail(supervisorEmail, rawToken, name, company.name);
        }

        // 5. Audit Log
        await new AuditLog({
            action: 'SUPERVISOR_LINKED',
            performedBy: officeId,
            details: `Linked supervisor ${name} (${supervisorEmail}) to company ${company.name}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Supervisor linked and invitation sent successfully.' });

    } catch (err) {
        console.error('[ADD SUPERVISOR ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/edit-site-supervisor/:id
// @desc    Update site supervisor details across User and Company models
router.post('/edit-site-supervisor/:id', async (req, res) => {
    try {
        const { id } = req.params; // Can be email or ID
        const { name, email, whatsappNumber, companyId, officeId } = req.body;

        const emailLower = (email || id).toLowerCase().trim();

        // 1. Update User Record
        const user = await User.findOne({ email: emailLower });
        if (user) {
            user.name = name || user.name;
            user.whatsappNumber = whatsappNumber || user.whatsappNumber;
            await user.save();
        }

        // 2. Update all Company Records containing this supervisor
        await Company.updateMany(
            { 'siteSupervisors.email': emailLower },
            {
                $set: {
                    'siteSupervisors.$.name': name || user?.name,
                    'siteSupervisors.$.whatsappNumber': whatsappNumber || user?.whatsappNumber
                }
            }
        );

        // 3. Audit Log
        await new AuditLog({
            action: 'SUPERVISOR_UPDATED',
            performedBy: officeId,
            details: `Updated site supervisor: ${name} (${emailLower})`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Supervisor updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/remove-site-supervisor
// @desc    Unlink supervisor from company
router.post('/remove-site-supervisor', async (req, res) => {
    try {
        const { email, companyId, officeId } = req.body;
        if (!email || !companyId) return res.status(400).json({ message: 'Email and companyId are required' });

        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        company.siteSupervisors = company.siteSupervisors.filter(s => s.email !== email.toLowerCase().trim());
        await company.save();

        // Audit Log
        await new AuditLog({
            action: 'SUPERVISOR_REMOVED',
            performedBy: officeId,
            details: `Removed supervisor ${email} from company ${company.name}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Supervisor removed from company registry.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/onboard-faculty
// @desc    Onboard a Faculty Supervisor (Admin only)
router.post('/onboard-faculty', async (req, res) => {
    try {
        const { name, email, whatsappNumber, officeId } = req.body;

        // 1. Validation
        if (!name || !email || !whatsappNumber) {
            return res.status(400).json({ message: 'All fields are mandatory.' });
        }

        const emailLower = email.toLowerCase().trim();

        const existing = await User.findOne({ 
            $or: [
                { email: emailLower },
                { secondaryEmail: emailLower }
            ]
        });
        if (existing) {
            return res.status(400).json({ message: 'This email is already registered or linked to an account.' });
        }

        // 2. Generate Secure Token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours

        // 3. Create Record
        const faculty = new User({
            name,
            email: emailLower,
            whatsappNumber,
            role: 'faculty_supervisor',
            status: 'Pending Activation',
            activationToken: tokenHash,
            activationExpires: expiry,
            password: crypto.randomBytes(16).toString('hex') // Placeholder
        });

        await faculty.save();

        // 4. Audit Log
        await new AuditLog({
            action: 'FACULTY_ONBOARD',
            performedBy: officeId,
            targetUser: faculty._id,
            details: `Onboarded ${name} (${emailLower})`,
            ipAddress: req.ip
        }).save();

        // 5. Send Formal Email
        await sendFacultyNominationEmail(emailLower, rawToken, name);

        res.status(201).json({ message: 'Faculty supervisor onboarded. Nomination email sent.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/onboard-student
// @desc    Onboard a Student (Admin only)
router.post('/onboard-student', async (req, res) => {
    try {
        const { name, reg, email, semester, fatherName, whatsappNumber, section, cgpa, officeId } = req.body;

        if (!name || !reg || !email || !semester) {
            return res.status(400).json({ message: 'Core fields (Name, Reg, Email, Semester) are mandatory.' });
        }

        const emailLower = email.toLowerCase().trim();
        const regUpper = reg.toUpperCase().trim();

        if (!emailLower.endsWith('@cuiatd.edu.pk')) {
            return res.status(400).json({ message: 'Registration email must be an institutional address (@cuiatd.edu.pk)' });
        }

        const existing = await User.findOne({
            $or: [
                { email: emailLower },
                { reg: regUpper }
            ]
        });

        if (existing) {
            return res.status(400).json({ message: 'Email or Registration Number already exists.' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const expiry = Date.now() + 48 * 60 * 60 * 1000;

        const student = new User({
            name: name.trim(),
            reg: regUpper,
            email: emailLower,
            semester,
            fatherName: fatherName?.trim(),
            whatsappNumber: whatsappNumber?.trim(),
            section: section?.toUpperCase().trim(),
            cgpa: cgpa ? parseFloat(cgpa).toFixed(2) : null,
            role: 'student',
            status: 'unverified',
            emailVerificationToken: rawToken,
            emailVerificationExpires: expiry,
            password: crypto.randomBytes(16).toString('hex')
        });

        await student.save();

        await new AuditLog({
            action: 'STUDENT_ONBOARD',
            performedBy: officeId,
            targetUser: student._id,
            details: `Full Onboarding: ${name} (${regUpper}) - CGPA: ${cgpa || 'N/A'}`,
            ipAddress: req.ip
        }).save();

        try {
            await sendStudentActivationEmail(emailLower, rawToken, name);
        } catch (err) {
            return res.status(201).json({ 
                success: true,
                message: 'Student account created, but activation email failed. Manual resend required.' 
            });
        }

        res.status(201).json({ success: true, message: 'Full student profile created and activation email sent.' });

    } catch (err) {
        console.error('[ONBOARD ERROR]', err);
        res.status(500).json({ message: 'Internal server error while onboarding student' });
    }
});

// @route   POST api/office/resend-student-activation
// @desc    Resend activation link to student registry entry
router.post('/resend-student-activation', async (req, res) => {
    try {
        const { studentId, officeId } = req.body;

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found.' });
        }

        if (student.status !== 'unverified') {
            return res.status(400).json({ message: 'Account is already active/verified.' });
        }

        // Generate NEW Token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const expiry = Date.now() + 48 * 60 * 60 * 1000; // 48 Hours

        student.emailVerificationToken = rawToken;
        student.emailVerificationExpires = expiry;
        await student.save();

        // Audit Log
        await new AuditLog({
            action: 'STUDENT_ACTIVATION_RESEND',
            performedBy: officeId,
            targetUser: student._id,
            details: `Resent activation link to ${student.email}`,
            ipAddress: req.ip
        }).save();

        await sendStudentActivationEmail(student.email, rawToken, student.name);

        res.json({ message: 'Activation link resent successfully.' });

    } catch (err) {
        console.error('[RESEND STUDENT EMAIL ERROR]', err);
        res.status(500).json({ message: 'Server error while resending link' });
    }
});


// @route   POST api/office/resend-faculty-activation
// @desc    Resend activation link to faculty
router.post('/resend-faculty-activation', async (req, res) => {
    try {
        const { facultyId, officeId } = req.body;

        const faculty = await User.findById(facultyId);
        if (!faculty || faculty.role !== 'faculty_supervisor') {
            return res.status(404).json({ message: 'Faculty member not found.' });
        }

        if (faculty.status !== 'Pending Activation') {
            return res.status(400).json({ message: 'Account is already active or disabled.' });
        }

        // Check rate limit (simulated: max 3 attempts per hour) - for now just log it

        // Generate NEW Token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours

        faculty.activationToken = tokenHash;
        faculty.activationExpires = expiry;
        await faculty.save();

        // Audit Log
        await new AuditLog({
            action: 'FACULTY_ACTIVATION_RESEND',
            performedBy: officeId,
            targetUser: faculty._id,
            details: `Resent activation link to ${faculty.email}`,
            ipAddress: req.ip
        }).save();

        await sendFacultyNominationEmail(faculty.email, rawToken, faculty.name);

        res.json({ message: 'Activation link resent successfully.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT api/office/edit-faculty/:id
// @desc    Update faculty details (Name & WhatsApp ONLY)
router.put('/edit-faculty/:id', async (req, res) => {
    try {
        const { name, whatsappNumber, officeId } = req.body;
        const faculty = await User.findById(req.params.id);

        if (!faculty || faculty.role !== 'faculty_supervisor') {
            return res.status(404).json({ message: 'Faculty member not found.' });
        }

        faculty.name = name || faculty.name;
        faculty.whatsappNumber = whatsappNumber || faculty.whatsappNumber;
        await faculty.save();

        // Audit Log
        await new AuditLog({
            action: 'FACULTY_EDIT',
            performedBy: officeId,
            targetUser: faculty._id,
            details: `Updated faculty: ${faculty.email}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Faculty details updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/delete-faculty/:id
// @desc    Soft delete faculty (Set status to Inactive)
router.post('/delete-faculty/:id', async (req, res) => {
    try {
        const { officeId } = req.body;
        const faculty = await User.findById(req.params.id);

        if (!faculty || faculty.role !== 'faculty_supervisor') {
            return res.status(404).json({ message: 'Faculty member not found.' });
        }

        faculty.status = 'Inactive';
        await faculty.save();

        // Audit Log
        await new AuditLog({
            action: 'FACULTY_DEACTIVATE',
            performedBy: officeId,
            targetUser: faculty._id,
            details: `Deactivated faculty: ${faculty.email}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Faculty account deactivated.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/reset-faculty-password/:id
// @desc    Reset faculty password to random and force change on login
router.post('/reset-faculty-password/:id', async (req, res) => {
    try {
        const { officeId } = req.body;
        const faculty = await User.findById(req.params.id);

        if (!faculty || faculty.role !== 'faculty_supervisor') {
            return res.status(404).json({ message: 'Faculty member not found.' });
        }

        // 1. Generate Random Password
        const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 characters
        faculty.password = await bcrypt.hash(tempPassword, 12);
        faculty.mustChangePassword = true;
        await faculty.save();

        // 2. Audit Log
        await new AuditLog({
            action: 'FACULTY_PASSWORD_RESET',
            performedBy: officeId,
            targetUser: faculty._id,
            details: `Reset password for ${faculty.email}`,
            ipAddress: req.ip
        }).save();

        // 3. Send Email
        await sendFacultyPasswordResetEmail(faculty.email, tempPassword, faculty.name);

        res.json({ message: 'Password reset successful. Temporary password sent via email.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE api/office/companies/:id
// @desc    Soft delete a company (Set status to Inactive)
router.post('/delete-company/:id', async (req, res) => {
    try {
        const { officeId } = req.body;
        const company = await Company.findById(req.params.id);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        // Check if students are assigned to this company (by name)
        const assignedCount = await User.countDocuments({ assignedCompany: company.name });
        if (assignedCount > 0) {
            return res.status(400).json({
                message: `Cannot delete. ${assignedCount} student(s) are currently assigned to this company. Soft delete (deactivation) applied instead.`
            });
        }

        company.status = 'Inactive';
        await company.save();

        // Audit Log
        await new AuditLog({
            action: 'COMPANY_DEACTIVATE',
            performedBy: officeId,
            details: `Deactivated company: ${company.name}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Company deactivated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Assignment & Evaluation Routes ---

// @route   POST api/office/create-assignment
// @desc    Create a new internship assignment
router.post('/create-assignment', async (req, res) => {
    try {
        const { title, description, startDate, deadline, totalMarks, officeId } = req.body;

        const assignment = new Assignment({
            title,
            description,
            startDate,
            deadline,
            totalMarks,
            createdBy: officeId
        });

        await assignment.save();

        // Audit Log
        await new AuditLog({
            action: 'ASSIGNMENT_CREATED',
            performedBy: officeId,
            details: `Created assignment: ${title} (Deadline: ${deadline})`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Assignment created successfully', assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/assignments
// @desc    Get all assignments
router.get('/assignments', async (req, res) => {
    try {
        const assignments = await Assignment.find().sort({ createdAt: -1 });
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT api/office/update-assignment/:id
// @desc    Update assignment details / global deadline
router.put('/update-assignment/:id', async (req, res) => {
    try {
        const { title, description, startDate, deadline, totalMarks, status, officeId } = req.body;
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        assignment.title = title || assignment.title;
        assignment.description = description || assignment.description;
        assignment.startDate = startDate || assignment.startDate;
        assignment.deadline = deadline || assignment.deadline;
        assignment.totalMarks = totalMarks || assignment.totalMarks;
        assignment.status = status || assignment.status;

        await assignment.save();

        // Audit Log
        await new AuditLog({
            action: 'ASSIGNMENT_UPDATED',
            performedBy: officeId,
            details: `Updated assignment: ${assignment.title}. New deadline: ${assignment.deadline}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Assignment updated successfully', assignment });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/override-deadline
// @desc    Override deadline for a specific faculty member
router.post('/override-deadline', async (req, res) => {
    try {
        const { assignmentId, facultyId, newDeadline, officeId } = req.body;
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        // Check if override exists
        const overrideIndex = assignment.overrides.findIndex(o => o.facultyId.toString() === facultyId);
        if (overrideIndex > -1) {
            assignment.overrides[overrideIndex].deadline = newDeadline;
        } else {
            assignment.overrides.push({ facultyId, deadline: newDeadline });
        }

        await assignment.save();

        // Audit Log
        await new AuditLog({
            action: 'ASSIGNMENT_DEADLINE_OVERRIDE',
            performedBy: officeId,
            details: `Overrode deadline for faculty ${facultyId} on assignment ${assignmentId} to ${newDeadline}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Deadline override applied successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/all-marks
// @desc    Get all evaluation marks for all students with filters
router.get('/all-marks', async (req, res) => {
    try {
        const { program, semester } = req.query;
        let studentMatch = { role: 'student' };

        if (program === 'BCS' || program === 'CS') {
            studentMatch.reg = { $regex: /-BCS-/i };
        } else if (program === 'BSE' || program === 'SE') {
            studentMatch.reg = { $regex: /-BSE-/i };
        }

        if (semester && semester !== 'All') studentMatch.semester = parseInt(semester);

        const marks = await Mark.find()
            .populate({
                path: 'student',
                select: 'name reg semester',
                match: studentMatch
            })
            .populate('assignment', 'title totalMarks')
            .populate('faculty', 'name')
            .sort({ createdAt: -1 });

        // Filter out entries where student didn't match filters
        const filteredMarks = marks.filter(m => m.student !== null);
        res.json(filteredMarks);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/bulk-update-marks
// @desc    Add or Update marks for multiple students (Administrative Override)
router.post('/bulk-update-marks', async (req, res) => {
    try {
        const { assignmentId, facultyId, marksData, officeId } = req.body;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        for (let item of marksData) {
            const { studentId, marks } = item;
            if (marks === null || marks === '') continue;
            if (marks > assignment.totalMarks) continue;

            let markEntry = await Mark.findOne({ assignment: assignmentId, student: studentId });
            const action = markEntry ? 'MARK_OFFICE_UPDATE' : 'MARK_OFFICE_ADD';

            if (markEntry) {
                if (markEntry.marks !== marks) {
                    markEntry.history.push({
                        marks: markEntry.marks,
                        updatedBy: officeId,
                        updatedAt: new Date(),
                        reason: 'Administrative Override'
                    });
                    markEntry.marks = marks;
                    markEntry.lastUpdatedBy = officeId;
                    await markEntry.save();
                }
            } else {
                markEntry = new Mark({
                    assignment: assignmentId,
                    student: studentId,
                    faculty: facultyId,
                    marks,
                    createdBy: officeId,
                    lastUpdatedBy: officeId
                });
                await markEntry.save();
            }

            // Audit Log
            await new AuditLog({
                action,
                performedBy: officeId,
                targetUser: studentId,
                details: `Office Override: ${action === 'MARK_OFFICE_ADD' ? 'Added' : 'Updated'} marks (${marks}) for assignment ${assignment.title}`,
                ipAddress: req.ip
            }).save();
        }

        res.json({ message: 'Administrative mark update successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/evaluations
// @desc    Get all evaluations
router.get('/evaluations', protect, async (req, res) => {
    try {
        const evaluations = await Evaluation.find()
            .populate('student', 'name reg semester')
            .sort({ submittedAt: -1 });
        res.json(evaluations);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE api/office/delete-assignment/:id
router.delete('/delete-assignment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment.findById(id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        const Submission = await import('../models/Submission.js').then(m => m.default);

        // Purge all associated components
        await Promise.all([
            Assignment.findByIdAndDelete(id),
            Submission.deleteMany({ assignment: id }),
            Mark.deleteMany({ assignment: id })
        ]);

        // Audit Log
        await new AuditLog({
            action: 'ASSIGNMENT_DELETED',
            performedBy: req.body.officeId || 'SYSTEM',
            details: `Permanent Deletion: ${assignment.title} and all associated submissions purged.`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Assignment and associated data purged successfully.' });
    } catch (err) {
        console.error('Delete assignment error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Shared grade helper ──────────────────────────────────────────────────────
function calcGrade(pct) {
    if (pct >= 85) return { grade: 'A', gp: '3.67–4.00', status: 'Pass' };
    if (pct >= 80) return { grade: 'A-', gp: '3.34–3.66', status: 'Pass' };
    if (pct >= 75) return { grade: 'B+', gp: '3.01–3.33', status: 'Pass' };
    if (pct >= 71) return { grade: 'B', gp: '2.67–3.00', status: 'Pass' };
    if (pct >= 68) return { grade: 'B-', gp: '2.34–2.66', status: 'Pass' };
    if (pct >= 64) return { grade: 'C+', gp: '2.01–2.33', status: 'Pass' };
    if (pct >= 61) return { grade: 'C', gp: '1.67–2.00', status: 'Pass' };
    if (pct >= 58) return { grade: 'C-', gp: '1.31–1.66', status: 'Pass' };
    if (pct >= 54) return { grade: 'D+', gp: '1.01–1.30', status: 'Pass' };
    if (pct >= 50) return { grade: 'D', gp: '0.10–1.00', status: 'Pass' };
    return { grade: 'F', gp: '0.00', status: 'Fail' };
}

// @route   GET api/office/aggregated-marks
// @desc    Get aggregated evaluation marks for all students with correct grade
router.get('/aggregated-marks', protect, async (req, res) => {
    try {
        const { program, semester } = req.query;
        // Include ALL students in the cohort for reporting, not just graded ones
        let studentMatch = { role: 'student' };

        if (program === 'BCS' || program === 'CS') studentMatch.reg = { $regex: /-BCS-/i };
        else if (program === 'BSE' || program === 'SE') studentMatch.reg = { $regex: /-BSE-/i };
        if (semester && semester !== 'All') studentMatch.semester = parseInt(semester);

        const students = await User.find(studentMatch)
            .select('name reg semester assignedCompany assignedFaculty assignedSiteSupervisor internshipRequest status email secondaryEmail whatsappNumber section')
            .populate('assignedFaculty', 'name email whatsappNumber')
            .populate('assignedSiteSupervisor', 'name email whatsappNumber');

        const results = [];
        for (const s of students) {
            const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
            
            // Determine participation category
            const isFreelance = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
            const placementMode = isFreelance ? 'Freelance' : 'Standard (Physical)';

            const taskScores = marks.map(m => {
                const fScore = m.facultyMarks || 0;
                const sScore = m.siteSupervisorMarks || 0;
                return isFreelance ? fScore : (fScore + sScore) / 2;
            });

            const avgScore = marks.length > 0 ? (taskScores.reduce((sum, val) => sum + val, 0) / taskScores.length) : 0;
            const pct = Math.round((avgScore / 10) * 100);
            
            // If they have no marks, they might be 'Ineligible' or 'Pending'
            let { grade, gp, status } = calcGrade(pct);
            
            // Override status/grade for those who haven't participated
            if (marks.length === 0) {
                grade = 'N/A';
                gp = 0;
                // If the student is not yet 'Assigned', they are effectively 'Ineligible' for this cycle's reports
                if (s.status === 'Assigned' || s.status === 'Internship Approved' || s.status === 'Agreement Approved') {
                    status = 'Pending Evaluation';
                } else if (s.status === 'Fail') {
                    status = 'Fail';
                } else {
                    status = 'Ineligible';
                }
            }

            results.push({
                student: { 
                    name: s.name, 
                    reg: s.reg, 
                    _id: s._id, 
                    email: s.email, 
                    secondaryEmail: s.secondaryEmail || 'N/A',
                    phone: s.whatsappNumber || 'N/A',
                    section: s.section || 'N/A'
                },
                faculty: {
                    name: s.assignedFaculty?.name || 'Unassigned',
                    email: s.assignedFaculty?.email || 'N/A',
                    phone: s.assignedFaculty?.whatsappNumber || 'N/A'
                },
                siteSupervisor: {
                    name: s.assignedSiteSupervisor?.name || 'N/A',
                    email: s.assignedSiteSupervisor?.email || 'N/A',
                    phone: s.assignedSiteSupervisor?.whatsappNumber || 'N/A'
                },
                mode: placementMode,
                company: s.assignedCompany || 'N/A',
                assignmentsCount: marks.length,
                averageMarks: avgScore.toFixed(2),
                percentage: pct,
                grade,
                gradePoints: gp,
                currentStatus: s.status, // Database status
                reportStatus: status     // Calculated academic status
            });
        }
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/archives
router.get('/archives', async (req, res) => {
    try {
        const archives = await Archive.find().sort({ createdAt: -1 });
        res.json(archives);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
