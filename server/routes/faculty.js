import express from 'express';
import ExcelJS from 'exceljs';
import path from 'path';
import archiver from 'archiver';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Mark from '../models/Mark.js';
import AuditLog from '../models/AuditLog.js';
import { protect } from '../middleware/auth.js';
import { uploadCloudinary } from '../utils/cloudinary.js';
import https from 'https';
import { createNotification } from '../utils/notifications.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Faculty
 *   description: Faculty supervisor management of students, assignments, and grading
 */

function isFaculty(req, res, next) {
    if (req.user.role !== 'faculty_supervisor') {
        return res.status(403).json({ message: 'Access denied. Faculty only.' });
    }
    next();
}

function isStaff(req, res, next) {
    const allowed = ['faculty_supervisor', 'internship_office', 'hod', 'site_supervisor'];
    if (!allowed.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied.' });
    }
    next();
}

/**
 * @swagger
 * /faculty/pending-requests:
 *   get:
 *     summary: Get student internship requests assigned to this faculty
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending student requests
 */
router.get('/pending-requests', protect, isFaculty, asyncHandler(async (req, res) => {
    const students = await User.find({
        role: 'student',
        $or: [
            { 'internshipRequest.selectedFacultyId': req.user.id },
            { 'internshipRequest.newFacultyDetails.email': req.user.email.toLowerCase() }
        ],
        'internshipRequest.facultyStatus': 'Pending'
    }).select('name reg email internshipRequest.companyName internshipRequest.type internshipRequest.mode internshipRequest.submittedAt');

    res.json(students);
}));

/**
 * @swagger
 * /faculty/stats:
 *   get:
 *     summary: Get faculty dashboard summary counts
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counts of pending requests and assigned students
 */
router.get('/stats', protect, isFaculty, asyncHandler(async (req, res) => {
    const [pendingCount, studentCount] = await Promise.all([
        User.countDocuments({
            role: 'student',
            $or: [
                { 'internshipRequest.selectedFacultyId': req.user.id },
                { 'internshipRequest.newFacultyDetails.email': req.user.email.toLowerCase() }
            ],
            'internshipRequest.facultyStatus': 'Pending'
        }),
        User.countDocuments({ assignedFaculty: req.user.id, role: 'student' })
    ]);

    res.json({
        pendingRequests: pendingCount,
        assignedStudents: studentCount
    });
}));

/**
 * @swagger
 * /faculty/handle-request:
 *   post:
 *     summary: Accept or reject a student supervision request
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, action]
 *             properties:
 *               studentId: { type: string }
 *               action: { type: string, enum: [Accepted, Rejected] }
 *     responses:
 *       200:
 *         description: Request processed successfully
 */
router.post('/handle-request', protect, isFaculty, asyncHandler(async (req, res) => {
    const { studentId, action } = req.body;

    if (!['Accepted', 'Rejected'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
    }

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.internshipRequest.facultyStatus = action;

    if (action === 'Accepted') {
        student.assignedFaculty = req.user.id;
    }

    await student.save();

    await createNotification({
        recipient: studentId,
        sender: req.user.id,
        type: 'internship_request',
        title: `Supervision Request ${action}`,
        message: `Faculty Supervisor ${req.user.name} has ${action.toLowerCase()} your internship supervision request.`,
        link: '/student/dashboard'
    });

    await new AuditLog({
        action: `FACULTY_REQUEST_${action.toUpperCase()}`,
        performedBy: req.user.id,
        targetUser: studentId,
        details: `Faculty ${action.toLowerCase()}ed supervision request from ${student.name} (${student.reg})`,
        ipAddress: req.ip
    }).save();

    res.json({ message: `Request ${action.toLowerCase()}ed successfully` });
}));

/**
 * @swagger
 * /faculty/pending-grading:
 *   get:
 *     summary: Retrieve list of students with pending grades
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated list of pending evaluations
 */
router.get('/pending-grading', protect, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const students = await User.find({ assignedFaculty: req.user.id }).select('_id').lean();
    const studentIds = students.map(s => s._id);

    const query = { 
        student: { $in: studentIds },
        isFacultyGraded: false 
    };

    const count = await Mark.countDocuments(query);
    const marks = await Mark.find(query)
        .populate('student', 'name reg')
        .populate('assignment', 'title')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 })
        .lean();

    res.json({
        data: marks,
        total: count,
        page,
        pages: Math.ceil(count / limit)
    });
}));

