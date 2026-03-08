import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', 'backend', 'server', '.env') });

const UserSchema = new mongoose.Schema({
    name: String,
    reg: String,
    status: String,
    role: String,
    internshipRequest: {
        facultyStatus: String,
        companyName: String,
        submittedAt: Date
    }
});

const User = mongoose.model('User', UserSchema);

async function checkPending() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const pendingOffice = await User.find({
            role: 'student',
            status: 'Internship Request Submitted'
        }).select('name reg internshipRequest.companyName internshipRequest.submittedAt');

        const pendingFaculty = await User.find({
            role: 'student',
            'internshipRequest.facultyStatus': 'Pending',
            status: 'Internship Request Submitted'
        }).select('name reg internshipRequest.companyName internshipRequest.submittedAt');

        console.log('\n--- Pending Office Approval ---');
        if (pendingOffice.length === 0) console.log('None');
        pendingOffice.forEach(u => {
            console.log(`${u.name} (${u.reg}) - Company: ${u.internshipRequest?.companyName || 'N/A'}`);
        });

        console.log('\n--- Pending Faculty Acceptance ---');
        if (pendingFaculty.length === 0) console.log('None');
        pendingFaculty.forEach(u => {
            console.log(`${u.name} (${u.reg}) - Company: ${u.internshipRequest?.companyName || 'N/A'}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkPending();
