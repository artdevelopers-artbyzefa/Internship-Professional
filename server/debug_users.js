import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({}).lean();
        
        console.log('--- USER LIST ---');
        users.forEach(u => {
            console.log(`[${u.role.toUpperCase()}] ${u.name} | ${u.email} | Reg: ${u.reg || 'N/A'} | Status: ${u.status}`);
        });
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listUsers();
