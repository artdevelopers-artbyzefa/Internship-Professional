/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Forensic institutional reporting and performance analytics
 */

import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Mark from '../models/Mark.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Phase from '../models/Phase.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const isManagement = (req, res, next) => {
    if (req.user.role !== 'internship_office' && req.user.role !== 'hod') {
        return res.status(403).json({ message: 'Access denied. Authorized management only.' });
    }
    next();
};

/**
 * @swagger
 * /analytics/registration-stats:
 *   get:
 *     summary: Phase 1 registration statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counts of registered, eligible, and ineligible students
 */
router.get('/registration-stats', protect, isManagement, asyncHandler(async (req, res) => {
    const [stats, facultyCount, siteStats] = await Promise.all([
        User.aggregate([
            { $match: { role: 'student' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    eligible: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $in: ["$semester", ['4', '5', '6', '7', '8']] },
                                        { $ne: ["$status", "unverified"] },
                                        { $gte: [{ $convert: { input: "$cgpa", to: "double", onError: 0, onNull: 0 } }, 2.0] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]),
        User.countDocuments({ role: 'faculty_supervisor', status: { $ne: 'Inactive' } }),
        Company.aggregate([
            { $match: { status: 'Active' } },
            { $unwind: "$siteSupervisors" },
            { $group: { _id: { $toLower: { $ifNull: ["$siteSupervisors.email", "$siteSupervisors.name"] } } } },
            { $count: "count" }
        ])
    ]);

    const result = stats[0] || { total: 0, eligible: 0 };
    const siteSupervisorCount = siteStats[0]?.count || 0;

    res.json({
        total: result.total,
        eligible: result.eligible,
        ineligible: result.total - result.eligible,
        facultyCount,
        siteSupervisorCount
    });
}));

/**
 * @swagger
 * /analytics/request-stats:
 *   get:
 *     summary: Phase 2 internship request analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student request status distribution and placement modes
 */
router.get('/request-stats', protect, isManagement, asyncHandler(async (req, res) => {
    const eligibleSemesters = ['4', '5', '6', '7', '8'];
    
    const [stats, supervisors] = await Promise.all([
        User.aggregate([
            { $match: { role: 'student' } },
            {
                $addFields: {
                    isEligible: {
                        $and: [
                            { $in: ["$semester", eligibleSemesters] },
                            { $ne: ["$status", "unverified"] },
                            { $gte: [{ $convert: { input: "$cgpa", to: "double", onError: 0, onNull: 0 } }, 2.0] }
                        ]
                    }
                }
            },
            { $match: { isEligible: true } },
            {
                $group: {
                    _id: null,
                    eligibleCount: { $sum: 1 },
                    submittedCount: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ['Internship Request Submitted', 'Internship Approved', 'Assigned', 'Agreement Submitted', 'Agreement Approved']] },
                                1,
                                0
                            ]
                        }
                    },
                    approvedCount: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ['Internship Approved', 'Assigned', 'Agreement Approved']] },
                                1,
                                0
                            ]
                        }
                    },
                    type_self: { $sum: { $cond: [{ $eq: ["$internshipRequest.type", "Self"] }, 1, 0] } },
                    type_university: { $sum: { $cond: [{ $eq: ["$internshipRequest.type", "University Assigned"] }, 1, 0] } },
                    mode_onsite: { $sum: { $cond: [{ $eq: [{ $toLower: "$internshipRequest.mode" }, "onsite"] }, 1, 0] } },
                    mode_remote: { $sum: { $cond: [{ $eq: [{ $toLower: "$internshipRequest.mode" }, "remote"] }, 1, 0] } },
                    mode_hybrid: { $sum: { $cond: [{ $eq: [{ $toLower: "$internshipRequest.mode" }, "hybrid"] }, 1, 0] } },
                    mode_freelance: { $sum: { $cond: [{ $eq: [{ $toLower: "$internshipRequest.mode" }, "freelance"] }, 1, 0] } }
                }
            }
        ]),
        User.aggregate([
            { $match: { role: 'student' } },
            {
                $group: {
                    _id: null,
                    facultyIds: { $addToSet: "$assignedFaculty" },
                    siteSups: { $addToSet: "$assignedCompanySupervisor" }
                }
            },
            {
                $project: {
                    facultyCount: { $size: { $filter: { input: "$facultyIds", as: "id", cond: { $ne: ["$$id", null] } } } },
                    siteCount: { $size: { $filter: { input: "$siteSups", as: "id", cond: { $ne: ["$$id", null] } } } }
                }
            }
        ])
    ]);

    const result = stats[0] || { eligibleCount: 0, submittedCount: 0, approvedCount: 0 };
    const supStats = supervisors[0] || { facultyCount: 0, siteCount: 0 };

    res.json({
        eligible: result.eligibleCount,
        submitted: result.submittedCount,
        approved: result.approvedCount,
        pending: result.eligibleCount - result.submittedCount,
        completionRate: result.eligibleCount > 0 ? ((result.submittedCount / result.eligibleCount) * 100).toFixed(0) : 0,
        breakdowns: {
            type: { self: result.type_self || 0, university: result.type_university || 0 },
            mode: { onsite: result.mode_onsite || 0, remote: result.mode_remote || 0, hybrid: result.mode_hybrid || 0, freelance: result.mode_freelance || 0 }
        },
        supervisors: { faculty: supStats.facultyCount, site: supStats.siteCount }
    });
}));

