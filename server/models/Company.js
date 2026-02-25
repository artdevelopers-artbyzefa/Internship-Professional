import mongoose from 'mongoose';

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
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, {
    timestamps: true
});

const Company = mongoose.model('Company', companySchema);
export default Company;
