import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const studentId = 'fa23-bcs-013';
        const email = `${studentId.toLowerCase()}@cuiatd.edu.pk`;
        const reg = `CIIT/${studentId.toUpperCase()}/ATD`;
        const password = 'Megamix@123';

        console.log(`Cleaning up existing records for ${email}...`);
        await User.deleteMany({ $or: [{ email }, { reg }] });

        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 12);

        console.log('Creating new verified student...');
        const newUser = new User({
            name: 'Arslan Fa23',
            email: email,
            reg: reg,
            password: hashedPassword,
            role: 'student',
            status: 'verified',
            semester: '4', // Example semester
            cgpa: '3.5',
            whatsappNumber: '03001234567',
            section: 'A',
            fatherName: 'Zahid Rathore'
        });

        await newUser.save();
        console.log('\nSUCCESS!');
        console.log('-------------------------');
        console.log('Email:   ', email);
        console.log('Password:', password);
        console.log('Role:    ', 'student');
        console.log('Status:  ', 'verified');
        console.log('-------------------------');

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
};

run();
