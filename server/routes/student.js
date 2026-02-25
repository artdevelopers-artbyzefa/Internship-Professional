import express from 'express';
import User from '../models/User.js';
import Mark from '../models/Mark.js';
import Assignment from '../models/Assignment.js';
import { protect } from '../middleware/auth.js';
import { getPKTTime } from '../utils/time.js';

const router = express.Router();

// @route   POST api/student/submit-request
// @desc    Submit Internship Approval Form
router.post('/submit-request', async (req, res) => {
    try {
        const { userId, internshipType, companyName, duration, startDate, endDate, mode, description } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.internshipRequest = {
            type: internshipType,
            companyName: internshipType === 'Self' ? companyName : 'University Assigned',
            duration,
            startDate,
            endDate,
            mode,
            description,
            submittedAt: Date.now()
        };
        user.status = 'Internship Request Submitted';

        await user.save();
        console.log(`[${getPKTTime()}] [STUDENT] Internship Request Submitted by ${user.email}`);

        res.json({ message: 'Internship request submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/student/submit-agreement
// @desc    Submit Student Agreement Form
router.post('/submit-agreement', async (req, res) => {
    try {
        const { userId, agreementData } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.internshipAgreement = {
            ...agreementData,
            submittedAt: Date.now()
        };

        const type = agreementData.formType || user.internshipRequest.type;
        user.status = type === 'Self'
            ? 'Agreement Submitted - Self'
            : 'Agreement Submitted - University Assigned';

        await user.save();
        console.log(`[${getPKTTime()}] [STUDENT] Agreement Submitted by ${user.email}`);

        res.json({ message: 'Agreement submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/student/my-marks
// @desc    Get current student's marks
router.get('/my-marks', protect, async (req, res) => {
    try {
        const marks = await Mark.find({ student: req.user.id })
            .populate('assignment', 'title deadline totalMarks status')
            .sort({ createdAt: -1 });
        res.json(marks);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
