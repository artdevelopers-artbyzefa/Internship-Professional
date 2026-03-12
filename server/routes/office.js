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
    sendCompanySupervisorActivationEmail
} from '../emailServices/emailService.js';
import { getPKTTime } from '../utils/time.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/office/all-students
// @desc    Get all student accounts (for registry)
router.get('/all-students', async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .select('name email reg semester status createdAt')
            .sort({ createdAt: -1 });
        res.json(students);
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
            .select('name email reg semester status assignedFaculty assignedSiteSupervisor assignedCompany assignedCompanySupervisor internshipRequest createdAt')
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
// @desc    Get all students who have submitted, approved, or rejected internship requests
router.get('/internship-request-students', async (req, res) => {
    try {
        const students = await User.find({
            role: 'student',
            status: { $in: ['Internship Request Submitted', 'Internship Approved', 'Internship Rejected'] }
        })
            .populate('assignedFaculty', 'name email')
            .sort({ 'internshipRequest.submittedAt': -1 });
        res.json(students);
    } catch (err) {
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
        let user = await User.findOne({ email: emailLower });
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
        let faculty = await User.findOne({ email: emailLower });
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
        const { studentId, decision, comment } = req.body;

        const user = await User.findById(studentId);
        if (!user) return res.status(404).json({ message: 'Student not found' });

        if (decision === 'approve') {
            user.status = 'Internship Approved';
        } else {
            user.status = 'Internship Rejected';
            user.internshipRequest.rejectionReason = comment;
        }

        await user.save();
        console.log(`[${getPKTTime()}] [OFFICE] Internship Request ${decision === 'approve' ? 'Approved' : 'Rejected'} for ${user.email}`);

        res.json({ message: `Internship request ${decision}d` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/office/pending-agreements
// @desc    Get all students with pending agreements
router.get('/pending-agreements', async (req, res) => {
    try {
        const students = await User.find({
            status: { $in: ['Agreement Submitted - Self', 'Agreement Submitted - University Assigned'] },
            role: 'student'
        });
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
        }).select('name email reg semester status');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
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
// @desc    Get all registered companies with assigned student counts
router.get('/companies', async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });

        // Aggregate students assigned to each company supervisor
        // Use separate match logic for email (robust) and name/company (fallback for legacy)
        const assignmentsByEmail = await User.aggregate([
            { $match: { role: 'student', assignedCompanySupervisorEmail: { $exists: true, $ne: null } } },
            { $group: { _id: '$assignedCompanySupervisorEmail', count: { $sum: 1 } } }
        ]);

        const assignmentsByName = await User.aggregate([
            { $match: { role: 'student', assignedCompanySupervisor: { $exists: true, $ne: null } } },
            { $group: { _id: { company: '$assignedCompany', supervisor: '$assignedCompanySupervisor' }, count: { $sum: 1 } } }
        ]);

        const companyCountMap = {};
        assignmentsByName.forEach(curr => {
            const comp = curr._id.company || 'Unknown';
            companyCountMap[comp] = (companyCountMap[comp] || 0) + curr.count;
        });

        // For student-submitted companies, fetch assigned students to supplement any missing supervisor info
        const studentSubmissionNames = companies
            .filter(c => c.source === 'student_submission')
            .map(c => c.name.trim());

        const studentSupervisorMap = {};
        if (studentSubmissionNames.length > 0) {
            const assignedStudents = await User.find({
                role: 'student',
                assignedCompany: { $in: studentSubmissionNames },
                assignedCompanySupervisor: { $exists: true, $nin: [null, ''] }
            }).select('assignedCompany assignedCompanySupervisor assignedCompanySupervisorEmail internshipRequest.siteSupervisorEmail internshipRequest.siteSupervisorPhone internshipRequest.siteSupervisorName');

            assignedStudents.forEach(s => {
                const compKey = (s.assignedCompany || '').trim();
                // Use best available email: assigned field first, then from internship request
                const email = (
                    s.assignedCompanySupervisorEmail ||
                    s.internshipRequest?.siteSupervisorEmail ||
                    ''
                ).toLowerCase().trim();
                const phone = s.internshipRequest?.siteSupervisorPhone || '';
                const name = s.assignedCompanySupervisor || s.internshipRequest?.siteSupervisorName || '';
                const mapKey = email || name;

                if (!studentSupervisorMap[compKey]) studentSupervisorMap[compKey] = {};
                if (!studentSupervisorMap[compKey][mapKey]) {
                    studentSupervisorMap[compKey][mapKey] = {
                        name,
                        email,
                        whatsappNumber: phone,
                        assignedStudents: 1
                    };
                } else {
                    studentSupervisorMap[compKey][mapKey].assignedStudents++;
                }
            });
        }

        const companiesWithCounts = companies.map(company => {
            const companyObj = company.toObject();
            companyObj.assignedStudents = companyCountMap[company.name] || 0;

            companyObj.siteSupervisors = companyObj.siteSupervisors.map(sup => {
                const supEmail = sup.email?.toLowerCase().trim();
                const supNameLower = sup.name?.toLowerCase().trim();

                const studentCountByEmail = assignmentsByEmail.find(a => a._id === supEmail);
                const studentCountByName = assignmentsByName.find(a =>
                    (a._id.company || '').toLowerCase().trim() === (company.name || '').toLowerCase().trim() &&
                    (a._id.supervisor || '').toLowerCase().trim() === supNameLower
                );

                return {
                    ...sup,
                    assignedStudents: studentCountByEmail ? studentCountByEmail.count : (studentCountByName ? studentCountByName.count : 0)
                };
            });

            // Merge in supervisors from students that aren't already in the company's siteSupervisors list
            if (company.source === 'student_submission') {
                const fromStudents = Object.values(studentSupervisorMap[company.name.trim()] || {});
                fromStudents.forEach(studentSup => {
                    const alreadyListed = companyObj.siteSupervisors.some(
                        s => (s.email || '').toLowerCase().trim() === studentSup.email ||
                            (s.name || '').toLowerCase().trim() === (studentSup.name || '').toLowerCase().trim()
                    );
                    if (!alreadyListed) {
                        companyObj.siteSupervisors.push(studentSup);
                    }
                });
            }

            return companyObj;
        });

        res.json(companiesWithCounts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/add-company
// @desc    Manually add an MOU company and onboard site supervisors
router.post('/add-company', async (req, res) => {
    try {
        const { name, regNo, siteSupervisors, officeId } = req.body;

        // 1. Uniqueness check
        const existing = await Company.findOne({ $or: [{ name }, { regNo }] });
        if (existing) {
            return res.status(400).json({ message: 'Company name or Registration Number already exists.' });
        }

        // 2. Save Company
        const company = new Company({
            ...req.body,
            source: 'manual',
            isMOUSigned: true
        });
        await company.save();

        // 3. Automated Supervisor Onboarding
        if (siteSupervisors && siteSupervisors.length > 0) {
            for (const supervisor of siteSupervisors) {
                try {
                    const supervisorEmail = supervisor.email.toLowerCase().trim();

                    // Check if user already exists
                    let user = await User.findOne({ email: supervisorEmail });
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

        // 2. Check if supervisor already exists in user database or company's list
        const supervisorExistsInCompany = company.siteSupervisors.some(s => s.email === supervisorEmail);
        if (supervisorExistsInCompany) {
            return res.status(400).json({ message: 'Supervisor already linked to this company.' });
        }

        // 3. Update Company Record
        company.siteSupervisors.push({ name, email: supervisorEmail, whatsappNumber });
        await company.save();

        // 4. Onboard User
        let user = await User.findOne({ email: supervisorEmail });
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

        const existing = await User.findOne({ email: emailLower });
        if (existing) {
            return res.status(400).json({ message: 'Email is already registered.' });
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
        const { name, reg, email, semester, officeId } = req.body;

        // 1. Validation
        if (!name || !reg || !email || !semester) {
            return res.status(400).json({ message: 'All fields are mandatory.' });
        }

        const emailLower = email.toLowerCase().trim();

        const existing = await User.findOne({
            $or: [
                { email: emailLower },
                { reg: reg.toUpperCase() }
            ]
        });

        if (existing) {
            return res.status(400).json({ message: 'Email or Registration Number is already registered.' });
        }

        // 2. Generate Secure Token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours

        // 3. Create Record
        const student = new User({
            name,
            reg: reg.toUpperCase(),
            email: emailLower,
            semester,
            role: 'student',
            status: 'unverified', // Maps to student activation flow
            emailVerificationToken: rawToken, // Reuse student verification flow
            emailVerificationExpires: expiry,
            password: crypto.randomBytes(16).toString('hex') // Placeholder
        });

        await student.save();

        // 4. Audit Log
        await new AuditLog({
            action: 'STUDENT_ONBOARD',
            performedBy: officeId,
            targetUser: student._id,
            details: `Onboarded Student: ${name} (${reg})`,
            ipAddress: req.ip
        }).save();

        // 5. Send Formal Email
        await sendStudentActivationEmail(emailLower, rawToken, name);

        res.status(201).json({ message: 'Student account created. Activation email sent.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
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
        let studentMatch = { role: 'student', status: { $in: ['Assigned', 'Agreement Approved', 'Internship Approved', 'Pass', 'Fail'] } };

        if (program === 'BCS' || program === 'CS') studentMatch.reg = { $regex: /-BCS-/i };
        else if (program === 'BSE' || program === 'SE') studentMatch.reg = { $regex: /-BSE-/i };
        if (semester && semester !== 'All') studentMatch.semester = parseInt(semester);

        const students = await User.find(studentMatch)
            .select('name reg semester assignedCompany assignedFaculty')
            .populate('assignedFaculty', 'name');

        const results = [];
        for (const s of students) {
            const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
            if (marks.length === 0 && s.status !== 'Fail') continue;

            const isFreelance = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);

            const taskScores = marks.map(m => {
                const fScore = m.facultyMarks || 0;
                const sScore = m.siteSupervisorMarks || 0;
                return isFreelance ? fScore : (fScore + sScore) / 2;
            });

            const avgScore = marks.length > 0 ? (taskScores.reduce((sum, val) => sum + val, 0) / taskScores.length) : 0;
            const pct = Math.round((avgScore / 10) * 100);
            const { grade, gp, status } = calcGrade(pct);

            results.push({
                student: { name: s.name, reg: s.reg, _id: s._id },
                faculty: s.assignedFaculty?.name || 'N/A',
                company: s.assignedCompany || 'N/A',
                assignmentsCount: marks.length,
                averageMarks: avgScore.toFixed(2),  // X.XX / 10
                percentage: pct,                   // 0-100
                grade,
                gradePoints: gp,
                status
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
