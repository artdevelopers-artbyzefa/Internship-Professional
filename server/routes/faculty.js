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

// Role Check Middleware
const isFaculty = (req, res, next) => {
    if (req.user.role !== 'faculty_supervisor') {
        return res.status(403).json({ message: 'Access denied. Faculty only.' });
    }
    next();
};

// @route   GET api/faculty/pending-requests
// @desc    Get student internship requests (both registered selection and email invitations)
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

// @route   GET api/faculty/stats
// @desc    Get dashboard counts
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

// @route   POST api/faculty/handle-request
// @desc    Accept or Reject a student's internship supervision request
router.post('/handle-request', protect, isFaculty, asyncHandler(async (req, res) => {
    const { studentId, action } = req.body;

    if (!['Accepted', 'Rejected'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
    }

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Update the request status
    student.internshipRequest.facultyStatus = action;

    if (action === 'Accepted') {
        // Officially assign this faculty
        student.assignedFaculty = req.user.id;
    }

    await student.save();

    // Notify Student
    await createNotification({
        recipient: studentId,
        sender: req.user.id,
        type: 'internship_request',
        title: `Supervision Request ${action}`,
        message: `Faculty Supervisor ${req.user.name} has ${action.toLowerCase()} your internship supervision request.`,
        link: '/student/dashboard'
    });

    // Audit Log
    await new AuditLog({
        action: `FACULTY_REQUEST_${action.toUpperCase()}`,
        performedBy: req.user.id,
        targetUser: studentId,
        details: `Faculty ${action.toLowerCase()}ed supervision request from ${student.name} (${student.reg})`,
        ipAddress: req.ip
    }).save();

    res.json({ message: `Request ${action.toLowerCase()}ed successfully` });
}));

// @route   GET api/faculty/pending-grading
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

// @route   GET api/faculty/assignments
// @desc    Get assignments with supervisor-specific deadlines
router.get('/assignments', protect, isFaculty, asyncHandler(async (req, res) => {
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

// @route   GET api/faculty/assignment-students/:assignmentId
// @desc    Get students assigned to this faculty and their marks for a specific assignment
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

// @route   POST api/faculty/submit-marks
// @desc    Add or Update marks for a student
router.post('/submit-marks', protect, isFaculty, asyncHandler(async (req, res) => {
    const { assignmentId, studentId, marks } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const override = assignment.overrides.find(o => o.facultyId.toString() === req.user.id);
    const effectiveDeadline = override ? override.deadline : assignment.deadline;

    if (new Date() > new Date(effectiveDeadline)) {
        return res.status(403).json({ message: 'Deadline Passed – Editing Locked' });
    }

    if (marks > 10) {
        return res.status(400).json({ message: `Marks cannot exceed the total marks (10).` });
    }

    let markEntry = await Mark.findOne({ assignment: assignmentId, student: studentId });

    if (markEntry && markEntry.isFacultyGraded) {
        return res.status(403).json({ message: 'Marks already finalized – Editing Locked' });
    }

    const action = markEntry ? 'MARK_UPDATED' : 'MARK_ADDED';

    if (markEntry) {
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

    await createNotification({
        recipient: studentId,
        sender: req.user.id,
        type: 'assignment_submission',
        title: 'Assignment Graded',
        message: `Faculty has graded your submission for "${assignment.title}".`,
        link: '/student/marks'
    });

    await new AuditLog({
        action,
        performedBy: req.user.id,
        targetUser: studentId,
        details: `${action === 'MARK_ADDED' ? 'Added' : 'Updated'} marks (${marks}) for assignment ${assignment.title}`,
        ipAddress: req.ip
    }).save();

    res.json({ message: 'Marks submitted successfully', markEntry });
}));

// @route   POST api/faculty/bulk-submit-marks
// @desc    Add or Update marks for multiple students
router.post('/bulk-submit-marks', protect, isFaculty, asyncHandler(async (req, res) => {
    const { assignmentId, marksData } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const override = assignment.overrides.find(o => o.facultyId.toString() === req.user.id);
    const effectiveDeadline = override ? override.deadline : assignment.deadline;

    if (new Date() > new Date(effectiveDeadline)) {
        return res.status(403).json({ message: 'Deadline Passed – Editing Locked' });
    }

    for (let item of marksData) {
        const { studentId, marks } = item;

        if (marks === null || marks === '' || marks > 10) continue;

        let markEntry = await Mark.findOne({ assignment: assignmentId, student: studentId });
        if (markEntry && markEntry.isFacultyGraded) continue;

        const action = markEntry ? 'MARK_UPDATED' : 'MARK_ADDED';

        if (markEntry) {
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

        await new AuditLog({
            action,
            performedBy: req.user.id,
            targetUser: studentId,
            details: `${action === 'MARK_ADDED' ? 'Added' : 'Updated'} marks (${marks}) for assignment ${assignment.title}`,
            ipAddress: req.ip
        }).save();
    }

    res.json({ message: 'All marks processed successfully' });
}));

// @route   POST api/faculty/create-assignment
// @desc    Create a new assignment by faculty
router.post('/create-assignment', protect, isFaculty, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    const { title, description, startDate, deadline } = req.body;

    const assignment = new Assignment({
        title,
        courseTitle: 'Internship',
        description,
        startDate,
        deadline,
        totalMarks: 10,
        createdBy: req.user.id,
        fileUrl: req.file ? req.file.path : null
    });

    await assignment.save();

    const students = await User.find({ assignedFaculty: req.user.id, role: 'student' }, '_id');
    for (const student of students) {
        await createNotification({
            recipient: student._id,
            sender: req.user.id,
            type: 'assignment_submission',
            title: 'New Assignment Posted',
            message: `Supervisor ${req.user.name} posted a new task: "${title}".`,
            link: '/student/assignments'
        });
    }

    await new AuditLog({
        action: 'FACULTY_ASSIGNMENT_CREATED',
        performedBy: req.user.id,
        details: `Faculty created assignment: ${title}`,
        ipAddress: req.ip
    }).save();

    res.status(201).json({ message: 'Assignment created successfully', assignment });
}));

// @route   GET api/faculty/my-created-assignments
// @desc    Get assignments created by this faculty
router.get('/my-created-assignments', protect, isFaculty, asyncHandler(async (req, res) => {
    const assignments = await Assignment.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(assignments);
}));

// @route   GET api/faculty/assignment-submissions/:assignmentId
// @desc    Get all student submissions for a specific assignment
router.get('/assignment-submissions/:assignmentId', protect, isFaculty, asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;

    const students = await User.find({ assignedFaculty: req.user.id, status: 'Assigned' });
    const studentIds = students.map(s => s._id);

    const submissions = await Submission.find({
        assignment: assignmentId,
        student: { $in: studentIds }
    }).populate('student', 'name reg');

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
}));

// @route   POST api/faculty/bulk-download-submissions
// @desc    Download selected submissions as a ZIP file
router.post('/bulk-download-submissions', protect, isFaculty, asyncHandler(async (req, res) => {
    const { submissionIds } = req.body;
    if (!submissionIds || submissionIds.length === 0) {
        return res.status(400).json({ message: 'No submissions selected' });
    }

    const submissions = await Submission.find({ _id: { $in: submissionIds } }).populate('student', 'name reg');

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment(`submissions-${Date.now()}.zip`);
    archive.pipe(res);

    const fetchFileStream = (url) => {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode === 200) resolve(response);
                else reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
            }).on('error', reject);
        });
    };

    for (const sub of submissions) {
        if (sub.fileUrl) {
            try {
                const fileStream = await fetchFileStream(sub.fileUrl);
                let extension = path.extname(new URL(sub.fileUrl).pathname) || '.pdf';
                const fileName = `${sub.student.reg}-${sub.student.name.replace(/\s+/g, '_')}${extension}`;
                archive.append(fileStream, { name: fileName });
            } catch (err) {
                // Ignore missing files in bulk zip
            }
        }
    }

    await archive.finalize();
}));