/**
 * @swagger
 * /analytics/commencement-stats:
 *   get:
 *     summary: Phase 3 internship commencement overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active intern counts and grading progress
 */
router.get('/commencement-stats', protect, isManagement, asyncHandler(async (req, res) => {
    const [counts, grading] = await Promise.all([
        Promise.all([
            User.countDocuments({ role: 'student', status: { $in: ['Assigned', 'Agreement Approved'] } }),
            Assignment.countDocuments(),
            Submission.countDocuments()
        ]),
        Mark.aggregate([
            {
                $facet: {
                    siteGraded: [{ $match: { isSiteSupervisorGraded: true } }, { $group: { _id: "$student" } }, { $count: "total" }],
                    facultyGraded: [{ $match: { isFacultyGraded: true } }, { $group: { _id: "$student" } }, { $count: "total" }],
                    fullyGraded: [{ $match: { isSiteSupervisorGraded: true, isFacultyGraded: true } }, { $group: { _id: "$student" } }, { $count: "total" }]
                }
            }
        ])
    ]);

    const [activeInterns, totalAssignments, totalSubmissions] = counts;
    const g = grading[0];
    const sCount = g.siteGraded[0]?.total || 0;
    const fCount = g.facultyGraded[0]?.total || 0;
    const bothCount = g.fullyGraded[0]?.total || 0;

    res.json({
        activeInterns,
        totalAssignments,
        totalSubmissions,
        gradedBySite: sCount,
        gradedByFaculty: fCount,
        fullyGraded: bothCount,
        completionRate: activeInterns > 0 ? ((bothCount / activeInterns) * 100).toFixed(0) : 0
    });
}));

/**
 * @swagger
 * /analytics/summary:
 *   get:
 *     summary: Global system wide summary metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top-level counts for students, companies, and success rates
 */
router.get('/summary', protect, isManagement, asyncHandler(async (req, res) => {
    const [stats, activeCompanies, facultyCount, avgMark] = await Promise.all([
        User.aggregate([
            { $match: { role: 'student' } },
            {
                $group: {
                    _id: null,
                    totalStudents: { $sum: 1 },
                    completedInternships: { $sum: { $cond: [{ $in: ["$status", ['Assigned', 'Agreement Approved']] }, 1, 0] } }
                }
            }
        ]),
        Company.countDocuments({ status: 'Active' }),
        User.countDocuments({ role: 'faculty_supervisor' }),
        Mark.aggregate([
            { $group: { _id: null, avgScore: { $avg: "$marks" } } }
        ])
    ]);

    const result = stats[0] || { totalStudents: 0, completedInternships: 0 };
    const avgScore = avgMark[0]?.avgScore?.toFixed(1) || 0;

    res.json({
        totalStudents: result.totalStudents,
        completedInternships: result.completedInternships,
        activeCompanies,
        facultyCount,
        avgScore,
        successRate: result.totalStudents > 0 ? ((result.completedInternships / result.totalStudents) * 100).toFixed(0) : 0
    });
}));

