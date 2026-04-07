import express from 'express';
import Phase from '../models/Phase.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { activatePhase } from '../utils/phaseEngine.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Phases
 *   description: Internship cycle phase management and scheduling
 */

/**
 * @swagger
 * /phases/{id}/start:
 *   post:
 *     summary: Manually activate an internship phase
 *     tags: [Phases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 */
router.post('/:id/start', asyncHandler(async (req, res) => {
    const { officeId, scheduledEndAt } = req.body;
    const { message } = await activatePhase(req.params.id, officeId, scheduledEndAt, req.ip);
    res.json({ message });
}));

/**
 * @swagger
 * /phases/current:
 *   get:
 *     summary: Retrieve the currently active system phase
 *     tags: [Phases]
 */
router.get('/current', asyncHandler(async (req, res) => {
    const active = await Phase.findOne({ status: 'active' }).lean();
    res.json(active || null);
}));

/**
 * @swagger
 * /phases:
 *   get:
 *     summary: List all roadmap phases and their statuses
 *     tags: [Phases]
 */
router.get('/', asyncHandler(async (req, res) => {
    const phases = await Phase.find().sort({ order: 1 }).populate('startedBy completedBy', 'name').lean();
    res.json(phases);
}));

/**
 * @swagger
 * /phases/{id}/complete:
 *   post:
 *     summary: Mark an active phase as completed
 *     tags: [Phases]
 */
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

/**
 * @swagger
 * /phases/{id}/schedule:
 *   patch:
 *     summary: Update scheduling constraints for a phase
 *     tags: [Phases]
 */
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

/**
 * @swagger
 * /phases/{id}/notes:
 *   patch:
 *     summary: Save administrative notes for a phase
 *     tags: [Phases]
 */
router.patch('/:id/notes', asyncHandler(async (req, res) => {
    const { notes } = req.body;
    await Phase.findByIdAndUpdate(req.params.id, { $set: { notes } });
    res.json({ message: 'Notes saved.' });
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

export default router;
