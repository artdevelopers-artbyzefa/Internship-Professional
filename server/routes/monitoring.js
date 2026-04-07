import express from 'express';
import ErrorLog from '../models/ErrorLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: System monitoring and error log management
 */

/**
 * @swagger
 * /monitoring/logs:
 *   get:
 *     summary: Retrieve filtered error logs
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated error logs
 */
router.get('/logs', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    const { page = 1, limit = 5, status, error_type, user_id, route, startDate, endDate } = req.query;
    const query = {};

    if (status) query.status = status;
    if (error_type) query.error_type = error_type;
    if (user_id) query.user_id = user_id;
    if (route) query.route = { $regex: route, $options: 'i' };
    
    if (startDate || endDate) {
        query.created_at = {};
        if (startDate) {
            const date = new Date(startDate);
            if (!isNaN(date.getTime())) query.created_at.$gte = date;
        }
        if (endDate) {
            const date = new Date(endDate);
            if (!isNaN(date.getTime())) query.created_at.$lte = date;
        }
    }

    const [logs, count] = await Promise.all([
        ErrorLog.find(query)
            .sort({ created_at: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('user_id', 'name email role reg'),
        ErrorLog.countDocuments(query)
    ]);

    res.json({
        logs,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        totalLogs: count
    });
}));

/**
 * @swagger
 * /monitoring/logs/{id}:
 *   patch:
 *     summary: Update log status (resolve or reopen)
 *     tags: [Monitoring]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Log updated
 */
router.patch('/logs/:id', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    const { status } = req.body;
    const log = await ErrorLog.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json({ success: true, log });
}));

/**
 * @swagger
 * /monitoring/resolve-bulk:
 *   patch:
 *     summary: Resolve multiple logs simultaneously
 *     tags: [Monitoring]
 */
router.patch('/resolve-bulk', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    const { logIds } = req.body;
    if (!logIds || !Array.isArray(logIds)) return res.status(400).json({ message: 'Log IDs array required' });
    
    const validIds = logIds.filter(id => id && id.toString().length === 24);
    if (validIds.length === 0) return res.status(400).json({ message: 'No valid Log IDs provided' });
    
    await ErrorLog.updateMany({ _id: { $in: validIds } }, { $set: { status: 'resolved' } });
    res.json({ success: true, message: 'Logs resolved.' });
}));

/**
 * @swagger
 * /monitoring/logs/{id}:
 *   delete:
 *     summary: Remove a specific log entry
 *     tags: [Monitoring]
 */
router.delete('/logs/:id', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    const log = await ErrorLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json({ success: true, message: 'Log deleted.' });
}));

/**
 * @swagger
 * /monitoring/logs-clear-all:
 *   delete:
 *     summary: Wipe all log history
 *     tags: [Monitoring]
 */
router.delete('/logs-clear-all', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    await ErrorLog.deleteMany({});
    res.json({ success: true, message: 'All logs cleared.' });
}));

export default router;
