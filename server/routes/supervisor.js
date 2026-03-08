import express from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/supervisor/profile
// @desc    Get supervisor profile with company details
router.get('/profile', protect, async (req, res) => {
    try {
        if (req.user.role !== 'site_supervisor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Find the company this supervisor belongs to
        const company = await Company.findOne({
            'siteSupervisors.email': user.email
        });

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
            } : null
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT api/supervisor/profile
// @desc    Update supervisor phone number
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

        // Also update in Company record to keep in sync
        const company = await Company.findOne({ 'siteSupervisors.email': user.email });
        if (company) {
            const supervisorIndex = company.siteSupervisors.findIndex(s => s.email === user.email);
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

export default router;
