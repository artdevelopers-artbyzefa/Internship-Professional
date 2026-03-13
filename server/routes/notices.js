import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Notice from '../models/Notice.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

import { uploadCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// @route   POST api/notices
// @desc    Create a new notice with file uploads
router.post('/', protect, authorize('internship_office'), uploadCloudinary.array('files'), async (req, res) => {
    try {
        const { title, content, links, targetType, targetId, attachmentTitles } = req.body;

        let parsedLinks = [];
        try { if (links) parsedLinks = JSON.parse(links); } catch (e) { }

        let titles = [];
        try { if (attachmentTitles) titles = JSON.parse(attachmentTitles); } catch (e) { }

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
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/notices/all
// @desc    Get all notices for Office management with titles and target info
router.get('/all', protect, authorize('internship_office'), async (req, res) => {
    try {
        const notices = await Notice.find().sort({ createdAt: -1 }).populate('targetId', 'name reg');
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT api/notices/:id
// @desc    Update a notice (handles new files and existing data)
router.put('/:id', protect, authorize('internship_office'), uploadCloudinary.array('files'), async (req, res) => {
    try {
        const { title, content, links, targetType, targetId, attachmentTitles, existingAttachments } = req.body;

        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        let parsedLinks = [];
        try { if (links) parsedLinks = JSON.parse(links); } catch (e) { }

        let titles = [];
        try { if (attachmentTitles) titles = JSON.parse(attachmentTitles); } catch (e) { }

        let parsedExisting = [];
        try { if (existingAttachments) parsedExisting = JSON.parse(existingAttachments); } catch (e) { }

        // New files
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE api/notices/:id
// @desc    Delete a notice and its files
router.delete('/:id', protect, authorize('internship_office'), async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        // Delete files from filesystem
        notice.attachments.forEach(att => {
            if (fs.existsSync(att.path)) {
                fs.unlinkSync(att.path);
            }
        });

        await Notice.findByIdAndDelete(req.params.id);
        res.json({ message: 'Notice and files removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/notices/my
// @desc    Get notices for the current student/supervisor
router.get('/my', protect, async (req, res) => {
    try {
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
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/notices/supervisors
// @desc    Get all faculty supervisors
router.get('/supervisors', protect, authorize('internship_office'), async (req, res) => {
    try {
        const supervisors = await User.find({ role: 'faculty_supervisor' }, 'name email');
        res.json(supervisors);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/notices/students/:supervisorId
// @desc    Get students assigned to a specific supervisor
router.get('/students/:supervisorId', protect, authorize('internship_office'), async (req, res) => {
    try {
        const students = await User.find({
            role: 'student',
            assignedFaculty: req.params.supervisorId
        }, 'name reg');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/notices/public
// @desc    Get all public notices (for students and supervisors)
router.get('/public', async (req, res) => {
    try {
        const notices = await Notice.find({
            targetType: { $in: ['all_students', 'all_supervisors'] }
        })
        .sort({ createdAt: -1 })
        .limit(10);
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
