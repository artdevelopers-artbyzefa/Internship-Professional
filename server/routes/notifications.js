import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/notifications
// @desc    Get all notifications for the current user
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH api/notifications/mark-read
// @desc    Mark all notifications as read for current user
router.patch('/mark-read', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { $set: { read: true } }
        );
        res.json({ message: 'Notifications marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH api/notifications/:id/read
// @desc    Mark a single notification as read
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.user._id
        });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        
        notification.read = true;
        await notification.save();
        res.json(notification);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
