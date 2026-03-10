import express from 'express';
import Phase from '../models/Phase.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Mark from '../models/Mark.js';
import Submission from '../models/Submission.js';
import Evaluation from '../models/Evaluation.js';
import Archive from '../models/Archive.js';
import { getPKTTime } from '../utils/time.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ... existing DEFAULT_PHASES ...

// @route   POST api/phases/:id/start
// @desc    Manually activate a phase (IO override)
router.post('/:id/start', async (req, res) => {
    try {
        const { officeId } = req.body;
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
                        student.status = 'Fail'; // Or a custom status if preferred
                        await student.save();
                        console.log(`[PHASE 4] Student ${student.reg} marked as Failed (No Submissions).`);
                    }
                }
            }
        }

        if (phase.order === 5) {
            // PHASE 5: Completion & Archive
            const students = await User.find({ role: 'student' }).populate('assignedFaculty');
            const archiveData = [];

            for (const s of students) {
                // Calculate their final percentage and grade before reset
                const marks = await Mark.find({ student: s._id, isFacultyGraded: true });
                let avg = 0, pct = 0, grade = 'F';

                if (marks.length > 0) {
                    const isFreelance = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
                    const taskScores = marks.map(m => isFreelance ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2);
                    avg = taskScores.reduce((sum, val) => sum + val, 0) / taskScores.length;
                    pct = Math.round((avg / 10) * 100);

                    // Simple grade mapping
                    if (pct >= 85) grade = 'A';
                    else if (pct >= 80) grade = 'A-';
                    else if (pct >= 75) grade = 'B+';
                    else if (pct >= 71) grade = 'B';
                    else if (pct >= 68) grade = 'B-';
                    else if (pct >= 64) grade = 'C+';
                    else if (pct >= 61) grade = 'C';
                    else if (pct >= 58) grade = 'C-';
                    else if (pct >= 54) grade = 'D+';
                    else if (pct >= 50) grade = 'D';
                } else if (s.status === 'Fail') {
                    avg = 0; pct = 0; grade = 'F';
                }

                archiveData.push({
                    name: s.name,
                    reg: s.reg,
                    email: s.email,
                    grade,
                    percentage: pct,
                    status: s.status,
                    company: s.assignedCompany || 'N/A',
                    mode: s.internshipRequest?.mode || 'N/A',
                    faculty: s.assignedFaculty?.name || 'N/A'
                });
            }

            // Save to Archive
            const cycleName = `Internship Cycle - ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
            const stats = {
                totalStudents: archiveData.length,
                totalPassed: archiveData.filter(a => a.percentage >= 50).length,
                totalFailed: archiveData.filter(a => a.percentage < 50).length,
                averagePercentage: archiveData.length > 0 ? (archiveData.reduce((s, a) => s + a.percentage, 0) / archiveData.length) : 0
            };

            await new Archive({
                cycleName,
                year: new Date().getFullYear(),
                students: archiveData,
                statistics: stats,
                archivedBy: officeId
            }).save();

            // DATA PURGE & RESET (Clean Slate)
            // 1. Delete all process records
            await Promise.all([
                Submission.deleteMany({}),
                Mark.deleteMany({}),
                Evaluation.deleteMany({}),
                // Delete all students and supervisors to force a clean slate for next cycle
                User.deleteMany({ role: { $nin: ['hod', 'internship_office'] } })
            ]);

            // 2. Reset all Phases to pending except Phase 1 stays active for the next cycle
            await Phase.updateMany({}, { $set: { status: 'pending', startedAt: null, completedAt: null, startedBy: null, completedBy: null } });
            const p1 = await Phase.findOne({ order: 1 });
            if (p1) {
                p1.status = 'active';
                p1.startedAt = new Date();
                p1.startedBy = officeId;
                await p1.save();
            }

            await new AuditLog({ action: 'SYSTEM_RESET_PHASE_5', performedBy: officeId, details: `Cycle "${cycleName}" archived and system reset.`, ipAddress: req.ip }).save();
            console.log(`[${getPKTTime()}] [PHASE 5] System Reset & Archived: ${cycleName}`);

            return res.json({ message: `Cycle archived and system reset. Starting Phase 1 again.` });
        }

        await Phase.updateMany({ status: 'active' }, { $set: { status: 'completed', completedAt: new Date(), completedBy: officeId } });

        phase.status = 'active';
        phase.startedAt = new Date();
        phase.startedBy = officeId;
        await phase.save();

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

// Helper: seed phase records on first launch
const seedPhases = async () => {
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
        await seedPhases();
        await autoAdvanceBySchedule();
        const active = await Phase.findOne({ status: 'active' });
        res.json(active || null);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/phases
router.get('/', async (req, res) => {
    try {
        await seedPhases();
        await autoAdvanceBySchedule();
        const phases = await Phase.find().sort({ order: 1 }).populate('startedBy completedBy', 'name');
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