// @route   PUT api/faculty/update-assignment/:id
// @desc    Update an existing assignment by faculty
router.put('/update-assignment/:id', protect, isFaculty, uploadCloudinary.single('file'), asyncHandler(async (req, res) => {
    const { title, description, startDate, deadline } = req.body;
    const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.id });

    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    assignment.title = title || assignment.title;
    assignment.description = description !== undefined ? description : assignment.description;
    assignment.startDate = startDate || assignment.startDate;
    assignment.deadline = deadline || assignment.deadline;
    assignment.totalMarks = 10;

    if (req.file) assignment.fileUrl = req.file.path;

    await assignment.save();

    await new AuditLog({
        action: 'FACULTY_ASSIGNMENT_UPDATED',
        performedBy: req.user.id,
        details: `Faculty updated assignment: ${assignment.title}`,
        ipAddress: req.ip
    }).save();

    res.json({ message: 'Assignment updated successfully', assignment });
}));

// @route   DELETE api/faculty/delete-assignment/:id
router.delete('/delete-assignment/:id', protect, isFaculty, asyncHandler(async (req, res) => {
    const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    await Promise.all([
        Assignment.deleteOne({ _id: req.params.id }),
        Submission.deleteMany({ assignment: req.params.id }),
        Mark.deleteMany({ assignment: req.params.id })
    ]);

    await new AuditLog({
        action: 'FACULTY_ASSIGNMENT_PURGED',
        performedBy: req.user.id,
        details: `Permanent Deletion: ${assignment.title} and all associated records purged.`,
        ipAddress: req.ip
    }).save();

    res.json({ message: 'Assignment and all associated records purged successfully.' });
}));