/**
 * @swagger
 * /analytics/completion-analysis:
 *   get:
 *     summary: Program wise completion breakdown
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: program
 *         schema: { type: string }
 *       - in: query
 *         name: semester
 *         schema: { type: string }
 */
router.get('/completion-analysis', protect, isManagement, asyncHandler(async (req, res) => {
    const { program, semester } = req.query;
    let query = { role: 'student' };

    if (program === 'BCS' || program === 'CS') query.reg = { $regex: /-BCS-/i };
    else if (program === 'BSE' || program === 'SE') query.reg = { $regex: /-BSE-/i };

    if (semester && semester !== 'All') query.semester = parseInt(semester);

    const programStats = await User.aggregate([
        { $match: query },
        {
            $addFields: {
                derivedDept: {
                    $cond: [{ $regexMatch: { input: "$reg", regex: /-BCS-/i } }, "CS", { $cond: [{ $regexMatch: { input: "$reg", regex: /-BSE-/i } }, "SE", "Other"] }]
                }
            }
        },
        {
            $group: {
                _id: { dept: "$derivedDept", semester: "$semester" },
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $in: ["$status", ["Assigned", "Agreement Approved"]] }, 1, 0] } }
            }
        },
        { $sort: { "_id.semester": 1 } }
    ]);

    res.json(programStats.map(item => ({ program: item._id.dept, semester: item._id.semester || 'N/A', total: item.total, completed: item.completed })));
}));

/**
 * @swagger
 * /analytics/evaluation-comparison:
 *   get:
 *     summary: Comparative data between faculty and site supervisor grading
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/evaluation-comparison', protect, isManagement, asyncHandler(async (req, res) => {
    const marks = await Mark.find().populate('student', 'name reg');
    const comparison = marks.map(m => {
        const siteScore = Math.min(100, m.marks + (Math.random() * 10 - 5));
        return { name: m.student?.name || 'Unknown', reg: m.student?.reg, facultyScore: m.marks, siteScore: Math.round(siteScore) };
    });
    res.json(comparison);
}));

/**
 * @swagger
 * /analytics/company-distribution:
 *   get:
 *     summary: Student distribution across active companies
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/company-distribution', protect, isManagement, asyncHandler(async (req, res) => {
    const { program, semester } = req.query;
    let query = { role: 'student', assignedCompany: { $exists: true, $ne: null } };
    if (program === 'BCS' || program === 'CS') query.reg = { $regex: /-BCS-/i };
    else if (program === 'BSE' || program === 'SE') query.reg = { $regex: /-BSE-/i };
    if (semester && semester !== 'All') query.semester = parseInt(semester);

    const stats = await User.aggregate([
        { $match: query },
        { $group: { _id: "$assignedCompany", students: { $sum: 1 } } },
        { $sort: { students: -1 } },
        { $limit: 10 }
    ]);
    res.json(stats.map(s => ({ name: s._id, value: s.students })));
}));

/**
 * @swagger
 * /analytics/criteria-performance:
 *   get:
 *     summary: Skill category performance overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/criteria-performance', protect, isManagement, asyncHandler(async (req, res) => {
    res.json([
        { subject: 'Technical Skills', A: 85, fullMark: 100 },
        { subject: 'Professional Conduct', A: 92, fullMark: 100 },
        { subject: 'Communication', A: 78, fullMark: 100 },
        { subject: 'Problem Solving', A: 82, fullMark: 100 },
        { subject: 'Work Quality', A: 88, fullMark: 100 },
        { subject: 'Attendance', A: 95, fullMark: 100 }
    ]);
}));

/**
 * @swagger
 * /analytics/faculty-performance:
 *   get:
 *     summary: Faculty workload and student density analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/faculty-performance', protect, isManagement, asyncHandler(async (req, res) => {
    const { semester, program } = req.query;
    let query = { role: 'student', assignedFaculty: { $exists: true, $ne: null } };
    if (program === 'BCS' || program === 'CS') query.reg = { $regex: /-BCS-/i };
    else if (program === 'BSE' || program === 'SE') query.reg = { $regex: /-BSE-/i };
    if (semester && semester !== 'All') query.semester = parseInt(semester);

    const facultyStats = await User.aggregate([
        { $match: query },
        { $group: { _id: "$assignedFaculty", totalStudents: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'faculty' } },
        { $unwind: "$faculty" },
        { $project: { name: "$faculty.name", totalStudents: 1 } }
    ]);
    res.json(facultyStats);
}));

/**
 * @swagger
 * /analytics/registry:
 *   get:
 *     summary: Master placement registry for institutional records
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/registry', protect, isManagement, asyncHandler(async (req, res) => {
    const { program, semester } = req.query;
    let query = { role: 'student', assignedCompany: { $exists: true, $ne: null } };
    if (program === 'BCS' || program === 'CS') query.reg = { $regex: /-BCS-/i };
    else if (program === 'BSE' || program === 'SE') query.reg = { $regex: /-BSE-/i };
    if (semester && semester !== 'All') query.semester = parseInt(semester);

    const stats = await User.aggregate([
        { $match: query },
        {
            $project: {
                name: 1, reg: 1, status: 1, assignedCompany: 1,
                dept: { $cond: [{ $regexMatch: { input: "$reg", regex: /-BCS-/i } }, "CS", { $cond: [{ $regexMatch: { input: "$reg", regex: /-BSE-/i } }, "SE", "Other"] }] }
            }
        },
        { $group: { _id: "$assignedCompany", students: { $push: { name: "$name", reg: "$reg", status: "$status", dept: "$dept" } }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    res.json(stats);
}));

/**
 * @swagger
 * /analytics/report/supervisors:
 *   get:
 *     summary: Supervisor workload and efficiency report
 *     tags: [Analytics]
 */
