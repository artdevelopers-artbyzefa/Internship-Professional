import express from 'express';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
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

export default router;
