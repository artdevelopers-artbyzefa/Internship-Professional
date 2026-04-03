import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notification delivery and management
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Retrieve recent notifications for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of the 20 most recent notifications
 */
router.get('/', protect, asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20);
    res.json(notifications);
}));

/**
 * @swagger
 * /notifications/mark-read:
 *   patch:
 *     summary: Bulk mark all unread notifications as read
 *     tags: [Notifications]
 */
router.patch('/mark-read', protect, asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, read: false },
        { $set: { read: true } }
    );
    res.json({ message: 'Notifications marked as read' });
}));

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a specific notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 */
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
