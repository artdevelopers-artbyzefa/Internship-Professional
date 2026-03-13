import express from 'express';
import Phase from '../models/Phase.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Mark from '../models/Mark.js';
import Submission from '../models/Submission.js';
import Evaluation from '../models/Evaluation.js';
import Archive from '../models/Archive.js';
import Assignment from '../models/Assignment.js';
import Company from '../models/Company.js';
import Notice from '../models/Notice.js';
import { getPKTTime } from '../utils/time.js';
import { protect } from '../middleware/auth.js';
import { createBulkNotifications, createNotification } from '../utils/notifications.js';

const router = express.Router();

// @route   POST api/phases/:id/start
// @desc    Manually activate a phase (IO override)
router.post('/:id/start', async (req, res) => {
    try {
        const { officeId, scheduledEndAt } = req.body;
        const phase = await Phase.findById(req.params.id);
        if (!phase) return res.status(404).json({ message: 'Phase not found.' });
        if (phase.status === 'active') return res.status(400).json({ message: 'This phase is already active.' });
        if (phase.status === 'completed') return res.status(400).json({ message: 'This phase is already completed.' });

        // Logic for specific phase transitions
        if (phase.order === 4) {
            // PHASE 4: Evaluation & Grading
            // Identify students who didn't participate (0 submissions)
            const students = await User.find({ role: 'student' });
            for (const student of students) {
                const subCount = await Submission.countDocuments({ student: student._id });
                if (subCount === 0) {
                    // Mark as Failed if they were in an active track but did nothing
                    const allowedStatuses = ['Assigned', 'Internship Approved', 'Agreement Approved'];
                    if (allowedStatuses.includes(student.status)) {
                        student.status = 'Fail'; 
                        await student.save();
                        console.log(`[PHASE 4] Student ${student.reg} marked as Failed (No Submissions).`);
                    }
                }
            }
        }

        if (phase.order === 5) {
            // ═══════════════════════════════════════════════════════════════
            // PHASE 5: COMPLETION & ARCHIVE
            // Capture a complete snapshot of every student and all related
            // documents BEFORE deleting anything from the database.
            // ═══════════════════════════════════════════════════════════════

            const students = await User.find({ role: 'student' })
                .populate('assignedFaculty',        'name email whatsappNumber')
                .populate('assignedSiteSupervisor', 'name email whatsappNumber')
                .lean();

            const archiveData = [];

            for (const s of students) {

                // ── Fetch all related documents ───────────────────────────
                const marksEntries = await Mark.find({ student: s._id })
                    .populate('assignment', 'title totalMarks weekNumber description')
                    .lean();

                const submissions = await Submission.find({ student: s._id })
                    .populate('assignment', 'title weekNumber')
                    .lean();

                const evaluations = await Evaluation.find({ student: s._id })
                    .populate('evaluator', 'name role')
                    .lean();

                // ── Calculate final grade ─────────────────────────────────
                let avg = 0, pct = 0, grade = 'F';
                const gradedMarks = marksEntries.filter(m => m.isFacultyGraded);

                if (gradedMarks.length > 0) {
                    const isFreelance =
                        s.internshipRequest?.mode === 'Freelance' ||
                        (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);

                    const taskScores = gradedMarks.map(m => {
                        const f  = m.facultyMarks        || 0;
                        const ss = m.siteSupervisorMarks || 0;
                        return isFreelance ? f : (f + ss) / 2;
                    });

                    avg = taskScores.reduce((sum, v) => sum + v, 0) / taskScores.length;
                    pct = Math.round((avg / 10) * 100);

                    if      (pct >= 85) grade = 'A';
                    else if (pct >= 80) grade = 'A-';
                    else if (pct >= 75) grade = 'B+';
                    else if (pct >= 71) grade = 'B';
                    else if (pct >= 68) grade = 'B-';
                    else if (pct >= 64) grade = 'C+';
                    else if (pct >= 61) grade = 'C';
                    else if (pct >= 58) grade = 'C-';
                    else if (pct >= 54) grade = 'D+';
                    else if (pct >= 50) grade = 'D';
                }

                // ── Determine final outcome ───────────────────────────────
                const didParticipate = gradedMarks.length > 0 || submissions.length > 0;
                const isIneligible   = !didParticipate &&
                    !['Assigned', 'Internship Approved', 'Agreement Approved'].includes(s.status);

                let finalStatus;
                if      (isIneligible)        finalStatus = 'Ineligible';
                else if (!didParticipate)     finalStatus = 'No Submissions';
                else if (gradedMarks.length === 0) finalStatus = 'Pending Grading';
                else if (pct >= 50)           finalStatus = 'Pass';
                else                          finalStatus = 'Fail';

                // ── Site supervisor details ───────────────────────────────
                // Priority: populated assignedSiteSupervisor > internshipRequest fields
                const siteSup = s.assignedSiteSupervisor
                    ? {
                        name:  s.assignedSiteSupervisor.name  || 'N/A',
                        email: s.assignedSiteSupervisor.email || 'N/A',
                        phone: s.assignedSiteSupervisor.whatsappNumber || 'N/A'
                    }
                    : {
                        name:  s.internshipRequest?.siteSupervisorName  || s.assignedCompanySupervisor       || 'N/A',
                        email: s.internshipRequest?.siteSupervisorEmail || s.assignedCompanySupervisorEmail  || 'N/A',
                        phone: s.internshipRequest?.siteSupervisorPhone || 'N/A'
                    };

                // ── Build the archived student record ─────────────────────
                archiveData.push({
                    // Identity
                    name:  s.name,
                    reg:   s.reg,
                    email: s.email,
                    phone: s.whatsappNumber || s.internshipAgreement?.whatsappNumber || 'N/A',

                    // Internship
                    grade,
                    percentage:     pct,
                    avgMarks:       Math.round(avg * 100) / 100,
                    status:         s.status,
                    finalStatus,
                    company:        s.assignedCompany || s.internshipRequest?.companyName || s.internshipAgreement?.companyName || 'N/A',
                    companyAddress: s.internshipAgreement?.companyAddress || 'N/A',
                    mode:           s.internshipRequest?.mode || 'N/A',

                    // Academic supervisor
                    faculty: {
                        name:  s.assignedFaculty?.name  || 'N/A',
                        email: s.assignedFaculty?.email || 'N/A',
                        phone: s.assignedFaculty?.whatsappNumber || 'N/A'
                    },

                    // Site supervisor
                    siteSupervisor: siteSup,

                    // All submissions
                    submissions: submissions.map(sub => ({
                        weekNumber:  sub.assignment?.weekNumber || null,
                        taskTitle:   sub.assignment?.title      || 'Unknown Task',
                        submittedAt: sub.submissionDate         || sub.createdAt,
                        fileUrl:     sub.fileUrl                || null,
                        status:      sub.status
                    })),

                    // All marks with full detail
                    marks: marksEntries.map(m => ({
                        title:                 m.assignment?.title      || 'Unknown Assignment',
                        totalMarks:            m.assignment?.totalMarks || 10,
                        marks:                 m.marks,
                        facultyMarks:          m.facultyMarks,
                        siteSupervisorMarks:   m.siteSupervisorMarks,
                        facultyRemarks:        m.facultyRemarks,
                        siteSupervisorRemarks: m.siteSupervisorRemarks,
                        isFacultyGraded:       m.isFacultyGraded,
                        gradedAt:              m.updatedAt
                    })),

                    // All evaluations
                    evaluations: evaluations.map(e => ({
                        title:         e.title       || 'General Evaluation',
                        feedback:      e.feedback,
                        score:         e.score,
                        submittedAt:   e.submittedAt || e.createdAt,
                        evaluatorName: e.evaluator?.name || 'Supervisor',
                        evaluatorRole: e.evaluator?.role || 'Unknown'
                    }))
                });
            }

            // ── Build cycle-level statistics ──────────────────────────────
            const participated  = archiveData.filter(a => a.finalStatus !== 'Ineligible' && a.finalStatus !== 'No Submissions');
            const passed        = archiveData.filter(a => a.finalStatus === 'Pass');
            const failed        = archiveData.filter(a => a.finalStatus === 'Fail');
            const ineligible    = archiveData.filter(a => a.finalStatus === 'Ineligible' || a.finalStatus === 'No Submissions');
            const physical      = archiveData.filter(a => a.mode && a.mode !== 'Freelance');
            const freelance     = archiveData.filter(a => a.mode === 'Freelance');

            const gradeDistribution = { A: 0, 'A-': 0, 'B+': 0, B: 0, 'B-': 0, 'C+': 0, C: 0, 'C-': 0, 'D+': 0, D: 0, F: 0 };
            archiveData.forEach(a => {
                if (gradeDistribution.hasOwnProperty(a.grade)) {
                    gradeDistribution[a.grade]++;
                }
            });

            const pcts = participated.map(a => a.percentage);
            const avgPct = pcts.length > 0
                ? Math.round(pcts.reduce((sum, v) => sum + v, 0) / pcts.length * 10) / 10
                : 0;

            const cycleName = `Internship Cycle — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

            // ── Save full archive BEFORE deleting anything ────────────────
            const newArchive = new Archive({
                cycleName,
                year: new Date().getFullYear(),
                students: archiveData,
                statistics: {
                    totalStudents:     archiveData.length,
                    totalParticipated: participated.length,
                    totalPassed:       passed.length,
                    totalFailed:       failed.length,
                    totalIneligible:   ineligible.length,
                    totalPhysical:     physical.length,
                    totalFreelance:    freelance.length,
                    averagePercentage: avgPct,
                    gradeDistribution
                },
                archivedBy: officeId
            });
            await newArchive.save();

            console.log(`[${getPKTTime()}] [PHASE 5] Archive saved: ${cycleName} — ${archiveData.length} students captured.`);

            // ── NOW delete all operational data ───────────────────────────
            await Promise.all([
                Submission.deleteMany({}),
                Mark.deleteMany({}),
                Evaluation.deleteMany({}),
                Assignment.deleteMany({}),
                Notice.deleteMany({}),
                Company.deleteMany({}),
                AuditLog.deleteMany({}),
                User.deleteMany({ role: { $in: ['student', 'faculty_supervisor', 'site_supervisor'] } })
            ]);

            // ── Reset all phases to pending, then auto-activate Phase 1 ──
            await Phase.updateMany({}, {
                $set: {
                    status: 'pending',
                    startedAt: null, completedAt: null,
                    startedBy: null, completedBy: null,
                    scheduledStartAt: null, scheduledEndAt: null,
                    notes: ''
                }
            });

            const p1 = await Phase.findOne({ order: 1 });
            if (p1) {
                p1.status    = 'active';
                p1.startedAt = new Date();
                p1.startedBy = officeId;
                await p1.save();
            }

            await new AuditLog({
                action:      'SYSTEM_RESET_PHASE_5',
                performedBy: officeId,
                details:     `Cycle "${cycleName}" fully archived (${archiveData.length} students) and system purged for clean slate.`,
                ipAddress:   req.ip
            }).save();

            console.log(`[${getPKTTime()}] [PHASE 5] System purged & Phase 1 reactivated.`);
            return res.json({ message: `All ${archiveData.length} student records archived. System reset and Phase 1 is now active.` });
        }

        await Phase.updateMany({ status: 'active' }, { $set: { status: 'completed', completedAt: new Date(), completedBy: officeId } });


        phase.status = 'active';
        phase.startedAt = new Date();
        if (scheduledEndAt) {
            phase.scheduledEndAt = new Date(scheduledEndAt);
        }
        await phase.save();
 
        // Notify ALL users about phase change
        const allUsers = await User.find({}, '_id');
        await createBulkNotifications(allUsers.map(u => u._id), {
            type: 'phase_change',
            title: `System Alert: ${phase.label}`,
            message: `The internship cycle has progressed. ${phase.label} is now active.`,
            link: '/'
        });

        await new AuditLog({ action: 'PHASE_STARTED', performedBy: officeId, details: `Phase "${phase.label}" manually started.`, ipAddress: req.ip }).save();
        console.log(`[${getPKTTime()}] [PHASE] Manually started: ${phase.label}`);
        res.json({ message: `"${phase.label}" is now active.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Default phase definitions ─────────────────────────────────────────────
const DEFAULT_PHASES = [
    { key: 'registration', label: 'Phase 1: Student Registration', description: 'The Internship Office registers student accounts and the portal is open for login.', icon: 'fa-user-plus', order: 1 },
    { key: 'placement_process', label: 'Phase 2: Placement & Approvals', description: 'Students submit internship applications, the HOD reviews and approves them, and formal agreements are verified.', icon: 'fa-file-signature', order: 2 },
    { key: 'internship_active', label: 'Phase 3: Internship Commencement', description: 'The internship period is underway. Students submit weekly reports and faculty supervisors evaluate their performance.', icon: 'fa-briefcase', order: 3 },
    { key: 'evaluation', label: 'Phase 4: Evaluation & Grading', description: 'Faculty supervisors finalise marks and evaluation reports for their assigned students.', icon: 'fa-clipboard-check', order: 4 },
    { key: 'completion', label: 'Phase 5: Completion & Closure', description: 'Final results are compiled and the internship cycle is officially concluded.', icon: 'fa-flag-checkered', order: 5 },
];

export const seedPhases = async () => {
    const count = await Phase.countDocuments();
    if (count === 0) {
        await Phase.insertMany(DEFAULT_PHASES.map(p => ({ ...p, status: 'pending' })));
        console.log(`[PHASES] Seeded ${DEFAULT_PHASES.length} default phases.`);
    }
};

// ── Auto-advance check (call on every GET /current or /all) ───────────────
const autoAdvanceBySchedule = async () => {
    const now = new Date();

    // Auto-start: pending phases whose scheduledStartAt has passed
    const toStart = await Phase.find({ status: 'pending', scheduledStartAt: { $lte: now } }).sort({ order: 1 });
    for (const phase of toStart) {
        // Make sure the previous phase is done or active
        const prev = await Phase.findOne({ order: phase.order - 1 });
        if (prev && prev.status === 'pending') continue; // previous not started yet

        // Archive the current active phase
        await Phase.updateMany({ status: 'active' }, { $set: { status: 'completed', completedAt: now } });

        phase.status = 'active';
        phase.startedAt = now;
        await phase.save();
 
        // Auto-notify on schedule hit
        const allUsers = await User.find({}, '_id');
        await createBulkNotifications(allUsers.map(u => u._id), {
            type: 'phase_change',
            title: `System Alert: ${phase.label}`,
            message: `The internship cycle has automatically progressed to ${phase.label}.`,
            link: '/'
        });
        console.log(`[${getPKTTime()}] [AUTO-PHASE] Started: ${phase.label}`);
    }

    // Auto-end: active phases whose scheduledEndAt has passed
    const toEnd = await Phase.find({ status: 'active', scheduledEndAt: { $lte: now } });
    for (const phase of toEnd) {
        phase.status = 'completed';
        phase.completedAt = now;
        await phase.save();
        console.log(`[${getPKTTime()}] [AUTO-PHASE] Completed: ${phase.label}`);
    }
};

// @route   GET api/phases/current
router.get('/current', async (req, res) => {
    try {
        const active = await Phase.findOne({ status: 'active' }).lean();
        res.json(active || null);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/phases
router.get('/', async (req, res) => {
    try {
        const phases = await Phase.find().sort({ order: 1 }).populate('startedBy completedBy', 'name').lean();
        res.json(phases);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   POST api/phases/:id/complete
router.post('/:id/complete', async (req, res) => {
    try {
        const { officeId } = req.body;
        const phase = await Phase.findById(req.params.id);
        if (!phase) return res.status(404).json({ message: 'Phase not found.' });
        if (phase.status !== 'active') return res.status(400).json({ message: 'Only an active phase can be completed.' });

        phase.status = 'completed';
        phase.completedAt = new Date();
        phase.completedBy = officeId;
        await phase.save();

        await new AuditLog({ action: 'PHASE_COMPLETED', performedBy: officeId, details: `Phase "${phase.label}" completed.`, ipAddress: req.ip }).save();
        res.json({ message: `"${phase.label}" marked as completed.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH api/phases/:id/schedule
// @desc    Set a scheduled start/end date (IO override)
router.patch('/:id/schedule', async (req, res) => {
    try {
        const { scheduledStartAt, scheduledEndAt, durationDays, officeId } = req.body;
        const phase = await Phase.findById(req.params.id);
        if (!phase) return res.status(404).json({ message: 'Phase not found.' });

        if (scheduledStartAt !== undefined) phase.scheduledStartAt = scheduledStartAt ? new Date(scheduledStartAt) : null;
        if (scheduledEndAt !== undefined) phase.scheduledEndAt = scheduledEndAt ? new Date(scheduledEndAt) : null;
        if (durationDays !== undefined) phase.durationDays = durationDays ? Number(durationDays) : null;
        await phase.save();

        await new AuditLog({ action: 'PHASE_SCHEDULED', performedBy: officeId, details: `Schedule updated for "${phase.label}".`, ipAddress: req.ip }).save();
        res.json({ message: 'Schedule updated successfully.', phase });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/phases/:id/reset — disabled for data integrity
router.post('/:id/reset', async (req, res) => {
    return res.status(403).json({ message: 'Phase reversals are not permitted. The programme must proceed in sequence.' });
});

// @route   PATCH api/phases/:id/notes
router.patch('/:id/notes', async (req, res) => {
    try {
        const { notes } = req.body;
        await Phase.findByIdAndUpdate(req.params.id, { $set: { notes } });
        res.json({ message: 'Notes saved.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
