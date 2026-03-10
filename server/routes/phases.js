import express from 'express';
import Phase from '../models/Phase.js';
import AuditLog from '../models/AuditLog.js';
import { getPKTTime } from '../utils/time.js';

const router = express.Router();

// Default phase definitions — seeded on first request
const DEFAULT_PHASES = [
    { key: 'registration', label: 'Phase 1: Student Registration', description: 'The internship office onboards student accounts and the portal is open for login.', icon: 'fa-user-plus', order: 1 },
    { key: 'placement_process', label: 'Phase 2: Placement & Approvals', description: 'Students submit requests, HOD approves, and formal agreements are verified.', icon: 'fa-file-signature', order: 2 },
    { key: 'internship_active', label: 'Phase 3: Internship Commences', description: 'Internship period is underway. Students submit assignments and faculty evaluate performance.', icon: 'fa-business-time', order: 3 },
    { key: 'evaluation', label: 'Phase 4: Evaluation & Marking', description: 'Faculty supervisors submit marks and evaluations for their assigned students.', icon: 'fa-star-half-stroke', order: 4 },
    { key: 'completion', label: 'Phase 5: Completion & Closure', description: 'Final results are compiled. The internship cycle is officially closed.', icon: 'fa-flag-checkered', order: 5 },
];

// Helper: Initialize phases in DB if not present
const seedPhases = async () => {
    const count = await Phase.countDocuments();
    if (count === 0) {
        await Phase.insertMany(DEFAULT_PHASES.map(p => ({ ...p, status: 'pending' })));
        console.log(`[PHASES] Seeded ${DEFAULT_PHASES.length} default phases.`);
    }
};

// @route   GET api/phases/current
// @desc    Get the currently active phase (must be BEFORE :id routes)
router.get('/current', async (req, res) => {
    try {
        await seedPhases();
        const active = await Phase.findOne({ status: 'active' });
        res.json(active || null);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/phases
// @desc    Get all phases in order
router.get('/', async (req, res) => {
    try {
        await seedPhases();
        const phases = await Phase.find().sort({ order: 1 }).populate('startedBy completedBy', 'name');
        res.json(phases);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/phases/:id/start
// @desc    Activate a phase (marks previous as completed if sequential)
router.post('/:id/start', async (req, res) => {
    try {
        const { officeId } = req.body;
        const phase = await Phase.findById(req.params.id);
        if (!phase) return res.status(404).json({ message: 'Phase not found.' });

        if (phase.status === 'active') {
            return res.status(400).json({ message: 'This phase is already active.' });
        }
        if (phase.status === 'completed') {
            return res.status(400).json({ message: 'This phase is already completed.' });
        }

        // Complete any currently active phase
        await Phase.updateMany(
            { status: 'active' },
            { $set: { status: 'completed', completedAt: new Date(), completedBy: officeId } }
        );

        // Activate this phase
        phase.status = 'active';
        phase.startedAt = new Date();
        phase.startedBy = officeId;
        await phase.save();

        await new AuditLog({
            action: 'PHASE_STARTED',
            performedBy: officeId,
            details: `Phase "${phase.label}" started.`,
            ipAddress: req.ip
        }).save();

        console.log(`[${getPKTTime()}] [PHASE] Started: ${phase.label}`);
        res.json({ message: `Phase "${phase.label}" is now active.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/phases/:id/complete
// @desc    Manually mark a phase as completed
router.post('/:id/complete', async (req, res) => {
    try {
        const { officeId } = req.body;
        const phase = await Phase.findById(req.params.id);
        if (!phase) return res.status(404).json({ message: 'Phase not found.' });

        if (phase.status !== 'active') {
            return res.status(400).json({ message: 'Only an active phase can be completed.' });
        }

        phase.status = 'completed';
        phase.completedAt = new Date();
        phase.completedBy = officeId;
        await phase.save();

        await new AuditLog({
            action: 'PHASE_COMPLETED',
            performedBy: officeId,
            details: `Phase "${phase.label}" completed.`,
            ipAddress: req.ip
        }).save();

        res.json({ message: `Phase "${phase.label}" marked as completed.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/phases/:id/reset
// @desc    Reset a phase back to pending (admin override) - DISABLED
router.post('/:id/reset', async (req, res) => {
    // Phase reversals are disabled to maintain data integrity and sequential flow.
    return res.status(403).json({ message: 'Phase reversals are disabled. The program must proceed in sequence.' });
});

// @route   PATCH api/phases/:id/notes
// @desc    Update notes for a phase
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
