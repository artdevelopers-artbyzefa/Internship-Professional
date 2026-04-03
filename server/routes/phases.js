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
import { createBulkNotifications } from '../utils/notifications.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadCloudinaryBuffer } from '../utils/cloudinary.js';
import { generatePdfBuffer, generateExcelBuffer } from '../utils/exportEngine.js';
import { getArchiveSnapshot } from '../utils/archiver.js';

const router = express.Router();

// @route   POST api/phases/:id/start
// @desc    Manually activate a phase (IO override)
router.post('/:id/start', asyncHandler(async (req, res) => {
    const { officeId, scheduledEndAt } = req.body;
    const phase = await Phase.findById(req.params.id);
    if (!phase) return res.status(404).json({ message: 'Phase not found.' });
    if (phase.status === 'active') return res.status(400).json({ message: 'This phase is already active.' });
    if (phase.status === 'completed') return res.status(400).json({ message: 'This phase is already completed.' });

    // Logic for specific phase transitions
    if (phase.order === 4) {
        const students = await User.find({ role: 'student' });
        for (const student of students) {
            const subCount = await Submission.countDocuments({ student: student._id });
            if (subCount === 0) {
                const allowedStatuses = ['Assigned', 'Internship Approved', 'Agreement Approved'];
                if (allowedStatuses.includes(student.status)) {
                    student.status = 'Fail'; 
                    await student.save();
                }
            }
        }
    }

    if (phase.order === 5) {
        // 1. Generate High-Fidelity Snapshot
        const snapshot = await getArchiveSnapshot();
        const { students: archiveData, statistics, rawSnapshot, cycleName, year } = snapshot;

        // 2. Format for PDF/Excel Generators
        const reportData = {
            stats: { 
                total: statistics.totalStudents, 
                participating: statistics.totalParticipated, 
                passed: statistics.totalPassed, 
                failed: statistics.totalFailed, 
                ineligible: statistics.totalIneligible,
                physical: statistics.totalPhysical,
                freelance: statistics.totalFreelance,
                avgPct: statistics.averagePercentage, 
                avgGrade: 'N/A' 
            },
            tables: { 
                students: archiveData.map(a => [a.reg, a.name, a.phone, a.email, a.faculty.name, a.siteSupervisor.name, a.company, a.mode, a.avgMarks, a.percentage, a.finalStatus]) 
            },
            charts: {},
            students: archiveData
        };

        // 3. Generate and Upload Reports
        const [pdfBuf, excelBuf] = await Promise.all([
            generatePdfBuffer(reportData),
            generateExcelBuffer(reportData)
        ]);

        const [pdfRes, excelRes] = await Promise.all([
            uploadCloudinaryBuffer(pdfBuf, 'Archive_Audit_Dossier.pdf'),
            uploadCloudinaryBuffer(excelBuf, 'Archive_Student_Ledger.xlsx')
        ]);

        // 4. Save to Official Archive
        const newArchive = new Archive({
            cycleName, 
            year, 
            students: archiveData,
            statistics,
            archivedBy: officeId,
            pdfUrl: pdfRes.secure_url,
            excelUrl: excelRes.secure_url,
            rawSnapshot
        });
        await newArchive.save();

        // 5. Destructive System Reset
        await Promise.all([
            Submission.deleteMany({}), Mark.deleteMany({}), Evaluation.deleteMany({}), Assignment.deleteMany({}), Notice.deleteMany({}), Company.deleteMany({}), AuditLog.deleteMany({}),
            User.deleteMany({ role: { $in: ['student', 'faculty_supervisor', 'site_supervisor'] } })
        ]);

        await Phase.updateMany({}, { $set: { status: 'pending', startedAt: null, completedAt: null, startedBy: null, completedBy: null, scheduledStartAt: null, scheduledEndAt: null, notes: '' } });
        const p1 = await Phase.findOne({ order: 1 });
        if (p1) { p1.status = 'active'; p1.startedAt = new Date(); p1.startedBy = officeId; await p1.save(); }

        await new AuditLog({ action: 'SYSTEM_RESET_PHASE_5', performedBy: officeId, details: `Cycle "${cycleName}" fully archived with high-fidelity snapshots and cloud assets.`, ipAddress: req.ip }).save();

        return res.json({ message: `Archival Complete. ${archiveData.length} records preserved with PDF/Excel assets. System reset.` });
    }

    await Phase.updateMany({ status: 'active' }, { $set: { status: 'completed', completedAt: new Date(), completedBy: officeId } });

    phase.status = 'active';
    phase.startedAt = new Date();
    if (scheduledEndAt) phase.scheduledEndAt = new Date(scheduledEndAt);
    await phase.save();

    const allUsers = await User.find({}, '_id');
    await createBulkNotifications(allUsers.map(u => u._id), {
        type: 'phase_change',
        title: `System Alert: ${phase.label}`,
        message: `The internship cycle has progressed. ${phase.label} is now active.`,
        link: '/'
    });

    await new AuditLog({ action: 'PHASE_STARTED', performedBy: officeId, details: `Phase "${phase.label}" manually started.`, ipAddress: req.ip }).save();
    res.json({ message: `"${phase.label}" is now active.` });
}));

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
    }
};

// @route   GET api/phases/current
router.get('/current', asyncHandler(async (req, res) => {
    const active = await Phase.findOne({ status: 'active' }).lean();
    res.json(active || null);
}));

// @route   GET api/phases
router.get('/', asyncHandler(async (req, res) => {
    const phases = await Phase.find().sort({ order: 1 }).populate('startedBy completedBy', 'name').lean();
    res.json(phases);
}));

// @route   POST api/phases/:id/complete
router.post('/:id/complete', asyncHandler(async (req, res) => {
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
}));

// @route   PATCH api/phases/:id/schedule
router.patch('/:id/schedule', asyncHandler(async (req, res) => {
    const { scheduledStartAt, scheduledEndAt, durationDays, officeId } = req.body;
    const phase = await Phase.findById(req.params.id);
    if (!phase) return res.status(404).json({ message: 'Phase not found.' });

    if (scheduledStartAt !== undefined) phase.scheduledStartAt = scheduledStartAt ? new Date(scheduledStartAt) : null;
    if (scheduledEndAt !== undefined) phase.scheduledEndAt = scheduledEndAt ? new Date(scheduledEndAt) : null;
    if (durationDays !== undefined) phase.durationDays = durationDays ? Number(durationDays) : null;
    await phase.save();

    await new AuditLog({ action: 'PHASE_SCHEDULED', performedBy: officeId, details: `Schedule updated for "${phase.label}".`, ipAddress: req.ip }).save();
    res.json({ message: 'Schedule updated successfully.', phase });
}));

// @route   POST api/phases/:id/reset
router.post('/:id/reset', (req, res) => {
    res.status(403).json({ message: 'Phase reversals are not permitted.' });
});

// @route   PATCH api/phases/:id/notes
router.patch('/:id/notes', asyncHandler(async (req, res) => {
    const { notes } = req.body;
    await Phase.findByIdAndUpdate(req.params.id, { $set: { notes } });
    res.json({ message: 'Notes saved.' });
}));

export default router;
