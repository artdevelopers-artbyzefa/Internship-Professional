import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'mfaisal060375@gmail.com';
        const password = 'Megamix@123'; // They can change this later using reset password feature

        console.log(`Checking existing records for ${email}...`);
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            console.log('User exists. Updating name, role, and password to act as Internship Office...');
            existingUser.name = 'Muhammad Ali Faisal (IO)';
            existingUser.role = 'internship_office';
            existingUser.password = await bcrypt.hash(password, 12);
            existingUser.status = 'verified';
            // Also removing 'reg' and 'semester' if they existed from a previous student role
            existingUser.reg = undefined;
            existingUser.semester = undefined;
            await existingUser.save();
        } else {
            console.log('Creating new Internship Office user...');
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUser = new User({
                name: 'Muhammad Ali Faisal (IO)',
                email: email.toLowerCase(),
                password: hashedPassword,
                role: 'internship_office',
                status: 'verified',
            });
            await newUser.save();
        }

        console.log('\nSUCCESS: Database Updated!');
        console.log('-------------------------');
        console.log('Name:    Muhammad Ali Faisal (IO)');
        console.log('Email:   ', email);
        console.log('Password:', password);
        console.log('Role:    ', 'internship_office');
        console.log('-------------------------');
        console.log('You can now log in using this email address via the portal.');

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
};

run();
