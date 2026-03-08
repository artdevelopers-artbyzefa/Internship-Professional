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

        const hashedPassword = await bcrypt.hash('Megamix@123', 12);

        const users = [
            {
                name: 'Head of Department',
                email: 'hod@cuiatd.edu.pk',
                password: hashedPassword,
                role: 'hod',
                status: 'verified'
            },
            {
                name: 'Internship Office',
                email: 'io@cuiatd.edu.pk',
                password: hashedPassword,
                role: 'internship_office',
                status: 'verified'
            },
            {
                name: 'Test Student',
                email: 'fa23-bcs-034@cuiatd.edu.pk',
                password: hashedPassword,
                role: 'student',
                reg: 'CIIT/FA23-BCS-034/ATD',
                semester: '7',
                cgpa: '3.12',
                status: 'verified'
            },
            {
                name: 'Low CGPA Student',
                email: 'fa23-bcs-099@cuiatd.edu.pk',
                password: hashedPassword,
                role: 'student',
                reg: 'CIIT/FA23-BCS-099/ATD',
                semester: '7',
                cgpa: '1.20',
                status: 'verified'
            }
        ];

        for (const u of users) {
            // Find by email and update or create
            await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
            console.log(`User ${u.role} synced: ${u.email}`);
        }

        console.log('Seeding complete! Log in with Megamix@123');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedAdmin();
