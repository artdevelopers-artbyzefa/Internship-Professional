import mongoose from 'mongoose';

const markSchema = new mongoose.Schema({
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    siteSupervisorMarks: {
        type: Number,
        default: null
    },
    siteSupervisorRemarks: {
        type: String,
        default: ''
    },
    facultyMarks: {
        type: Number,
        default: null
    },
    facultyRemarks: {
        type: String,
        default: ''
    },
    isSiteSupervisorGraded: {
        type: Boolean,
        default: false
    },
    isFacultyGraded: {
        type: Boolean,
        default: false
    },
    siteSupervisorCriteria: {
        type: Map,
        of: Boolean,
        default: {}
    },
    siteSupervisorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    history: [{
        marks: Number,
        role: String, // 'site_supervisor' or 'faculty_supervisor'
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Ensure one mark per student per assignment
markSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model('Mark', markSchema);