/**
 * @swagger
 * /faculty/assignments/active:
 *   get:
 *     summary: Get active assignments with supervisor-specific deadlines
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active assignments with overrides
 */
router.get('/assignments/active', protect, isFaculty, asyncHandler(async (req, res) => {
    const assignments = await Assignment.find({
        status: 'Active',
        startDate: { $lte: new Date() }
    });

    const processedAssignments = assignments.map(assignment => {
        const override = assignment.overrides.find(o => o.facultyId.toString() === req.user.id);
        const effectiveDeadline = override ? override.deadline : assignment.deadline;
        const isClosed = new Date() > new Date(effectiveDeadline);

        return {
            ...assignment.toObject(),
            effectiveDeadline,
            isOverridden: !!override,
            isClosed
        };
    });

    res.json(processedAssignments);
}));

/**
 * @swagger
 * /faculty/assignment-students/{assignmentId}:
 *   get:
 *     summary: Get students assigned to this faculty and their marks for a specific assignment
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrollment and marking summary
 */
router.get('/assignment-students/:assignmentId', protect, isFaculty, asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const students = await User.find({ assignedFaculty: req.user.id, status: 'Assigned' });
    const studentIds = students.map(s => s._id);
    const marks = await Mark.find({
        assignment: assignmentId,
        student: { $in: studentIds }
    });

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
}));

/**
 * @swagger
 * /faculty/submit-marks:
 *   post:
 *     summary: Submit or update marks for a student submission
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Marks saved successfully
 */
router.post('/submit-marks', protect, isFaculty, asyncHandler(async (req, res) => {
    const { assignmentId, studentId, marks } = req.body;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const override = assignment.overrides.find(o => o.facultyId.toString() === req.user.id);
    const effectiveDeadline = override ? override.deadline : assignment.deadline;

    if (new Date() > new Date(effectiveDeadline)) return res.status(403).json({ message: 'Deadline Passed – Editing Locked' });
    if (marks > 10) return res.status(400).json({ message: `Marks cannot exceed the total marks (10).` });

    let markEntry = await Mark.findOne({ assignment: assignmentId, student: studentId });
    if (markEntry && markEntry.isFacultyGraded) return res.status(403).json({ message: 'Marks already finalized – Editing Locked' });

    const action = markEntry ? 'MARK_UPDATED' : 'MARK_ADDED';
    if (markEntry) {
        markEntry.history.push({ marks: markEntry.marks, updatedBy: req.user.id, updatedAt: new Date() });
        markEntry.marks = marks;
        markEntry.lastUpdatedBy = req.user.id;
    } else {
        markEntry = new Mark({ assignment: assignmentId, student: studentId, faculty: req.user.id, marks, createdBy: req.user.id, lastUpdatedBy: req.user.id });
    }

    await markEntry.save();

    await createNotification({
        recipient: studentId,
        sender: req.user.id,
        type: 'assignment_submission',
        title: 'Assignment Graded',
        message: `Faculty has graded your submission for "${assignment.title}".`,
        link: '/student/marks'
    });

    res.json({ message: 'Marks submitted successfully' });
}));

/**
 * @swagger
 * /faculty/assignments:
 *   post:
 *     summary: Create a new faculty assignment
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Assignment created
 */
