import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import User from './models/User.js';

const pushStudent = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Database');

        const rollPart = 'fa23-bcs-013'.toUpperCase();
        const email = `${rollPart}@cuiatd.edu.pk`.toLowerCase();
        const hashedPassword = await bcrypt.hash('CUI@12345', 12);

        const studentData = {
            name: 'Arslan Rathore',
            email: email,
            password: hashedPassword,
            role: 'student',
            reg: `CIIT/${rollPart}/ATD`, 
            semester: '5',
            cgpa: '3.45', 
            status: 'verified',
            fatherName: 'Zahid Rathore',
            section: 'A',
            dateOfBirth: new Date('2003-05-15'),
            registeredCourse: 'Internship'
        };

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            Object.assign(existingUser, studentData);
            await existingUser.save();
            console.log(`Updated existing student: ${email}`);
        } else {
            const newUser = new User(studentData);
            await newUser.save();
            console.log(`Created new student: ${email}`);
        }

        console.log(`Roll Number: ${rollPart}`);
        console.log(`Status: ${studentData.status}`);
        console.log(`CGPA: ${studentData.cgpa}`);
        console.log(`Password: Megamix@123`);

        await mongoose.connection.close();
        console.log('Mongoose connection closed.');
    } catch (err) {
        if (err.name === 'ValidationError') {
            console.error('Validation Error details:');
            for (let field in err.errors) {
                console.error(` - ${field}: ${err.errors[field].message}`);
            }
        } else {
            console.error('Unexpected Error:', err);
        }
        process.exit(1);
    }
};

pushStudent();
