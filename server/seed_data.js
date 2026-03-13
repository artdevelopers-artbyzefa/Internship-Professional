import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const hashedPassword = await bcrypt.hash('Megamix@123', 12);

        const users = [
            {
                name: 'HOD Office',
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
                name: 'Arslan Rathore',
                email: 'fa23-bcs-013@cuiatd.edu.pk',
                password: hashedPassword,
                role: 'student',
                reg: 'CIIT/FA23-BCS-013/ATD',
                semester: '7',
                status: 'verified'
            }
        ];

        for (const u of users) {
            // Find existing user
            let user = await User.findOne({ email: u.email });
            if (user) {
                // Update existing user fields
                Object.assign(user, u);
            } else {
                // Create new user
                user = new User(u);
            }
            // Use .save() to trigger pre('save') hooks
            await user.save();
            console.log(`User seeded/synced: ${user.name} (${user.role}) - ${user.email}`);
        }

        console.log('\nSeeding summary:');
        console.log('----------------');
        console.log('1. HOD Office: hod@cuiatd.edu.pk');
        console.log('2. Internship Office: io@cuiatd.edu.pk');
        console.log('3. Student: fa23-bcs-013@cuiatd.edu.pk (Arslan Rathore)');
        console.log('\nPassword for all: Megamix@123');

        console.log('\nAll good baby! The "fuckin shit" is seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
