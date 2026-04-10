import express from 'express';
import Notice from '../models/Notice.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadCloudinary } from '../utils/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notices
 *   description: Notice board management for students and faculty
 */

/**
 * @swagger
 * /notices:
 *   post:
 *     summary: Create a new notice with optional file attachments
 *     tags: [Notices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, content, targetType]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               links: { type: string }
 *               targetType: { type: string, enum: [all_students, all_supervisors, specific_student, specific_supervisor, system_landing] }
 *               targetId: { type: string }
 *               files: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201:
 *         description: Notice created successfully
 */
router.post('/', protect, authorize('internship_office'), uploadCloudinary.array('files'), asyncHandler(async (req, res) => {
    const { title, content, links, targetType, targetId, attachmentTitles } = req.body;

    let parsedLinks = [];
    if (links) {
        try { parsedLinks = JSON.parse(links); } catch (e) { }
    }

    let titles = [];
    if (attachmentTitles) {
        try { titles = JSON.parse(attachmentTitles); } catch (e) { }
    }

    const attachments = (req.files || []).map((file, idx) => ({
        title: titles[idx] || file.originalname,
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
    }));

    const notice = new Notice({
        title,
        content,
        links: parsedLinks,
        attachments,
        targetType,
        targetId: targetId || null,
        createdBy: req.user._id
    });

    await notice.save();
    res.status(201).json(notice);
}));

/**
 * @swagger
 * /notices/all:
 *   get:
 *     summary: Retrieve all notices (Admin search)
 *     tags: [Notices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all notices with target population info
 */
router.get('/all', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const notices = await Notice.find().sort({ createdAt: -1 }).populate('targetId', 'name reg');
    res.json(notices);
}));

/**
 * @swagger
 * /notices/{id}:
 *   put:
 *     summary: Update notice content and swap attachments
 *     tags: [Notices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 */
router.put('/:id', protect, authorize('internship_office'), uploadCloudinary.array('files'), asyncHandler(async (req, res) => {
    const { title, content, links, targetType, targetId, attachmentTitles, existingAttachments } = req.body;

    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    let parsedLinks = [];
    if (links) {
        try { parsedLinks = JSON.parse(links); } catch (e) { }
    }

    let titles = [];
    if (attachmentTitles) {
        try { titles = JSON.parse(attachmentTitles); } catch (e) { }
    }

    let parsedExisting = [];
    if (existingAttachments) {
        try { parsedExisting = JSON.parse(existingAttachments); } catch (e) { }
    }

    const newAttachments = (req.files || []).map((file, idx) => ({
        title: titles[idx] || file.originalname,
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
    }));

    notice.title = title || notice.title;
    notice.content = content || notice.content;
    notice.links = parsedLinks;
    notice.targetType = targetType || notice.targetType;
    notice.targetId = targetId || null;
    notice.attachments = [...parsedExisting, ...newAttachments];

    await notice.save();
    res.json(notice);
}));

/**
 * @swagger
 * /notices/bulk/delete:
 *   delete:
 *     summary: Delete multiple selected notices
 *     tags: [Notices]
 */
router.delete('/bulk/delete', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: 'Invalid IDs provided' });
    }
    await Notice.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Selected notices deleted successfully' });
}));

/**
 * @swagger
 * /notices/bulk/clear:
 *   delete:
 *     summary: Clear entire notice history
 *     tags: [Notices]
 */
router.delete('/bulk/clear', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    await Notice.deleteMany({});
    res.json({ message: 'All notices cleared successfully' });
}));

/**
 * @swagger
 * /notices/{id}:
 *   delete:
 *     summary: Remove a notice
 *     tags: [Notices]
 */
router.delete('/:id', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice and files removed' });
}));

/**
 * @swagger
 * /notices/my:
 *   get:
 *     summary: Get notices targeted for the authenticated user
 *     tags: [Notices]
 */
router.get('/my', protect, asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;

    let query = {};
    if (role === 'student') {
        query = {
            $or: [
                { targetType: 'all_students' },
                { targetType: 'specific_student', targetId: userId }
            ]
        };
    } else if (role === 'faculty_supervisor') {
        query = {
            $or: [
                { targetType: 'all_supervisors' },
                { targetType: 'specific_supervisor', targetId: userId }
            ]
        };
    } else {
        return res.json([]);
    }

    const notices = await Notice.find(query).sort({ createdAt: -1 });
    res.json(notices);
}));

/**
 * @swagger
 * /notices/supervisors:
 *   get:
 *     summary: List all faculty supervisors for targeting
 *     tags: [Notices]
 */
router.get('/supervisors', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const supervisors = await User.find({ role: 'faculty_supervisor' }, 'name email');
    res.json(supervisors);
}));

/**
 * @swagger
 * /notices/students/{supervisorId}:
 *   get:
 *     summary: List students assigned to a specific supervisor for targeting
 *     tags: [Notices]
 */
router.get('/students/:supervisorId', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const students = await User.find({
        role: 'student',
        assignedFaculty: req.params.supervisorId
    }, 'name reg');
    res.json(students);
}));

/**
 * @swagger
 * /notices/public:
 *   get:
 *     summary: Get top 10 recent public notices
 *     tags: [Notices]
 */
router.get('/public', asyncHandler(async (req, res) => {
    const notices = await Notice.find({
        targetType: 'system_landing'
    })
    .sort({ createdAt: -1 })
    .limit(10);
    res.json(notices);
}));

export default router;