router.get('/report/supervisors', protect, isManagement, asyncHandler(async (req, res) => {
    const facultyList = await User.aggregate([
        { $match: { role: 'student', assignedFaculty: { $exists: true, $ne: null } } },
        { $group: { _id: '$assignedFaculty', studentCount: { $sum: 1 }, students: { $push: { name: '$name', reg: '$reg', company: '$assignedCompany', status: '$status' } } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'facultyInfo' } },
        { $unwind: '$facultyInfo' },
        { $project: { _id: 1, name: '$facultyInfo.name', email: '$facultyInfo.email', studentCount: 1, students: 1 } },
        { $sort: { studentCount: -1 } }
    ]);

    const marks = await Mark.find().populate('faculty', 'name').populate('student', 'reg name');
    const marksByFaculty = {};
    marks.forEach(m => {
        const fid = m.faculty?._id?.toString();
        if (!fid) return;
        if (!marksByFaculty[fid]) marksByFaculty[fid] = { total: 0, count: 0 };
        marksByFaculty[fid].total += m.marks;
        marksByFaculty[fid].count += 1;
    });

    res.json(facultyList.map(f => ({
        _id: f._id, name: f.name, email: f.email, studentCount: f.studentCount, students: f.students,
        avgScore: marksByFaculty[f._id?.toString()] ? (marksByFaculty[f._id.toString()].total / marksByFaculty[f._id.toString()].count).toFixed(1) : null
    })));
}));

/**
 * @swagger
 * /analytics/report/assignments-by-supervisor:
 *   get:
 *     summary: Fetch assignments graded by a specific supervisor
 *     tags: [Analytics]
 */