router.post('/assignments', protect, isFaculty, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    const { title, description, startDate, deadline, totalMarks, targetStudents } = req.body;
    let students = [];
    if (targetStudents) {
        students = Array.isArray(targetStudents) ? targetStudents : [targetStudents];
    } else {
        const assigned = await User.find({ assignedFaculty: req.user.id, role: 'student' }, '_id');
        students = assigned.map(s => s._id);
    }

    const assignment = new Assignment({
        title, description, startDate, deadline, totalMarks: totalMarks || 10,
        targetStudents: students, fileUrl: req.file ? req.file.path : null,
        createdBy: req.user.id, courseTitle: 'Weekly Report'
    });

    await assignment.save();

    for (const studentId of students) {
        await createNotification({ recipient: studentId, sender: req.user.id, type: 'assignment_submission', title: 'New Weekly Assignment', message: `Faculty Supervisor ${req.user.name} posted: "${title}".`, link: '/student/assignments' });
    }

    res.status(201).json(assignment);
}));

/**
 * @swagger
 * /faculty/assignments:
 *   get:
 *     summary: List all assignments created by faculty
 *     tags: [Faculty]
 *     responses:
 *       200:
 *         description: List of assignments
 */
router.get('/assignments', protect, isFaculty, asyncHandler(async (req, res) => {
    const assignments = await Assignment.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(assignments);
}));

/**
 * @swagger
 * /faculty/assignment-submissions/{assignmentId}:
 *   get:
 *     summary: Detailed submission tracking for an assignment
 *     tags: [Faculty]
 *     responses:
 *       200:
 *         description: Status report of all assigned students
 */
router.get('/assignment-submissions/:assignmentId', protect, isFaculty, asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const students = await User.find({ assignedFaculty: req.user.id, status: 'Assigned' });
    const studentIds = students.map(s => s._id);
    const submissions = await Submission.find({ assignment: assignmentId, student: { $in: studentIds } }).populate('student', 'name reg');

    const result = students.map(student => {
        const sub = submissions.find(s => s.student._id.toString() === student._id.toString());
        return {
            reg: student.reg,
            name: student.name,
            submittedAt: sub ? sub.submissionDate : null,
            status: sub ? 'Submitted' : 'Pending',
            fileUrl: sub ? sub.fileUrl : null,
            submissionId: sub ? sub._id : null
        };
    });

    res.json(result);
}));

/**
 * @swagger
 * /faculty/bulk-download-submissions:
 *   post:
 *     summary: Zip archive and download selected submissions
 *     tags: [Faculty]
 *     responses:
 *       200:
 *         description: ZIP file stream
 */
router.post('/bulk-download-submissions', protect, isFaculty, asyncHandler(async (req, res) => {
    const { submissionIds } = req.body;
    if (!submissionIds?.length) return res.status(400).json({ message: 'No submissions selected' });

    const submissions = await Submission.find({ _id: { $in: submissionIds } }).populate('student', 'name reg');
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment(`submissions-${Date.now()}.zip`);
    archive.pipe(res);

    for (const sub of submissions) {
        if (sub.fileUrl) {
            try {
                const response = await new Promise((resolve) => https.get(sub.fileUrl, resolve));
                const extension = path.extname(new URL(sub.fileUrl).pathname) || '.pdf';
                archive.append(response, { name: `${sub.student.reg}-${sub.student.name.replace(/\s+/g, '_')}${extension}` });
            } catch (err) {}
        }
    }
    await archive.finalize();
}));

/**
 * @swagger
 * /faculty/update-assignment/{id}:
 *   put:
 *     summary: Update assignment details
 *     tags: [Faculty]
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/update-assignment/:id', protect, isFaculty, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const { title, description, startDate, deadline } = req.body;
    assignment.title = title || assignment.title;
    assignment.description = description !== undefined ? description : assignment.description;
    assignment.startDate = startDate || assignment.startDate;
    assignment.deadline = deadline || assignment.deadline;
    if (req.file) assignment.fileUrl = req.file.path;

    await assignment.save();
    res.json({ message: 'Assignment updated successfully', assignment });
}));

/**
 * @swagger
 * /faculty/delete-assignment/{id}:
 *   delete:
 *     summary: Delete assignment and purge associated grading records
 *     tags: [Faculty]
 *     responses:
 *       200:
 *         description: Purged
 */
