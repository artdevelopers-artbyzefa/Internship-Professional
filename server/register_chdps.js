import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function registerSpecificStudent() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'chdps257@gmail.com';
        const reg = 'FA23-BSE-013';
        const password = 'Megamix@123';
        
        console.log(`[INIT] Registering student: ${email} (${reg})`);

        // Check for existing
        const existing = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }, { reg: reg.toUpperCase() }]
        });
        
        if (existing) {
            console.log(`[ABORT] User with email ${email} or Reg ${reg} already exists.`);
            await mongoose.disconnect();
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const userData = {
            name: 'Arslan Rathore', // Default name or placeholder
            reg: reg.toUpperCase(),
            semester: '7', // Minimum eligible semester
            cgpa: '3.00',
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'student',
            status: 'verified',
            mustChangePassword: false
        };

        // Using collection.insertOne to avoid any domain validation hooks if they act up
        await User.collection.insertOne(userData);

        console.log(`[SUCCESS] Student ${email} registered successfully.`);
        console.log(`- Temporary Password: ${password}`);
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('[ERROR]', err.message);
    }
}

registerSpecificStudent();
