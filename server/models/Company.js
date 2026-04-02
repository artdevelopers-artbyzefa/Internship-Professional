import mongoose from 'mongoose';
import { normalizeEntityName } from '../utils/normalization.js';

const supervisorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    whatsappNumber: { type: String, required: true }
});

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    normalized_key: {
        type: String,
        unique: true,
        sparse: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    address: String,
    regNo: {
        type: String,
        unique: true,
        sparse: true
    },
    scope: String,
    hrEmail: String,

    // Multiple supervisors for MOU companies
    siteSupervisors: [supervisorSchema],

    // Compatibility for student-submitted ones (they usually have one)
    // We can also just push them to siteSupervisors

    mouSignedDate: Date,
    isMOUSigned: {
        type: Boolean,
        default: false
    },
    source: {
        type: String,
        enum: ['manual', 'student_submission'],
        default: 'manual'
    },
    category: {
        type: String,
        enum: ['MOU Partner', 'Student Self-Assigned'],
        default: 'MOU Partner'
    },

    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Pending'],
        default: 'Active'
    }
}, {
    timestamps: true
});

companySchema.pre('save', async function () {
    if (this.isModified('name') && !this.normalized_key) {
        this.normalized_key = normalizeEntityName(this.name);
    }
});

const Company = mongoose.model('Company', companySchema);
export default Company;
