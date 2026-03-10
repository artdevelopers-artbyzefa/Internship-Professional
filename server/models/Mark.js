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
    marks: {
        type: Number,
        default: null
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

// Pre-save hook to calculate consolidated marks
markSchema.pre('save', async function (next) {
    if (this.isModified('facultyMarks') || this.isModified('siteSupervisorMarks') || this.isNew) {
        try {
            const User = mongoose.model('User');
            const student = await User.findById(this.student);

            if (student) {
                const isFreelance = student.internshipRequest?.mode === 'Freelance' ||
                    (!student.assignedSiteSupervisor && !student.assignedCompanySupervisor);

                if (isFreelance) {
                    // In freelance, only faculty marks count
                    this.marks = this.facultyMarks;
                } else {
                    // Average of both for standard track
                    // Only calculate if at least one exists. If both exist, average them.
                    const f = this.facultyMarks || 0;
                    const s = this.siteSupervisorMarks || 0;
                    this.marks = (f + s) / 2;
                }
            }
        } catch (err) {
            console.error('Error in Mark pre-save hook:', err);
        }
    }
    next();
});

export default mongoose.model('Mark', markSchema);
