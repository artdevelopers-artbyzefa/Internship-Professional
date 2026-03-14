import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function addMinimalUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'ininsico@gmail.com';
        const password = 'Megamix@123';
        
        console.log(`[INIT] Adding minimal student: ${email}`);

        const hashedPassword = await bcrypt.hash(password, 12);

        const userData = {
            name: 'Ininsico Professional',
            reg: 'FA21-BCS-999',
            semester: '7',
            cgpa: '3.80',
            email: email,
            password: hashedPassword,
            role: 'student',
            status: 'verified', // Email pre-verified
            mustChangePassword: false
        };

        // Bypass Mongoose domain validation
        await User.collection.insertOne(userData);

        console.log(`[SUCCESS] User ${email} added with minimal data.`);
        console.log(`- Hard Criteria: MET (Semester 7, CGPA 3.80)`);
        console.log(`- Profile: INCOMPLETE (Missing Father Name, Section, etc.)`);
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('[ERROR]', err.message);
    }
}

addMinimalUser();