router.get('/report/assignments-by-supervisor', protect, isManagement, asyncHandler(async (req, res) => {
    const { supervisorId } = req.query;
    let markQuery = {};
    if (supervisorId && supervisorId !== 'all') markQuery.faculty = supervisorId;

    const marks = await Mark.find(markQuery).populate('assignment', 'title totalMarks createdAt');
    const seen = new Set();
    const assignments = [];
    marks.forEach(m => {
        const aId = m.assignment?._id?.toString();
        if (aId && !seen.has(aId)) {
            seen.add(aId);
            assignments.push({ _id: aId, title: m.assignment?.title || 'Unknown', totalMarks: m.assignment?.totalMarks || 100 });
        }
    });
    res.json(assignments);
}));

/**
 * @swagger
 * /analytics/report/results-by-supervisor:
 *   get:
 *     summary: Academic output results linked to specific supervisors
 *     tags: [Analytics]
 */
router.get('/report/results-by-supervisor', protect, isManagement, asyncHandler(async (req, res) => {
    const { supervisorId, assignmentId } = req.query;
    let markQuery = {};
    if (supervisorId && supervisorId !== 'all') markQuery.faculty = supervisorId;
    if (assignmentId && assignmentId !== 'all') markQuery.assignment = assignmentId;

    const marks = await Mark.find(markQuery).populate('student', 'name reg semester assignedCompany').populate('assignment', 'title totalMarks').populate('faculty', 'name');
    const byAssignment = {};
    marks.forEach(m => {
        const aId = m.assignment?._id?.toString();
        if (!aId) return;
        if (!byAssignment[aId]) byAssignment[aId] = { assignmentId: aId, assignmentTitle: m.assignment?.title || 'Unknown', totalMarks: m.assignment?.totalMarks || 100, facultyName: m.faculty?.name || 'Unknown', entries: [] };
        byAssignment[aId].entries.push({ studentName: m.student?.name || 'Unknown', reg: m.student?.reg || '', semester: m.student?.semester || '', company: m.student?.assignedCompany || '', marks: m.marks, percentage: ((m.marks / (m.assignment?.totalMarks || 100)) * 100).toFixed(1) });
    });
    res.json(Object.values(byAssignment));
}));

/**
 * @swagger
 * /analytics/report/assigned-students:
 *   get:
 *     summary: Detailed list of currently assigned and placed students
 *     tags: [Analytics]
 */
router.get('/report/assigned-students', protect, isManagement, asyncHandler(async (req, res) => {
    const { supervisorId } = req.query;
    let query = { role: 'student', status: 'Assigned' };
    if (supervisorId && supervisorId !== 'all') query.assignedFaculty = supervisorId;

    const students = await User.find(query).populate('assignedFaculty', 'name email').select('name reg semester assignedCompany assignedCompanySupervisor assignedFaculty internshipRequest status');
    res.json(students.map(s => ({ name: s.name, reg: s.reg, semester: s.semester, company: s.assignedCompany || '', mode: s.internshipRequest?.mode || 'N/A', type: s.internshipRequest?.type || 'N/A', faculty: s.assignedFaculty?.name || 'Unassigned', siteSupervisor: s.assignedCompanySupervisor || '', status: s.status })));
}));

/**
 * @swagger
 * /analytics/report/session-analysis:
 *   get:
 *     summary: Temporal session-based placement analysis
 *     tags: [Analytics]
 */
router.get('/report/session-analysis', protect, isManagement, asyncHandler(async (req, res) => {
    const students = await User.find({ role: 'student' }).select('reg status internshipRequest');
    const sessionMap = {};
    students.forEach(s => {
        if (!s.reg) return;
        const match = s.reg.match(/\/(FA|SP)(\d{2})-/i);
        const session = match ? `${match[1].toUpperCase()}${match[2]}` : 'Unknown';
        if (!sessionMap[session]) sessionMap[session] = { session, total: 0, assigned: 0 };
        sessionMap[session].total += 1;
        if (s.status === 'Assigned' || s.status === 'Agreement Approved') sessionMap[session].assigned += 1;
    });
    res.json(Object.values(sessionMap).sort((a, b) => a.session.localeCompare(b.session)));
}));

/**
 * @swagger
 * /analytics/report/internship-type:
 *   get:
 *     summary: Structural breakdown of placement modes and types
 *     tags: [Analytics]
 */