router.delete('/delete-assignment/:id', protect, isFaculty, asyncHandler(async (req, res) => {
    const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    await Promise.all([
        Assignment.deleteOne({ _id: req.params.id }),
        Submission.deleteMany({ assignment: req.params.id }),
        Mark.deleteMany({ assignment: req.params.id })
    ]);

    res.json({ message: 'Assignment purged successfully.' });
}));

/**
 * @swagger
 * /faculty/my-students:
 *   get:
 *     summary: Overview of assigned students and placement status
 *     tags: [Faculty]
 */
router.get('/my-students', protect, isFaculty, asyncHandler(async (req, res) => {
    const students = await User.find({ assignedFaculty: req.user.id, role: 'student' });
    res.json(students.map(s => ({
        id: s._id, name: s.name, reg: s.reg, status: s.status,
        isFreelance: s.internshipRequest?.mode === 'Freelance',
        company: s.internshipRequest?.mode === 'Freelance' ? `Freelancing (${s.internshipRequest.freelancePlatform || 'N/A'})` : (s.assignedCompany || s.internshipAgreement?.companyName || 'Not Assigned')
    })));
}));

/**
 * @swagger
 * /faculty/student-profile/{id}:
 *   get:
 *     summary: Detailed student dossier for faculty audit
 *     tags: [Faculty]
 */
