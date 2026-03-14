import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    reg: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },
    status: { type: String, default: 'unverified' },
    semester: { type: Number },
    mustChangePassword: { type: Boolean, default: false }
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function registerStudent() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'ininsico@gmail.com';
        const password = 'Megamix@123';
        const name = 'Arslan Rathore';
        const reg = 'CIIT/FA23-BCS-014/ATD';

        // Check if exists
        const existing = await User.findOne({ email });
        if (existing) {
            console.log('Student already exists. Updating details...');
            existing.password = await bcrypt.hash(password, 12);
            existing.status = 'verified';
            existing.name = name;
            existing.reg = reg;
            existing.semester = 5;
            await existing.save();
            console.log('Student updated successfully.');
        } else {
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUser = new User({
                name,
                reg,
                email,
                password: hashedPassword,
                role: 'student',
                status: 'verified',
                semester: 5,
                mustChangePassword: false
            });
            await newUser.save();
            console.log('Student registered successfully.');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

registerStudent();