// @route   GET api/faculty/my-students
// @desc    Get all students assigned to this faculty
router.get('/my-students', protect, isFaculty, asyncHandler(async (req, res) => {
    const students = await User.find({
        assignedFaculty: req.user.id,
        role: 'student'
    });

    const result = students.map(s => {
        const isFreelance = s.internshipRequest?.mode === 'Freelance';
        const platform = s.internshipRequest?.freelancePlatform;
        return {
            id: s._id,
            name: s.name,
            reg: s.reg,
            isFreelance,
            company: isFreelance
                ? `Freelancing${platform ? ` (${platform})` : ''}`
                : (s.assignedCompany || s.internshipAgreement?.companyName || 'Not Assigned'),
            status: s.status
        };
    });

    res.json(result);
}));

// @route   GET api/faculty/student-profile/:id
// @desc    Get detailed student profile
router.get('/student-profile/:id', protect, isFaculty, asyncHandler(async (req, res) => {
    const student = await User.findOne({
        _id: req.params.id,
        assignedFaculty: req.user.id
    }).select('-password');

    if (!student) return res.status(404).json({ message: 'Student not found or not assigned to you' });

    res.json(student);
}));

router.get('/weekly-evaluations/:studentId', protect, isFaculty, asyncHandler(async (req, res) => {
    const [marks, submissions] = await Promise.all([
        Mark.find({ student: req.params.studentId }).populate('assignment', 'title totalMarks deadline fileUrl'),
        Submission.find({ student: req.params.studentId }).select('assignment fileUrl fileName')
    ]);

    const consolidated = marks
        .filter(m => m.assignment)
        .map(m => {
            const sub = submissions.find(s => s.assignment.toString() === m.assignment._id.toString());
            return {
                ...m.toObject(),
                submission: sub ? { fileUrl: sub.fileUrl, fileName: sub.fileName } : null
            };
        });

    res.json(consolidated);
}));

// @route   POST api/faculty/weekly-evaluations/:studentId
// @desc    Grade student based on marks
router.post('/weekly-evaluations/:studentId', protect, isFaculty, asyncHandler(async (req, res) => {
    const { grades } = req.body;

    for (const grade of grades) {
        if (!grade.markId || grade.facultyMarks === null || grade.facultyMarks === undefined || grade.facultyMarks === '') continue;

        const mark = await Mark.findById(grade.markId);
        if (mark && mark.student.toString() === req.params.studentId) {
            mark.facultyMarks = Number(grade.facultyMarks);
            mark.isFacultyGraded = true;
            mark.facultyId = req.user.id;
            mark.history.push({
                marks: Number(grade.facultyMarks),
                role: 'faculty_supervisor',
                updatedBy: req.user.id,
                updatedAt: new Date()
            });
            await mark.save();

            await createNotification({
                recipient: req.params.studentId,
                sender: req.user.id,
                type: 'assignment_submission',
                title: 'Weekly Report Evaluated',
                message: `Your weekly progress has been evaluated by ${req.user.name}.`,
                link: '/student/marks'
            });
        }
    }

    res.json({ message: 'Grades updated successfully' });
}));

