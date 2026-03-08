import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Mark from '../models/Mark.js';
import AuditLog from '../models/AuditLog.js';
import {
    sendFacultyNominationEmail,
    sendAssignmentConfirmationEmail,
    sendFacultyPasswordResetEmail,
    sendStudentActivationEmail
} from '../emailServices/emailService.js';
import { getPKTTime } from '../utils/time.js';

const router = express.Router();

// @route   GET api/office/pending-requests
// @desc    Get all students with pending internship requests
router.get('/pending-requests', async (req, res) => {
    try {
        const students = await User.find({ status: 'Internship Request Submitted', role: 'student' });
        res.json(students);
    } catch (err) {
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
        const students = await User.find({ status: 'Agreement Approved', role: 'student' });
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

// @route   GET api/office/companies
// @desc    Get all registered companies
router.get('/companies', async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.json(companies);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/office/add-company
// @desc    Manually add an MOU company
router.post('/add-company', async (req, res) => {
    try {
        const { name, regNo } = req.body;

        // Uniqueness check
        const existing = await Company.findOne({ $or: [{ name }, { regNo }] });
        if (existing) {
            return res.status(400).json({ message: 'Company name or Registration Number already exists.' });
        }

        const company = new Company({
            ...req.body,
            source: 'manual',
            isMOUSigned: true
        });
        await company.save();

        // Audit Log
        await new AuditLog({
            action: 'COMPANY_ADDED',
            performedBy: req.body.officeId,
            details: `Added MOU Company: ${name}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'MOU Company added successfully' });
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
        const expiry = Date.now() + 30 * 60 * 1000; // 30 Minutes

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
        const expiry = Date.now() + 30 * 60 * 1000;

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

export default router;