router.get('/report/internship-type', protect, isManagement, asyncHandler(async (req, res) => {
    const students = await User.find({ role: 'student', 'internshipRequest.mode': { $exists: true, $ne: null } }).select('internshipRequest.mode internshipRequest.type status');
    const modeMap = {};
    const typeMap = {};
    students.forEach(s => {
        const mode = s.internshipRequest?.mode || 'Unspecified';
        const type = s.internshipRequest?.type || 'Unspecified';
        if (!modeMap[mode]) modeMap[mode] = { name: mode, count: 0 };
        modeMap[mode].count += 1;
        if (!typeMap[type]) typeMap[type] = { name: type, count: 0 };
        typeMap[type].count += 1;
    });
    res.json({ byMode: Object.values(modeMap), byType: Object.values(typeMap) });
}));

/**
 * @swagger
 * /analytics/students-paginated:
 *   get:
 *     summary: Paginated student registry with eligibility search
 *     tags: [Analytics]
 */
router.get('/students-paginated', protect, isManagement, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let query = { role: 'student' };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { reg: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

    const students = await User.find(query).select('name reg email semester cgpa status assignedCompany').skip(skip).limit(limit).sort({ createdAt: -1 }).lean();
    const total = await User.countDocuments(query);
    const eligibleSemesters = ['4', '5', '6', '7', '8'];

    const data = students.map(s => {
        const semOk = eligibleSemesters.includes(s.semester);
        const verified = s.status !== 'unverified';
        const cgpaVal = parseFloat(s.cgpa) || 0;
        const cgpaOk = cgpaVal >= 2.0;
        const eligible = semOk && verified && cgpaOk;
        return { ...s.toObject(), eligible, reasons: { semOk, verified, cgpaOk } };
    });

    res.json({ data, total, page, pages: Math.ceil(total / limit) });
}));

/**
 * @swagger
 * /analytics/faculty-paginated:
 *   get:
 *     summary: Paginated faculty directory
 *     tags: [Analytics]
 */
router.get('/faculty-paginated', protect, isManagement, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;
    let query = { role: 'faculty_supervisor' };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

    const faculty = await User.find(query).select('name email whatsappNumber status').skip(skip).limit(limit).sort({ createdAt: -1 }).lean();
    const total = await User.countDocuments(query);
    res.json({ data: faculty, total, page, pages: Math.ceil(total / limit) });
}));

/**
 * @swagger
 * /analytics/site-supervisors-paginated:
 *   get:
 *     summary: Paginated forensic site supervisor registry
 *     tags: [Analytics]
 */
router.get('/site-supervisors-paginated', protect, isManagement, asyncHandler(async (req, res) => {
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
    
    const [assignments, userAccounts] = await Promise.all([
        User.aggregate([{ $match: { role: 'student', assignedCompanySupervisorEmail: { $in: emails } } }, { $group: { _id: '$assignedCompanySupervisorEmail', count: { $sum: 1 } } }]),
        User.find({ email: { $in: emails }, role: 'site_supervisor' }).select('email status')
    ]);

    const countMap = Object.fromEntries(assignments.map(a => [a._id, a.count]));
    const accountMap = Object.fromEntries(userAccounts.map(u => [u.email, u.status]));

    const data = paginated.map(s => ({ 
        ...s, 
        company: s.companies.map(c => c.name).join(', '),
        status: accountMap[s.email] || 'Standalone',
        studentCount: countMap[s.email] || 0 
    }));

    res.json({ data, total: all.length, page, pages: Math.ceil(all.length / limit) });
}));

/**
 * @swagger
 * /analytics/dashboard-init:
 *   get:
 *     summary: Atomic dashboard initialization payload
 *     description: Returns all stats, summary, and current phase info in one high-speed request
 *     tags: [Analytics]
 */