// ── Grade helper ─────────────────────────────────────────────────────────────
function calcGradeF(pct) {
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
}

// @route   GET api/faculty/report-data/:type
// @desc    Get real data for faculty PDF reports (student-list or evaluation)
router.get('/report-data/:type', protect, isFaculty, asyncHandler(async (req, res) => {
    const type = req.params.type;
    const internStatuses = ['Assigned', 'Agreement Approved', 'Internship Approved', 'Pass', 'Fail'];
    const students = await User.find({
        assignedFaculty: req.user.id,
        role: 'student',
        status: { $in: internStatuses }
    }).select('name reg assignedCompany assignedCompanySupervisor status internshipRequest');

    let payload = {
        supervisorName: req.user.name,
        reportTitle: '',
        tableHeader: [],
        tableData: [],
        columnsLayout: []
    };

    if (type === 'student-list') {
        payload.reportTitle = 'Student Placement Report';
        payload.tableHeader = ['Reg. #', 'Name', 'Company', 'Site Supervisor', 'Mode', 'Status'];
        payload.columnsLayout = [100, '*', '*', '*', 55, 65];
        payload.tableData = students.map(s => [
            s.reg,
            s.name,
            s.assignedCompany || 'N/A',
            s.assignedCompanySupervisor || 'Freelance',
            s.internshipRequest?.mode || 'N/A',
            s.status
        ]);
    } else if (type === 'evaluation') {
        payload.reportTitle = 'Student Evaluation Report';
        payload.tableHeader = ['Reg. #', 'Name', 'Tasks', 'Avg. Score', 'Percentage', 'Grade', 'Status'];
        payload.columnsLayout = [100, '*', 50, 60, 60, 50, 60];

        for (const s of students) {
            const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
            if (marks.length === 0) {
                const isFailed = s.status === 'Fail';
                payload.tableData.push([s.reg, s.name, '0', isFailed ? '0.0' : 'N/A', isFailed ? '0%' : 'N/A', isFailed ? 'F' : 'N/A', isFailed ? 'Failed' : 'Pending']);
                continue;
            }

            const isFreelance = s.internshipRequest?.mode === 'Freelance' || !s.assignedCompanySupervisor;
            const taskScores = marks.map(m => {
                const fScore = m.facultyMarks || 0;
                const sScore = m.siteSupervisorMarks || 0;
                return isFreelance ? fScore : (fScore + sScore) / 2;
            });

            const avg = taskScores.reduce((sum, val) => sum + val, 0) / taskScores.length;
            const pct = Math.round((avg / 10) * 100);
            const { grade, status } = calcGradeF(pct);

            payload.tableData.push([s.reg, s.name, marks.length.toString(), avg.toFixed(1), `${pct}%`, grade, status]);
        }
    } else {
        return res.status(400).json({ message: 'Invalid report type' });
    }

    res.json(payload);
}));

