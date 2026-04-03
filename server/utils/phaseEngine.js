/**
 * @fileoverview System Phase Transition Engine.
 * This module manages the lifecycle of an internship cycle, including 
 * automated transitions between phases, system-wide data archival, 
 * and full environment resets.
 */

import Phase from '../models/Phase.js';
import User from '../models/User.js';
import Submission from '../models/Submission.js';
import Mark from '../models/Mark.js';
import Evaluation from '../models/Evaluation.js';
import Archive from '../models/Archive.js';
import Assignment from '../models/Assignment.js';
import Company from '../models/Company.js';
import Notice from '../models/Notice.js';
import AuditLog from '../models/AuditLog.js';
import { getArchiveSnapshot } from './archiver.js';
import { generatePdfBuffer, generateExcelBuffer } from './exportEngine.js';
import { uploadCloudinaryBuffer } from './cloudinary.js';
import { createBulkNotifications } from './notifications.js';

/**
 * Activates a specific phase and manages all associated system state transitions.
 * Handles specialized logic for phase transitions (e.g., auto-fail in Phase 4 or 
 * archival in Phase 5).
 * 
 * @param {string} phaseId - ID of the phase to activate.
 * @param {string} officeId - ID of the administrative agent performing the action.
 * @param {Date} [scheduledEndAt] - Optional automated end deadline.
 * @param {string} [ip='system'] - Source IP for audit logging.
 * @returns {Promise<Object>} Success message or status.
 * @throws {Error} If the phase cannot be found or transition criteria aren't met.
 */
export const activatePhase = async (phaseId, officeId, scheduledEndAt = null, ip = 'system') => {
    const phase = await Phase.findById(phaseId);
    if (!phase) throw new Error('Phase not found.');
    if (phase.status === 'active') return { message: 'Already active' };
    if (phase.status === 'completed') return { message: 'Already completed' };

    // Post-Management Transition: System automatically fails non-participants
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

    // Final Closure & Reset: Full archival and database cleanup
    if (phase.order === 5) {
        const snapshot = await getArchiveSnapshot();
        const { students: archiveData, statistics, rawSnapshot, cycleName, year } = snapshot;

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

        const [pdfBuf, excelBuf] = await Promise.all([
            generatePdfBuffer(reportData),
            generateExcelBuffer(reportData)
        ]);

        const [pdfRes, excelRes] = await Promise.all([
            uploadCloudinaryBuffer(pdfBuf, 'Archive_Audit_Dossier.pdf'),
            uploadCloudinaryBuffer(excelBuf, 'Archive_Student_Ledger.xlsx')
        ]);

        const newArchive = new Archive({
            cycleName, 
            year, 
            students: archiveData,
            statistics,
            archivedBy: officeId || null,
            pdfUrl: pdfRes.secure_url,
            excelUrl: excelRes.secure_url,
            rawSnapshot
        });
        await newArchive.save();

        // System Wipe: Deletes session-specific data to prepare for the next cycle
        await Promise.all([
            Submission.deleteMany({}), Mark.deleteMany({}), Evaluation.deleteMany({}), Assignment.deleteMany({}), Notice.deleteMany({}), Company.deleteMany({}), AuditLog.deleteMany({}),
            User.deleteMany({ role: { $in: ['student', 'faculty_supervisor', 'site_supervisor'] } })
        ]);

        await Phase.updateMany({}, { $set: { status: 'pending', startedAt: null, completedAt: null, startedBy: null, completedBy: null, scheduledStartAt: null, scheduledEndAt: null, notes: '' } });
        
        const p1 = await Phase.findOne({ order: 1 });
        if (p1) { 
            p1.status = 'active'; 
            p1.startedAt = new Date(); 
            p1.startedBy = officeId; 
            await p1.save(); 
        }

        await new AuditLog({ 
            action: 'SYSTEM_RESET_PHASE_5', 
            performedBy: officeId, 
            details: `Cycle "${cycleName}" fully archived. System reset.`, 
            ipAddress: ip 
        }).save();

        return { message: 'Archival Complete' };
    }

    // Process sequential transitions
    await Phase.updateMany({ status: 'active' }, { $set: { status: 'completed', completedAt: new Date(), completedBy: officeId } });

    phase.status = 'active';
    phase.startedAt = new Date();
    phase.startedBy = officeId;
    if (scheduledEndAt) phase.scheduledEndAt = new Date(scheduledEndAt);
    await phase.save();

    const allUsers = await User.find({}, '_id');
    await createBulkNotifications(allUsers.map(u => u._id), {
        type: 'phase_change',
        title: `System Alert: ${phase.label}`,
        message: `The internship cycle has progressed. ${phase.label} is now active.`,
        link: '/'
    });

    await new AuditLog({ 
        action: 'PHASE_STARTED', 
        performedBy: officeId, 
        details: `Phase "${phase.label}" started.`, 
        ipAddress: ip 
    }).save();

    return { message: `"${phase.label}" is now active.` };
};

/**
 * Background scheduler to automatically manage phase progression 
 * based on deadlines and scheduled timestamps.
 */
export const runAutoPhaseChecker = async () => {
    try {
        const now = new Date();
        
        // Check for active phases reaching their expiration
        const active = await Phase.findOne({ status: 'active', scheduledEndAt: { $ne: null, $lte: now } });
        if (active) {
            const next = await Phase.findOne({ order: active.order + 1, status: 'pending' });
            if (next) {
                console.log(`[Auto-Phase] Deadline reached for "${active.label}". Auto-starting "${next.label}".`);
                await activatePhase(next._id, active.startedBy || null, null, '127.0.0.1');
            }
        }

        // Check for pending phases reaching their scheduled activation time
        const pendingToStart = await Phase.findOne({ status: 'pending', scheduledStartAt: { $ne: null, $lte: now } });
        if (pendingToStart) {
            const prevDone = pendingToStart.order === 1 || (await Phase.findOne({ order: pendingToStart.order - 1, status: { $ne: 'pending' } }));
            if (prevDone) {
                console.log(`[Auto-Phase] Scheduled start time reached for "${pendingToStart.label}". Auto-activating.`);
                await activatePhase(pendingToStart._id, null, null, '127.0.0.1');
            }
        }
    } catch (err) {
        console.error('[Phase Engine] Error in auto-check:', err.message);
    }
};

