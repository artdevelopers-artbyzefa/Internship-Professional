import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function deleteUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'ininsico@gmail.com';
        console.log(`[CLEANUP] Searching for user: ${email}...`);
        
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log(`[ABORT] No user found with email ${email}`);
        } else {
            const result = await User.deleteOne({ _id: user._id });
            console.log(`[SUCCESS] User ${email} deleted.`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('[ERROR]', err.message);
    }
}

deleteUser();
