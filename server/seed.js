import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Clear existing (optional)
        // await User.deleteMany({ role: { $ne: 'student' } });

        const hashedPassword = await bcrypt.hash('Admin@123', 12);

        const users = [
            {
                name: 'Prof. Imran Shafi',
                email: 'hod@cuiatd.edu.pk',
                password: hashedPassword,
                role: 'hod',
                status: 'verified'
            },
            {
                name: 'DIMS Admin',
                email: 'office@cuiatd.edu.pk',
                password: hashedPassword,
                role: 'internship_office',
                status: 'verified'
            }
        ];

        for (const u of users) {
            await User.findOneAndUpdate({ email: u.email }, u, { upsert: true });
            console.log(`User ${u.role} created/updated: ${u.email}`);
        }

        console.log('Seeding complete! Log in with above emails and password: Admin@123');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedAdmin();