router.get('/student-profile/:id', protect, isStaff, asyncHandler(async (req, res) => {
    const { role, id: userId, email } = req.user;
    const isOffice = role === 'internship_office' || role === 'hod';
    
    let query = { _id: req.params.id };
    
    if (!isOffice) {
        if (role === 'faculty_supervisor') {
            query.assignedFaculty = userId;
        } else if (role === 'site_supervisor') {
            const mail = email.toLowerCase().trim();
            const nameRegex = new RegExp(req.user.name.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
            query.$or = [
                { assignedSiteSupervisor: userId },
                { assignedCompanySupervisorEmail: mail },
                { 'internshipRequest.siteSupervisorEmail': mail },
                { 'internshipAgreement.companySupervisorEmail': mail },
                { assignedCompanySupervisor: { $regex: nameRegex } }
            ];
        }
    }
    
    const student = await User.findOne(query).select('-password');
    if (!student) return res.status(404).json({ message: 'Access denied or Student not found.' });
    res.json(student);
}));

/**
 * @swagger
 * /faculty/weekly-evaluations/{studentId}:
 *   get:
 *     summary: Fetch performance history for weekly reports
 *     tags: [Faculty]
 */
router.get('/weekly-evaluations/:studentId', protect, isFaculty, asyncHandler(async (req, res) => {
    const [marks, submissions] = await Promise.all([
        Mark.find({ student: req.params.studentId }).populate('assignment', 'title totalMarks deadline fileUrl'),
        Submission.find({ student: req.params.studentId }).select('assignment fileUrl fileName')
    ]);

    const result = marks.filter(m => m.assignment).map(m => ({
        ...m.toObject(),
        submission: submissions.find(s => s.assignment.toString() === m.assignment._id.toString()) || null
    }));
    res.json(result);
}));

/**
 * @swagger
 * /faculty/weekly-evaluations/{studentId}:
 *   post:
 *     summary: Update marks for multiple weekly tasks
 *     tags: [Faculty]
 */
router.post('/weekly-evaluations/:studentId', protect, isFaculty, asyncHandler(async (req, res) => {
    const { grades } = req.body;
    for (const g of grades) {
        if (!g.markId || g.facultyMarks == null) continue;
        const mark = await Mark.findById(g.markId);
        if (mark && mark.student.toString() === req.params.studentId) {
            mark.facultyMarks = Number(g.facultyMarks);
            mark.isFacultyGraded = true;
            mark.facultyId = req.user.id;
            mark.history.push({ marks: Number(g.facultyMarks), role: 'faculty_supervisor', updatedBy: req.user.id, updatedAt: new Date() });
            await mark.save();
        }
    }
    res.json({ message: 'Grades updated.' });
}));

// Helper for Grade calculation
const getGrade = (pct) => {
    if (pct >= 85) return { grade: 'A', status: 'Qualified' };
    if (pct >= 80) return { grade: 'A-', status: 'Qualified' };
    if (pct >= 75) return { grade: 'B+', status: 'Qualified' };
    if (pct >= 71) return { grade: 'B', status: 'Qualified' };
    if (pct >= 68) return { grade: 'B-', status: 'Qualified' };
    if (pct >= 64) return { grade: 'C+', status: 'Qualified' };
    if (pct >= 61) return { grade: 'C', status: 'Qualified' };
    if (pct >= 58) return { grade: 'C-', status: 'Qualified' };
    if (pct >= 54) return { grade: 'D+', status: 'Qualified' };
    if (pct >= 50) return { grade: 'D', status: 'Qualified' };
    return { grade: 'F', status: 'Failed' };
};

/**
 * @swagger
 * /faculty/report-data/{type}:
 *   get:
 *     summary: Fetch backend data for frontend PDF generation
 *     tags: [Faculty]
 */
router.get('/report-data/:type', protect, isFaculty, asyncHandler(async (req, res) => {
    const type = req.params.type;
    const students = await User.find({ assignedFaculty: req.user.id, role: 'student', status: { $in: ['Assigned', 'Agreement Approved', 'Internship Approved', 'Pass', 'Fail'] } });

    let payload = { supervisorName: req.user.name, reportTitle: '', tableHeader: [], tableData: [], columnsLayout: [] };

    if (type === 'student-list') {
        payload.reportTitle = 'Student Placement Report';
        payload.tableHeader = ['Reg #', 'Name', 'Company', 'Mode', 'Status'];
        payload.columnsLayout = [100, '*', '*', 60, 70];
        payload.tableData = students.map(s => [s.reg, s.name, s.assignedCompany || 'Freelance', s.internshipRequest?.mode || 'N/A', s.status]);
    } else if (type === 'evaluation') {
        payload.reportTitle = 'Student Performance Report';
        payload.tableHeader = ['Reg #', 'Name', 'Avg', '%', 'Grade', 'Status'];
        payload.columnsLayout = [100, '*', 50, 50, 40, 60];
        for (const s of students) {
            const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
            if (!marks.length) { payload.tableData.push([s.reg, s.name, '0.0', '0%', 'F', 'Pending']); continue; }
            const avg = marks.reduce((acc, m) => acc + (m.facultyMarks || 0), 0) / marks.length;
            const pct = Math.round((avg / 10) * 100);
            const { grade, status } = getGrade(pct);
            payload.tableData.push([s.reg, s.name, avg.toFixed(1), `${pct}%`, grade, status]);
        }
    }
    res.json(payload);
}));

/**
 * @swagger
 * /faculty/mark-sheet/bulk:
 *   get:
 *     summary: Export bulk performance spreadsheet
 *     tags: [Faculty]
 */
router.get('/mark-sheet/bulk', protect, isStaff, asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.role === 'faculty_supervisor') query = { assignedFaculty: req.user.id };
    else if (req.user.role === 'site_supervisor') query = { assignedSiteSupervisor: req.user.id };
    else query = { role: 'student' };

    const students = await User.find(query).populate('assignedFaculty assignedSiteSupervisor').select('-password');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Master Ledger');
    
    worksheet.columns = [
        { header: 'Registration #', key: 'reg', width: 22 },
        { header: 'Full Name', key: 'name', width: 30 },
        { header: 'Affiliated Company', key: 'company', width: 30 },
        { header: 'Site Supervisor Assigned', key: 'site_sup', width: 30 },
        { header: 'Faculty Assigned', key: 'faculty', width: 30 },
        { header: 'Tasks Completed', key: 'tasks', width: 15 },
        { header: 'Total Score', key: 'score', width: 15 },
        { header: 'Grade Acquired', key: 'grade', width: 18 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    for (const s of students) {
        const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
        let grade = 'N/A';
        let totalScore = '0%';
        if (marks.length > 0) {
            const free = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
            const pct = Math.round((marks.reduce((acc, m) => acc + (free ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2), 0) / marks.length / 10) * 100);
            totalScore = `${pct}%`;
            if (pct >= 90) grade = 'A+ (Exceptional)';
            else if (pct >= 80) grade = 'A (Excellent)';
            else if (pct >= 70) grade = 'B+ (Good)';
            else if (pct >= 60) grade = 'B (Satisfactory)';
            else if (pct >= 50) grade = 'C (Pass)';
            else grade = 'F (Fail)';
        }
        worksheet.addRow({
            reg: s.reg,
            name: s.name,
            company: s.assignedCompany || 'N/A',
            site_sup: s.assignedSiteSupervisor?.name || s.assignedCompanySupervisor || 'N/A',
            faculty: s.assignedFaculty?.name || 'N/A',
            tasks: marks.length,
            score: totalScore,
            grade
        });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Institution_Master_Ledger.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
}));

/**
 * @swagger
 * /faculty/generate-marksheet/{studentId}:
 *   get:
 *     summary: Export individual marksheet as Excel
 *     tags: [Faculty]
 */
router.get('/mark-sheet/:studentId', protect, isStaff, asyncHandler(async (req, res) => {
    const s = await User.findById(req.params.studentId).populate('assignedFaculty assignedSiteSupervisor');
    if (!s) return res.status(404).json({ message: 'Student not found.' });

    const marks = await Mark.find({ student: req.params.studentId }).populate('assignment');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Record');
    
    worksheet.columns = [
        { header: 'Registration #', key: 'reg', width: 22 },
        { header: 'Full Name', key: 'name', width: 30 },
        { header: 'Affiliated Company', key: 'company', width: 30 },
        { header: 'Site Supervisor Assigned', key: 'site_sup', width: 30 },
        { header: 'Faculty Assigned', key: 'faculty', width: 30 },
        { header: 'Tasks Completed', key: 'tasks', width: 15 },
        { header: 'Total Score', key: 'score', width: 15 },
        { header: 'Grade Acquired', key: 'grade', width: 18 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    let grade = 'N/A';
    let totalScore = '0%';
    const gradedMarks = marks.filter(m => m.isFacultyGraded);
    if (gradedMarks.length > 0) {
        const free = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
        const pct = Math.round((gradedMarks.reduce((acc, m) => acc + (free ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2), 0) / gradedMarks.length / 10) * 100);
        totalScore = `${pct}%`;
        if (pct >= 90) grade = 'A+ (Exceptional)';
        else if (pct >= 80) grade = 'A (Excellent)';
        else if (pct >= 70) grade = 'B+ (Good)';
        else if (pct >= 60) grade = 'B (Satisfactory)';
        else if (pct >= 50) grade = 'C (Pass)';
        else grade = 'F (Fail)';
    }

    worksheet.addRow({
        reg: s.reg,
        name: s.name,
        company: s.assignedCompany || 'N/A',
        site_sup: s.assignedSiteSupervisor?.name || s.assignedCompanySupervisor || 'N/A',
        faculty: s.assignedFaculty?.name || 'N/A',
        tasks: gradedMarks.length,
        score: totalScore,
        grade
    });

    worksheet.addRow({});
    worksheet.addRow({ reg: '— TASK BREAKDOWN —' }).font = { bold: true, italic: true };
    worksheet.addRow({});

    const taskSheetHeader = worksheet.addRow({ reg: 'Task Name', name: 'Status', company: 'Site Sup Score', site_sup: 'Faculty Score', faculty: 'Total Score' });
    taskSheetHeader.font = { bold: true };
    taskSheetHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    marks.forEach(m => {
        if (!m.assignment) return;
        worksheet.addRow({ 
            reg: m.assignment.title, 
            name: m.isFacultyGraded ? 'Graded' : 'Pending', 
            company: m.siteSupervisorMarks || 'N/A',
            site_sup: m.facultyMarks || 'N/A',
            faculty: (((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2).toFixed(1) 
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${s.reg}_Record.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
}));

export default router;
