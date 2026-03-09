import express from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Mark from '../models/Mark.js';
import { protect } from '../middleware/auth.js';
import { uploadCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// @route   GET api/supervisor/profile
// @desc    Get supervisor profile with company details and counts
router.get('/profile', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const userEmail = user.email.toLowerCase();
        const escapeRegex = (s) => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
        const nameRegex = new RegExp(escapeRegex(user.name.trim()), 'i');

        const [company, studentCount] = await Promise.all([
            Company.findOne({ 'siteSupervisors.email': userEmail }),
            User.countDocuments({
                role: 'student',
                $or: [
                    { assignedSiteSupervisor: user._id },
                    { assignedCompanySupervisorEmail: userEmail },
                    { 'internshipRequest.siteSupervisorEmail': userEmail },
                    { 'internshipAgreement.companySupervisorEmail': userEmail },
                    { assignedCompanySupervisor: { $regex: nameRegex } }
                ]
            })
        ]);

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                whatsappNumber: user.whatsappNumber,
                role: user.role,
                status: user.status
            },
            company: company ? {
                id: company._id,
                name: company.name,
                regNo: company.regNo,
                scope: company.scope
            } : null,
            stats: {
                studentCount
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/supervisor/update-phone
router.post('/update-phone', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { whatsappNumber } = req.body;
        if (!whatsappNumber) {
            return res.status(400).json({ message: 'WhatsApp number is required.' });
        }

        const user = await User.findById(req.user.id);
        user.whatsappNumber = whatsappNumber;
        await user.save();

        const company = await Company.findOne({ 'siteSupervisors.email': user.email.toLowerCase() });
        if (company) {
            const supervisorIndex = company.siteSupervisors.findIndex(s => s.email.toLowerCase() === user.email.toLowerCase());
            if (supervisorIndex > -1) {
                company.siteSupervisors[supervisorIndex].whatsappNumber = whatsappNumber;
                await company.save();
            }
        }

        res.json({ message: 'Phone number updated successfully.', whatsappNumber: user.whatsappNumber });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/supervisor/interns
router.get('/interns', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const userEmail = req.user.email.toLowerCase().trim();
        const escapeRegex = (s) => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
        const nameRegex = new RegExp(escapeRegex(req.user.name.trim()), 'i');

        const students = await User.find({
            role: 'student',
            $or: [
                { assignedSiteSupervisor: req.user.id },
                { assignedCompanySupervisorEmail: userEmail },
                { 'internshipRequest.siteSupervisorEmail': userEmail },
                { 'internshipAgreement.companySupervisorEmail': userEmail },
                { assignedCompanySupervisor: { $regex: nameRegex } }
            ]
        }).select('name reg status profilePicture');

        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/supervisor/assignments
router.get('/assignments', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const assignments = await Assignment.find({ createdBy: req.user.id });
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/supervisor/assignments
router.post('/assignments', protect, uploadCloudinary.single('file'), async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { title, description, startDate, deadline, totalMarks } = req.body;
        const assignment = new Assignment({
            title,
            description,
            startDate,
            deadline,
            totalMarks,
            fileUrl: req.file ? req.file.path : null,
            createdBy: req.user.id,
            courseTitle: 'Industrial Task'
        });

        await assignment.save();
        res.status(201).json(assignment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
