import express from 'express';
import Notice from '../models/Notice.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadCloudinary } from '../utils/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// @route   POST api/notices
// @desc    Create a new notice with file uploads
router.post('/', protect, authorize('internship_office'), uploadCloudinary.array('files'), asyncHandler(async (req, res) => {
    const { title, content, links, targetType, targetId, attachmentTitles } = req.body;

    let parsedLinks = [];
    if (links) {
        try { parsedLinks = JSON.parse(links); } catch (e) { /* silent fail, default to empty */ }
    }

    let titles = [];
    if (attachmentTitles) {
        try { titles = JSON.parse(attachmentTitles); } catch (e) { /* silent fail */ }
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

// @route   GET api/notices/all
// @desc    Get all notices for Office management with titles and target info
router.get('/all', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const notices = await Notice.find().sort({ createdAt: -1 }).populate('targetId', 'name reg');
    res.json(notices);
}));

// @route   PUT api/notices/:id
// @desc    Update a notice (handles new files and existing data)
router.put('/:id', protect, authorize('internship_office'), uploadCloudinary.array('files'), asyncHandler(async (req, res) => {
    const { title, content, links, targetType, targetId, attachmentTitles, existingAttachments } = req.body;

    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    let parsedLinks = [];
    if (links) {
        try { parsedLinks = JSON.parse(links); } catch (e) { /* silent fail */ }
    }

    let titles = [];
    if (attachmentTitles) {
        try { titles = JSON.parse(attachmentTitles); } catch (e) { /* silent fail */ }
    }

    let parsedExisting = [];
    if (existingAttachments) {
        try { parsedExisting = JSON.parse(existingAttachments); } catch (e) { /* silent fail */ }
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

// @route   DELETE api/notices/:id
// @desc    Delete a notice and its files
router.delete('/:id', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice and files removed' });
}));

// @route   GET api/notices/my
// @desc    Get notices for the current student/supervisor
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

// @route   GET api/notices/supervisors
// @desc    Get all faculty supervisors
router.get('/supervisors', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const supervisors = await User.find({ role: 'faculty_supervisor' }, 'name email');
    res.json(supervisors);
}));

// @route   GET api/notices/students/:supervisorId
// @desc    Get students assigned to a specific supervisor
router.get('/students/:supervisorId', protect, authorize('internship_office'), asyncHandler(async (req, res) => {
    const students = await User.find({
        role: 'student',
        assignedFaculty: req.params.supervisorId
    }, 'name reg');
    res.json(students);
}));

// @route   GET api/notices/public
// @desc    Get all public notices (for students and supervisors)
router.get('/public', asyncHandler(async (req, res) => {
    const notices = await Notice.find({
        targetType: { $in: ['all_students', 'all_supervisors', 'system_landing'] }
    })
    .sort({ createdAt: -1 })
    .limit(10);
    res.json(notices);
}));

export default router;
