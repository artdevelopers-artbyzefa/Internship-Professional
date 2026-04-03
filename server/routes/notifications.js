import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// @route   GET api/notifications
// @desc    Get all notifications for the current user
router.get('/', protect, asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20);
    res.json(notifications);
}));

// @route   PATCH api/notifications/mark-read
// @desc    Mark all notifications as read for current user
router.patch('/mark-read', protect, asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, read: false },
        { $set: { read: true } }
    );
    res.json({ message: 'Notifications marked as read' });
}));

// @route   PATCH api/notifications/:id/read
// @desc    Mark a single notification as read
router.patch('/:id/read', protect, asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: req.user._id
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    notification.read = true;
    await notification.save();
    res.json(notification);
}));

export default router;
