import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Mark from '../models/Mark.js';
import AuditLog from '../models/AuditLog.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Role Check Middleware
const isFaculty = (req, res, next) => {
    if (req.user.role !== 'faculty_supervisor') {
        return res.status(403).json({ message: 'Access denied. Faculty only.' });
    }
    next();
};

// Multer Setup for Faculty Assignments
const assignmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/assignments';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `faculty-${Date.now()}-${file.originalname}`);
    }
});
const uploadAssignment = multer({ storage: assignmentStorage });

// @route   GET api/faculty/assignments
// @desc    Get assignments with supervisor-specific deadlines
router.get('/assignments', protect, isFaculty, async (req, res) => {
    try {
        const assignments = await Assignment.find({
            status: 'Active',
            startDate: { $lte: new Date() } // Only show if the current time matches or is after the starting date/time
        });

        const processedAssignments = assignments.map(assignment => {
            const override = assignment.overrides.find(o => o.facultyId.toString() === req.user.id);
            const effectiveDeadline = override ? override.deadline : assignment.deadline;

            // Check if deadline has passed
            const isClosed = new Date() > new Date(effectiveDeadline);

            return {
                ...assignment.toObject(),
                effectiveDeadline,
                isOverridden: !!override,
                isClosed // Portal shows Closed when time is up
            };
        });

        res.json(processedAssignments);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/faculty/assignment-students/:assignmentId
// @desc    Get students assigned to this faculty and their marks for a specific assignment
router.get('/assignment-students/:assignmentId', protect, isFaculty, async (req, res) => {
    try {
        const { assignmentId } = req.params;

        // 1. Get all students assigned to this faculty
        const students = await User.find({ assignedFaculty: req.user.id, status: 'Assigned' });

        // 2. Get marks for this assignment and these students
        const studentIds = students.map(s => s._id);
        const marks = await Mark.find({
            assignment: assignmentId,
            student: { $in: studentIds }
        });

        // 3. Map students to their marks
        const result = students.map(student => {
            const markEntry = marks.find(m => m.student.toString() === student._id.toString());
            return {
                _id: student._id,
                name: student.name,
                reg: student.reg,
                semester: student.semester,
                marks: markEntry ? markEntry.marks : null,
                markId: markEntry ? markEntry._id : null,
                lastUpdated: markEntry ? markEntry.updatedAt : null
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/faculty/submit-marks
// @desc    Add or Update marks for a student
router.post('/submit-marks', protect, isFaculty, async (req, res) => {
    try {
        const { assignmentId, studentId, marks } = req.body;

        // 1. Check Deadline and Total Marks
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        const override = assignment.overrides.find(o => o.facultyId.toString() === req.user.id);
        const effectiveDeadline = override ? override.deadline : assignment.deadline;

        if (new Date() > new Date(effectiveDeadline)) {
            return res.status(403).json({ message: 'Deadline Passed – Editing Locked' });
        }

        if (marks > assignment.totalMarks) {
            return res.status(400).json({ message: `Marks cannot exceed the total marks (${assignment.totalMarks}).` });
        }

        // 2. Upsert Mark
        let markEntry = await Mark.findOne({ assignment: assignmentId, student: studentId });
        const action = markEntry ? 'MARK_UPDATED' : 'MARK_ADDED';

        if (markEntry) {
            // Save to history before updating
            markEntry.history.push({
                marks: markEntry.marks,
                updatedBy: req.user.id,
                updatedAt: new Date()
            });
            markEntry.marks = marks;
            markEntry.lastUpdatedBy = req.user.id;
        } else {
            markEntry = new Mark({
                assignment: assignmentId,
                student: studentId,
                faculty: req.user.id,
                marks,
                createdBy: req.user.id,
                lastUpdatedBy: req.user.id
            });
        }

        await markEntry.save();

        // 3. Audit Log
        await new AuditLog({
            action,
            performedBy: req.user.id,
            targetUser: studentId,
            details: `${action === 'MARK_ADDED' ? 'Added' : 'Updated'} marks (${marks}) for assignment ${assignment.title}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Marks submitted successfully', markEntry });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/faculty/bulk-submit-marks
// @desc    Add or Update marks for multiple students
router.post('/bulk-submit-marks', protect, isFaculty, async (req, res) => {
    try {
        const { assignmentId, marksData } = req.body; // marksData is an array of { studentId, marks }

        // 1. Check Global Deadline
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        const override = assignment.overrides.find(o => o.facultyId.toString() === req.user.id);
        const effectiveDeadline = override ? override.deadline : assignment.deadline;

        if (new Date() > new Date(effectiveDeadline)) {
            return res.status(403).json({ message: 'Deadline Passed – Editing Locked' });
        }

        // 2. Process each mark entry
        for (let item of marksData) {
            const { studentId, marks } = item;

            // Skip if marks are empty or exceed total
            if (marks === null || marks === '') continue;
            if (marks > assignment.totalMarks) continue;

            let markEntry = await Mark.findOne({ assignment: assignmentId, student: studentId });
            const action = markEntry ? 'MARK_UPDATED' : 'MARK_ADDED';

            if (markEntry) {
                // Save to history if changed
                if (markEntry.marks !== marks) {
                    markEntry.history.push({
                        marks: markEntry.marks,
                        updatedBy: req.user.id,
                        updatedAt: new Date()
                    });
                    markEntry.marks = marks;
                    markEntry.lastUpdatedBy = req.user.id;
                    await markEntry.save();
                }
            } else {
                markEntry = new Mark({
                    assignment: assignmentId,
                    student: studentId,
                    faculty: req.user.id,
                    marks,
                    createdBy: req.user.id,
                    lastUpdatedBy: req.user.id
                });
                await markEntry.save();
            }

            // Audit Log
            await new AuditLog({
                action,
                performedBy: req.user.id,
                targetUser: studentId,
                details: `${action === 'MARK_ADDED' ? 'Added' : 'Updated'} marks (${marks}) for assignment ${assignment.title}`,
                ipAddress: req.ip
            }).save();
        }

        res.json({ message: 'All marks processed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/faculty/create-assignment
// @desc    Create a new assignment by faculty
router.post('/create-assignment', protect, isFaculty, uploadAssignment.single('file'), async (req, res) => {
    try {
        const { title, description, startDate, deadline, totalMarks } = req.body;

        const assignment = new Assignment({
            title,
            courseTitle: 'Internship',
            description,
            startDate,
            deadline,
            totalMarks: totalMarks || 100,
            createdBy: req.user.id,
            fileUrl: req.file ? `/uploads/assignments/${req.file.filename}` : null
        });

        await assignment.save();

        // Audit Log
        await new AuditLog({
            action: 'FACULTY_ASSIGNMENT_CREATED',
            performedBy: req.user.id,
            details: `Faculty created assignment: ${title}`,
            ipAddress: req.ip
        }).save();

        res.status(201).json({ message: 'Assignment created successfully', assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/faculty/my-created-assignments
// @desc    Get assignments created by this faculty
router.get('/my-created-assignments', protect, isFaculty, async (req, res) => {
    try {
        const assignments = await Assignment.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/faculty/assignment-submissions/:assignmentId
// @desc    Get all student submissions for a specific assignment
router.get('/assignment-submissions/:assignmentId', protect, isFaculty, async (req, res) => {
    try {
        const { assignmentId } = req.params;

        // 1. Get all students assigned to this faculty
        const students = await User.find({ assignedFaculty: req.user.id, status: 'Assigned' });
        const studentIds = students.map(s => s._id);

        // 2. Get submissions for this assignment and these students
        const submissions = await Submission.find({
            assignment: assignmentId,
            student: { $in: studentIds }
        }).populate('student', 'name reg');

        // 3. Combine students with their submission status
        const result = students.map(student => {
            const sub = submissions.find(s => s.student._id.toString() === student._id.toString());
            return {
                sr: student.reg,
                reg: student.reg,
                name: student.name,
                submittedAt: sub ? sub.submissionDate : null,
                status: sub ? 'Submitted' : 'Pending',
                fileUrl: sub ? sub.fileUrl : null,
                submissionId: sub ? sub._id : null
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/faculty/bulk-download-submissions
// @desc    Download selected submissions as a ZIP file
router.post('/bulk-download-submissions', protect, isFaculty, async (req, res) => {
    try {
        const { submissionIds } = req.body;
        if (!submissionIds || submissionIds.length === 0) {
            return res.status(400).json({ message: 'No submissions selected' });
        }

        const submissions = await Submission.find({ _id: { $in: submissionIds } }).populate('student', 'name reg');

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`submissions-${Date.now()}.zip`);
        archive.pipe(res);

        for (const sub of submissions) {
            const filePath = sub.fileUrl.startsWith('/') ? sub.fileUrl.substring(1) : sub.fileUrl;
            if (fs.existsSync(filePath)) {
                const extension = path.extname(filePath);
                archive.file(filePath, { name: `${sub.student.reg}-${sub.student.name.replace(/\s+/g, '_')}${extension}` });
            }
        }

        await archive.finalize();
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error generating zip file' });
        }
    }
});

// @route   PUT api/faculty/update-assignment/:id
// @desc    Update an existing assignment by faculty
router.put('/update-assignment/:id', protect, isFaculty, uploadAssignment.single('file'), async (req, res) => {
    try {
        const { title, description, startDate, deadline, totalMarks } = req.body;
        const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.id });

        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        assignment.title = title || assignment.title;
        assignment.description = description !== undefined ? description : assignment.description;
        assignment.startDate = startDate || assignment.startDate;
        assignment.deadline = deadline || assignment.deadline;
        assignment.totalMarks = totalMarks || assignment.totalMarks;

        if (req.file) {
            // Delete old file if exists
            if (assignment.fileUrl) {
                const oldPath = assignment.fileUrl.startsWith('/') ? assignment.fileUrl.substring(1) : assignment.fileUrl;
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            assignment.fileUrl = `/uploads/assignments/${req.file.filename}`;
        }

        await assignment.save();

        // Audit Log
        await new AuditLog({
            action: 'FACULTY_ASSIGNMENT_UPDATED',
            performedBy: req.user.id,
            details: `Faculty updated assignment: ${assignment.title}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Assignment updated successfully', assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE api/faculty/delete-assignment/:id
// @desc    Delete an assignment
router.delete('/delete-assignment/:id', protect, isFaculty, async (req, res) => {
    try {
        const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        // Check if any student has submitted
        const submissionCount = await Submission.countDocuments({ assignment: req.params.id });
        if (submissionCount > 0) {
            return res.status(400).json({ message: 'Cannot delete assignment with existing student submissions.' });
        }

        // Delete associated file
        if (assignment.fileUrl) {
            const filePath = assignment.fileUrl.startsWith('/') ? assignment.fileUrl.substring(1) : assignment.fileUrl;
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await Assignment.deleteOne({ _id: req.params.id });

        // Audit Log
        await new AuditLog({
            action: 'FACULTY_ASSIGNMENT_DELETED',
            performedBy: req.user.id,
            details: `Faculty deleted assignment: ${assignment.title}`,
            ipAddress: req.ip
        }).save();

        res.json({ message: 'Assignment deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/faculty/my-students
// @desc    Get all students assigned to this faculty
router.get('/my-students', protect, isFaculty, async (req, res) => {
    try {
        const students = await User.find({
            assignedFaculty: req.user.id,
            role: 'student'
        }).select('name reg internshipAgreement.companyName status assignedCompany');

        const result = students.map(s => ({
            id: s._id,
            name: s.name,
            reg: s.reg,
            company: s.assignedCompany || s.internshipAgreement?.companyName || 'Not Assigned',
            status: s.status
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/faculty/student-profile/:id
// @desc    Get detailed student profile
router.get('/student-profile/:id', protect, isFaculty, async (req, res) => {
    try {
        const student = await User.findOne({
            _id: req.params.id,
            assignedFaculty: req.user.id
        }).select('-password');

        if (!student) {
            return res.status(404).json({ message: 'Student not found or not assigned to you' });
        }

        res.json(student);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