// @route   GET api/faculty/mark-sheet/bulk
router.get('/mark-sheet/bulk', protect, asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.role === 'faculty_supervisor') {
        query = { assignedFaculty: req.user.id };
    } else if (req.user.role === 'site_supervisor') {
        const sup = await SiteSupervisor.findOne({ user: req.user.id });
        if (!sup) return res.status(404).json({ message: 'Supervisor profile not found' });
        query = { assignedSiteSupervisor: sup._id };
    } else if (['internship_office', 'hod'].includes(req.user.role)) {
        query = { role: 'student' }; // Only students
    } else {
        return res.status(403).json({ message: 'Access denied.' });
    }

    const students = await User.find(query).select('_id').lean();
    const studentIds = students.map(s => s._id);

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Internal_Master_MarkSheet.xlsx"`);

    // Use Streaming WorkbookWriter for huge datasets
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: true,
        useSharedStrings: true
    });

    const worksheet = workbook.addWorksheet('Master Ledger');

    worksheet.columns = [
        { header: 'Student Name', key: 'name', width: 25 },
        { header: 'Registration #', key: 'reg', width: 20 },
        { header: 'Task Title', key: 'title', width: 35 },
        { header: 'Site Marks', key: 'site', width: 15 },
        { header: 'Faculty Marks', key: 'faculty', width: 15 },
        { header: 'Combined (/10)', key: 'combined', width: 15 }
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003366' } };
        cell.alignment = { horizontal: 'center' };
    });
    headerRow.commit(); // Commit header row

    // Use a Cursor for memory efficiency
    const markCursor = Mark.find({ student: { $in: studentIds } })
        .populate('assignment', 'title')
        .populate('student', 'name reg internshipRequest assignedCompanySupervisor')
        .lean()
        .cursor();

    for (let m = await markCursor.next(); m != null; m = await markCursor.next()) {
        if (!m.assignment || !m.student) continue;

        const student = m.student;
        const isFreelance = student.internshipRequest?.mode === 'Freelance' || !student.assignedCompanySupervisor;
        const sScore = m.siteSupervisorMarks || 0;
        const fScore = m.facultyMarks || 0;
        const combined = isFreelance ? fScore : (sScore + fScore) / 2;

        const row = worksheet.addRow({
            name: student.name,
            reg: student.reg,
            title: m.assignment.title,
            site: isFreelance ? 'FREELANCE' : sScore,
            faculty: fScore,
            combined: combined.toFixed(1)
        });

        row.eachCell((cell, colNumber) => {
            if (colNumber > 2) cell.alignment = { horizontal: 'center' };
        });
        row.commit(); // Commit row to stream immediately
    }

    await workbook.commit(); // Finalize workbook
    res.end();
}));

// @route   GET api/faculty/mark-sheet/:studentId
router.get('/mark-sheet/:studentId', protect, asyncHandler(async (req, res) => {
    // Roles allowed to download mark sheets
    if (!['faculty_supervisor', 'site_supervisor', 'internship_office', 'hod'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied.' });
    }

    const student = await User.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const marks = await Mark.find({ student: req.params.studentId }).populate('assignment');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mark Sheet');

    // Headers with Styling
    worksheet.columns = [
        { header: 'Task Title', key: 'title', width: 35 },
        { header: 'Site Supervisor Marks', key: 'site', width: 25 },
        { header: 'Faculty Marks', key: 'faculty', width: 25 },
        { header: 'Combined Score (/10)', key: 'combined', width: 25 }
    ];

    // Info rows
    worksheet.spliceRows(1, 0, 
        [`Professional Internship Performance Ledger - ${student.name}`],
        [`Registration Number: ${student.reg}`],
        [`Current Status: ${student.status}`],
        []
    );

    // Styling the header
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: '003366' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Styling table headers (now at row 5)
    worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(5).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
        cell.alignment = { horizontal: 'center' };
    });

    let totalObtained = 0;
    let validCount = 0;

    marks.filter(m => m.assignment).forEach(m => {
        const isFreelance = student.internshipRequest?.mode === 'Freelance' || !student.assignedCompanySupervisor;
        const sScore = m.siteSupervisorMarks || 0;
        const fScore = m.facultyMarks || 0;
        const combined = isFreelance ? fScore : (sScore + fScore) / 2;

        const row = worksheet.addRow({
            title: m.assignment.title,
            site: isFreelance ? 'FREELANCE' : sScore,
            faculty: fScore,
            combined: combined.toFixed(1)
        });

        row.eachCell((cell, colNumber) => {
            if (colNumber > 1) cell.alignment = { horizontal: 'center' };
        });

        totalObtained += combined;
        validCount++;
    });

    worksheet.addRow([]);
    const avg = validCount > 0 ? totalObtained / validCount : 0;
    const pct = Math.round((avg / 10) * 100);

    const summaryRow = worksheet.addRow(['', '', 'Total Ongoing Grade', `${pct}%`]);
    summaryRow.font = { bold: true, size: 12 };
    summaryRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF1DE' } };
    summaryRow.getCell(4).alignment = { horizontal: 'center' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${student.reg}_MarkSheet.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
}));

export default router;
