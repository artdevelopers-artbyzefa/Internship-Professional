import express from 'express';
import ErrorLog from '../models/ErrorLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// @route   GET api/monitoring/logs
// @desc    Get all error logs with filters
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

// @route   PATCH api/monitoring/logs/:id
// @desc    Mark log as resolved/pending
router.patch('/logs/:id', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    const { status } = req.body;
    const log = await ErrorLog.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json({ success: true, log });
}));

// @route   PATCH api/monitoring/resolve-bulk
// @desc    Mark multiple logs as resolved
router.patch('/resolve-bulk', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    const { logIds } = req.body;
    if (!logIds || !Array.isArray(logIds)) return res.status(400).json({ message: 'Log IDs array required' });
    
    const validIds = logIds.filter(id => id && id.toString().length === 24); // Basic ObjectId check
    if (validIds.length === 0) return res.status(400).json({ message: 'No valid Log IDs provided' });
    
    await ErrorLog.updateMany({ _id: { $in: validIds } }, { $set: { status: 'resolved' } });
    res.json({ success: true, message: 'Logs resolved.' });
}));

// @route   DELETE api/monitoring/logs/:id
// @desc    Delete specific log
router.delete('/logs/:id', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    const log = await ErrorLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json({ success: true, message: 'Log deleted.' });
}));

// @route   DELETE api/monitoring/logs-clear-all
// @desc    Clear all logs
router.delete('/logs-clear-all', protect, authorize('internship_office', 'hod'), asyncHandler(async (req, res) => {
    await ErrorLog.deleteMany({});
    res.json({ success: true, message: 'All logs cleared.' });
}));

export default router;
