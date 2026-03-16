import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config({ path: './server/.env' });

const addStudent = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'fa23-bcs-013@cuiatd.edu.pk';
        const existing = await User.findOne({ email });

        if (existing) {
            console.log('Student already exists');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('Megamix@123', 12);
        const student = new User({
            name: 'Arslanrathore',
            email: email,
            password: hashedPassword,
            role: 'student',
            reg: 'FA23-BCS-013',
            semester: '4',
            status: 'verified'
        });

        await student.save();
        console.log('Student Arslanrathore added successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error adding student:', err);
        process.exit(1);
    }
};

addStudent();
