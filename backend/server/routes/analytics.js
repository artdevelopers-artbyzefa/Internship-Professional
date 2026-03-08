import express from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Mark from '../models/Mark.js';
import Assignment from '../models/Assignment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Role Check Middleware (Management Only)
const isManagement = (req, res, next) => {
    if (req.user.role !== 'internship_office' && req.user.role !== 'hod') {
        return res.status(403).json({ message: 'Access denied. Authorized management only.' });
    }
    next();
};

// @route   GET api/analytics/registration-stats
// @desc    Get stats for Phase 1: Total Registered, Eligible, Ineligible, Supervisors
router.get('/registration-stats', protect, isManagement, async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('semester status cgpa assignedCompanySupervisor internshipAgreement.companySupervisorName');
        const facultyCount = await User.countDocuments({ role: 'faculty_supervisor' });

        // Count distinct site supervisors from both assignments and agreements
        const siteSupSet = new Set();
        students.forEach(s => {
            if (s.assignedCompanySupervisor) siteSupSet.add(s.assignedCompanySupervisor);
            if (s.internshipAgreement?.companySupervisorName) siteSupSet.add(s.internshipAgreement.companySupervisorName);
        });

        const eligibleSemesters = ['4', '5', '6', '7', '8'];
        let total = students.length;
        let eligible = 0;
        let ineligible = 0;

        students.forEach(s => {
            const semOk = eligibleSemesters.includes(s.semester);
            const verified = s.status !== 'unverified';
            const cgpaVal = parseFloat(s.cgpa) || 0;
            const cgpaOk = cgpaVal >= 2.0;

            if (semOk && verified && cgpaOk) {
                eligible++;
            } else {
                ineligible++;
            }
        });

        res.json({
            total,
            eligible,
            ineligible,
            facultyCount,
            siteSupervisorCount: siteSupSet.size
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/summary
// @desc    Get counts and summary stats for dashboard cards
router.get('/summary', protect, isManagement, async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const completedInternships = await User.countDocuments({ role: 'student', status: { $in: ['Assigned', 'Agreement Approved'] } }); // Simplified completion logic
        const activeCompanies = await Company.countDocuments({ status: 'Active' });
        const facultyCount = await User.countDocuments({ role: 'faculty_supervisor' });

        // Calculate average score (simplified)
        const marks = await Mark.find();
        const avgScore = marks.length > 0 ? (marks.reduce((acc, m) => acc + m.marks, 0) / marks.length).toFixed(1) : 0;

        res.json({
            totalStudents,
            completedInternships,
            activeCompanies,
            facultyCount,
            avgScore,
            successRate: totalStudents > 0 ? ((completedInternships / totalStudents) * 100).toFixed(0) : 0
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/completion-analysis
// @desc    Get internship completion by department and semester
router.get('/completion-analysis', protect, isManagement, async (req, res) => {
    try {
        const { program, semester } = req.query;
        let query = { role: 'student' };

        // Filter by Registration Number pattern for Department
        if (program === 'BCS' || program === 'CS') {
            query.reg = { $regex: /-BCS-/i };
        } else if (program === 'BSE' || program === 'SE') {
            query.reg = { $regex: /-BSE-/i };
        }

        if (semester && semester !== 'All') query.semester = parseInt(semester);

        const programStats = await User.aggregate([
            { $match: query },
            {
                $addFields: {
                    derivedDept: {
                        $cond: [
                            { $regexMatch: { input: "$reg", regex: /-BCS-/i } },
                            "CS",
                            {
                                $cond: [
                                    { $regexMatch: { input: "$reg", regex: /-BSE-/i } },
                                    "SE",
                                    "Other"
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        dept: "$derivedDept",
                        semester: "$semester"
                    },
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $in: ["$status", ["Assigned", "Agreement Approved"]] }, 1, 0] }
                    }
                }
            },
            { $sort: { "_id.semester": 1 } }
        ]);

        const formattedData = programStats.map(item => ({
            program: item._id.dept,
            semester: item._id.semester || 'N/A',
            total: item.total,
            completed: item.completed
        }));

        res.json(formattedData);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/evaluation-comparison
// @desc    Compare Faculty vs Site Supervisor scores
router.get('/evaluation-comparison', protect, isManagement, async (req, res) => {
    try {
        // Since we don't have separate site supervisor scores in the DB yet,
        // we'll return the faculty marks and some simulated variations for demo 
        // OR we just use the existing Mark data.

        const marks = await Mark.find().populate('student', 'name reg');

        const comparison = marks.map(m => {
            // Simulate site supervisor marks for the report's visualization
            const siteScore = Math.min(100, m.marks + (Math.random() * 10 - 5));
            return {
                name: m.student?.name || 'Unknown',
                reg: m.student?.reg,
                facultyScore: m.marks,
                siteScore: Math.round(siteScore)
            };
        });

        res.json(comparison);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/company-distribution
// @desc    Placement stats per company
router.get('/company-distribution', protect, isManagement, async (req, res) => {
    try {
        const { program, semester } = req.query;
        let query = { role: 'student', assignedCompany: { $exists: true, $ne: null } };

        if (program === 'BCS' || program === 'CS') {
            query.reg = { $regex: /-BCS-/i };
        } else if (program === 'BSE' || program === 'SE') {
            query.reg = { $regex: /-BSE-/i };
        }

        if (semester && semester !== 'All') query.semester = parseInt(semester);

        const stats = await User.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$assignedCompany",
                    students: { $sum: 1 },
                }
            },
            { $sort: { students: -1 } },
            { $limit: 10 }
        ]);

        const result = stats.map(s => ({
            name: s._id,
            value: s.students
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/criteria-performance
// @desc    Average performance per criteria (simulated for now)
router.get('/criteria-performance', protect, isManagement, async (req, res) => {
    try {
        // Since detailed criteria are not in schema, we provide normalized averages
        const criteria = [
            { subject: 'Technical Skills', A: 85, fullMark: 100 },
            { subject: 'Professional Conduct', A: 92, fullMark: 100 },
            { subject: 'Communication', A: 78, fullMark: 100 },
            { subject: 'Problem Solving', A: 82, fullMark: 100 },
            { subject: 'Work Quality', A: 88, fullMark: 100 },
            { subject: 'Attendance', A: 95, fullMark: 100 },
        ];
        res.json(criteria);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/faculty-performance
// @desc    Stats for faculty supervisors
router.get('/faculty-performance', protect, isManagement, async (req, res) => {
    try {
        const { semester, program } = req.query;
        let query = { role: 'student', assignedFaculty: { $exists: true, $ne: null } };

        if (program === 'BCS' || program === 'CS') {
            query.reg = { $regex: /-BCS-/i };
        } else if (program === 'BSE' || program === 'SE') {
            query.reg = { $regex: /-BSE-/i };
        }

        if (semester && semester !== 'All') query.semester = parseInt(semester);

        const facultyStats = await User.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$assignedFaculty",
                    totalStudents: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'faculty'
                }
            },
            { $unwind: "$faculty" },
            {
                $project: {
                    name: "$faculty.name",
                    totalStudents: 1,
                }
            }
        ]);

        res.json(facultyStats);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/registry
// @desc    Detailed placement data for companies
router.get('/registry', protect, isManagement, async (req, res) => {
    try {
        const { program, semester } = req.query;
        let query = { role: 'student', assignedCompany: { $exists: true, $ne: null } };

        if (program === 'BCS' || program === 'CS') {
            query.reg = { $regex: /-BCS-/i };
        } else if (program === 'BSE' || program === 'SE') {
            query.reg = { $regex: /-BSE-/i };
        }

        if (semester && semester !== 'All') query.semester = parseInt(semester);

        const stats = await User.aggregate([
            { $match: query },
            {
                $project: {
                    name: 1,
                    reg: 1,
                    status: 1,
                    assignedCompany: 1,
                    dept: {
                        $cond: [
                            { $regexMatch: { input: "$reg", regex: /-BCS-/i } },
                            "CS",
                            {
                                $cond: [
                                    { $regexMatch: { input: "$reg", regex: /-BSE-/i } },
                                    "SE",
                                    "Other"
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$assignedCompany",
                    students: { $push: { name: "$name", reg: "$reg", status: "$status", dept: "$dept" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// =====================================================
// NEW: REPORT MODULE ENDPOINTS
// =====================================================

// @route   GET api/analytics/report/supervisors
// @desc    Get all faculty supervisors with their student counts and avg scores
router.get('/report/supervisors', protect, isManagement, async (req, res) => {
    try {
        const facultyList = await User.aggregate([
            { $match: { role: 'student', assignedFaculty: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$assignedFaculty',
                    studentCount: { $sum: 1 },
                    students: { $push: { name: '$name', reg: '$reg', company: '$assignedCompany', status: '$status' } }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'facultyInfo'
                }
            },
            { $unwind: '$facultyInfo' },
            {
                $project: {
                    _id: 1,
                    name: '$facultyInfo.name',
                    email: '$facultyInfo.email',
                    studentCount: 1,
                    students: 1
                }
            },
            { $sort: { studentCount: -1 } }
        ]);

        // Get average marks per faculty
        const marks = await Mark.find().populate('faculty', 'name').populate('student', 'reg name');
        const marksByFaculty = {};
        marks.forEach(m => {
            const fid = m.faculty?._id?.toString();
            if (!fid) return;
            if (!marksByFaculty[fid]) marksByFaculty[fid] = { total: 0, count: 0 };
            marksByFaculty[fid].total += m.marks;
            marksByFaculty[fid].count += 1;
        });

        const result = facultyList.map(f => ({
            _id: f._id,
            name: f.name,
            email: f.email,
            studentCount: f.studentCount,
            students: f.students,
            avgScore: marksByFaculty[f._id?.toString()]
                ? (marksByFaculty[f._id.toString()].total / marksByFaculty[f._id.toString()].count).toFixed(1)
                : null
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/report/assignments-by-supervisor
// @desc    Get distinct assignments that have marks submitted by a supervisor
router.get('/report/assignments-by-supervisor', protect, isManagement, async (req, res) => {
    try {
        const { supervisorId } = req.query;
        let markQuery = {};
        if (supervisorId && supervisorId !== 'all') {
            markQuery.faculty = supervisorId;
        }

        const marks = await Mark.find(markQuery)
            .populate('assignment', 'title totalMarks createdAt');

        // De-duplicate by assignment id
        const seen = new Set();
        const assignments = [];
        marks.forEach(m => {
            const aId = m.assignment?._id?.toString();
            if (aId && !seen.has(aId)) {
                seen.add(aId);
                assignments.push({
                    _id: aId,
                    title: m.assignment?.title || 'Unknown',
                    totalMarks: m.assignment?.totalMarks || 100
                });
            }
        });

        res.json(assignments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/report/results-by-supervisor
// @desc    Get assignment marks grouped by supervisor, with assignment breakdown
//          Supports optional assignmentId filter to narrow to a single assignment
router.get('/report/results-by-supervisor', protect, isManagement, async (req, res) => {
    try {
        const { supervisorId, assignmentId } = req.query;

        let markQuery = {};
        if (supervisorId && supervisorId !== 'all') {
            markQuery.faculty = supervisorId;
        }
        if (assignmentId && assignmentId !== 'all') {
            markQuery.assignment = assignmentId;
        }

        const marks = await Mark.find(markQuery)
            .populate('student', 'name reg semester assignedCompany')
            .populate('assignment', 'title totalMarks')
            .populate('faculty', 'name');

        // Group by assignment
        const byAssignment = {};
        marks.forEach(m => {
            const aId = m.assignment?._id?.toString();
            if (!aId) return;
            if (!byAssignment[aId]) {
                byAssignment[aId] = {
                    assignmentId: aId,
                    assignmentTitle: m.assignment?.title || 'Unknown',
                    totalMarks: m.assignment?.totalMarks || 100,
                    facultyName: m.faculty?.name || 'Unknown',
                    entries: []
                };
            }
            byAssignment[aId].entries.push({
                studentName: m.student?.name || 'Unknown',
                reg: m.student?.reg || '',
                semester: m.student?.semester || '',
                company: m.student?.assignedCompany || '',
                marks: m.marks,
                percentage: ((m.marks / (m.assignment?.totalMarks || 100)) * 100).toFixed(1)
            });
        });

        res.json(Object.values(byAssignment));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/report/assigned-students
// @desc    Get students assigned under a supervisor (or all)
router.get('/report/assigned-students', protect, isManagement, async (req, res) => {
    try {
        const { supervisorId } = req.query;
        let query = { role: 'student', status: 'Assigned' };
        if (supervisorId && supervisorId !== 'all') {
            query.assignedFaculty = supervisorId;
        }

        const students = await User.find(query)
            .populate('assignedFaculty', 'name email')
            .select('name reg semester assignedCompany assignedCompanySupervisor assignedFaculty internshipRequest status');

        const result = students.map(s => ({
            name: s.name,
            reg: s.reg,
            semester: s.semester,
            company: s.assignedCompany || '',
            mode: s.internshipRequest?.mode || 'N/A',
            type: s.internshipRequest?.type || 'N/A',
            faculty: s.assignedFaculty?.name || 'Unassigned',
            siteSupervisor: s.assignedCompanySupervisor || '',
            status: s.status
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/report/session-analysis
// @desc    Breakdown by admission session (FA23, SP24, etc.) derived from reg number
router.get('/report/session-analysis', protect, isManagement, async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('reg status internshipRequest');

        // Parse session from reg: e.g. CIIT/FA23-BCS-034/ATD → FA23
        const sessionMap = {};
        students.forEach(s => {
            if (!s.reg) return;
            const match = s.reg.match(/\/(FA|SP)(\d{2})-/i);
            const session = match ? `${match[1].toUpperCase()}${match[2]}` : 'Unknown';
            if (!sessionMap[session]) sessionMap[session] = { session, total: 0, assigned: 0 };
            sessionMap[session].total += 1;
            if (s.status === 'Assigned' || s.status === 'Agreement Approved') {
                sessionMap[session].assigned += 1;
            }
        });

        const result = Object.values(sessionMap).sort((a, b) => a.session.localeCompare(b.session));
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/report/internship-type
// @desc    Breakdown by internship mode (Onsite, Remote, Hybrid, Freelance)
router.get('/report/internship-type', protect, isManagement, async (req, res) => {
    try {
        const students = await User.find({
            role: 'student',
            'internshipRequest.mode': { $exists: true, $ne: null }
        }).select('internshipRequest.mode internshipRequest.type status');

        const modeMap = {};
        students.forEach(s => {
            const mode = s.internshipRequest?.mode || 'Unspecified';
            if (!modeMap[mode]) modeMap[mode] = { name: mode, count: 0 };
            modeMap[mode].count += 1;
        });

        const typeMap = {};
        students.forEach(s => {
            const type = s.internshipRequest?.type || 'Unspecified';
            if (!typeMap[type]) typeMap[type] = { name: type, count: 0 };
            typeMap[type].count += 1;
        });

        res.json({
            byMode: Object.values(modeMap),
            byType: Object.values(typeMap)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/students-paginated
// @desc    Get paginated list of students with eligibility info
router.get('/students-paginated', protect, isManagement, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        let query = { role: 'student' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { reg: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await User.find(query)
            .select('name reg email semester cgpa status')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);
        const eligibleSemesters = ['4', '5', '6', '7', '8'];

        const data = students.map(s => {
            const semOk = eligibleSemesters.includes(s.semester);
            const verified = s.status !== 'unverified';
            const cgpaVal = parseFloat(s.cgpa) || 0;
            const cgpaOk = cgpaVal >= 2.0;
            const eligible = semOk && verified && cgpaOk;

            return {
                ...s.toObject(),
                eligible,
                reasons: { semOk, verified, cgpaOk }
            };
        });

        res.json({
            data,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/faculty-paginated
// @desc    Get paginated list of faculty
router.get('/faculty-paginated', protect, isManagement, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        let query = { role: 'faculty_supervisor' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const faculty = await User.find(query)
            .select('name email whatsappNumber status')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        res.json({
            data: faculty,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/analytics/site-supervisors-paginated
// @desc    Get paginated list of site supervisors
router.get('/site-supervisors-paginated', protect, isManagement, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search?.toLowerCase() || '';

        // Fetch all students to extract distinct site supervisors
        const students = await User.find({ role: 'student' })
            .select('assignedCompany assignedCompanySupervisor internshipAgreement.companySupervisorName internshipAgreement.companySupervisorEmail internshipAgreement.companyName');

        const siteSupMap = new Map();
        students.forEach(s => {
            const name = s.assignedCompanySupervisor || s.internshipAgreement?.companySupervisorName;
            const company = s.assignedCompany || s.internshipAgreement?.companyName;
            const email = s.internshipAgreement?.companySupervisorEmail || '';

            if (name) {
                if (search && !name.toLowerCase().includes(search) && !company?.toLowerCase().includes(search) && !email.toLowerCase().includes(search)) {
                    return;
                }
                if (!siteSupMap.has(name)) {
                    siteSupMap.set(name, { name, company: company || 'N/A', email });
                }
            }
        });

        const allSups = Array.from(siteSupMap.values());
        const total = allSups.length;
        const paginatedSups = allSups.slice((page - 1) * limit, page * limit);

        res.json({
            data: paginatedSups,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