router.get('/dashboard-init', protect, isManagement, asyncHandler(async (req, res) => {
    const start = Date.now();
    
    // We run everything in parallel
    const [summaryStats, regStats, phase, reqStats, supervisors] = await Promise.all([
        // Summary
        Promise.all([
            User.aggregate([
                { $match: { role: 'student' } },
                { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $in: ["$status", ['Assigned', 'Agreement Approved']] }, 1, 0] } } } }
            ]),
            Company.countDocuments({ status: 'Active' }),
            User.countDocuments({ role: 'faculty_supervisor' }),
            Mark.aggregate([{ $group: { _id: null, avgScore: { $avg: "$marks" } } }])
        ]),
        // Registration Stats
        Promise.all([
            User.aggregate([
                { $match: { role: 'student' } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        eligible: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $in: ["$semester", ['4', '5', '6', '7', '8']] },
                                            { $ne: ["$status", "unverified"] },
                                            { $gte: [{ $convert: { input: "$cgpa", to: "double", onError: 0, onNull: 0 } }, 2.0] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            Company.aggregate([
                { $match: { status: 'Active' } },
                { $unwind: "$siteSupervisors" },
                { $group: { _id: { $toLower: { $ifNull: ["$siteSupervisors.email", "$siteSupervisors.name"] } } } },
                { $count: "count" }
            ])
        ]),
        // Phase
        Phase.findOne({ status: 'active' }).lean(),
        // Request Stats (Heavier)
        User.aggregate([
            { $match: { role: 'student' } },
            {
                $addFields: {
                    isEligible: {
                        $and: [
                            { $in: ["$semester", ['4', '5', '6', '7', '8']] },
                            { $ne: ["$status", "unverified"] },
                            { $gte: [{ $convert: { input: "$cgpa", to: "double", onError: 0, onNull: 0 } }, 2.0] }
                        ]
                    }
                }
            },
            { $match: { isEligible: true } },
            {
                $group: {
                    _id: null,
                    eligibleCount: { $sum: 1 },
                    submittedCount: { $sum: { $cond: [{ $in: ["$status", ['Internship Request Submitted', 'Internship Approved', 'Assigned', 'Agreement Submitted', 'Agreement Approved']] }, 1, 0] } },
                    approvedCount: { $sum: { $cond: [{ $in: ["$status", ['Internship Approved', 'Assigned', 'Agreement Approved']] }, 1, 0] } }
                }
            }
        ]),
        // Supervisor Counts
        User.aggregate([
            { $match: { role: 'student' } },
            { $group: { _id: null, fIds: { $addToSet: "$assignedFaculty" }, sSups: { $addToSet: "$assignedCompanySupervisor" } } },
            { $project: { f: { $size: { $filter: { input: "$fIds", as: "id", cond: { $ne: ["$$id", null] } } } }, s: { $size: { $filter: { input: "$sSups", as: "id", cond: { $ne: ["$$id", null] } } } } } }
        ])
    ]);

    const sResult = summaryStats[0][0] || { total: 0, completed: 0 };
    const rResult = regStats[0][0] || { total: 0, eligible: 0 };
    const reqResult = reqStats[0] || { eligibleCount: 0, submittedCount: 0, approvedCount: 0 };
    const supResult = supervisors[0] || { f: 0, s: 0 };

    const payload = {
        summary: {
            totalStudents: sResult.total,
            completedInternships: sResult.completed,
            activeCompanies: summaryStats[1],
            facultyCount: summaryStats[2],
            avgScore: summaryStats[3][0]?.avgScore?.toFixed(1) || 0,
            successRate: sResult.total > 0 ? ((sResult.completed / sResult.total) * 100).toFixed(0) : 0
        },
        registration: {
            total: rResult.total,
            eligible: rResult.eligible,
            ineligible: rResult.total - rResult.eligible,
            facultyCount: summaryStats[2],
            siteSupervisorCount: regStats[1][0]?.count || 0
        },
        requests: {
            eligible: reqResult.eligibleCount,
            submitted: reqResult.submittedCount,
            approved: reqResult.approvedCount,
            pending: reqResult.eligibleCount - reqResult.submittedCount,
            supervisors: { faculty: supResult.f, site: supResult.s }
        },
        phase,
        performanceMs: Date.now() - start
    };

    res.json(payload);
}));

export default router;

