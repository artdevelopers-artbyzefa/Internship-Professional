import mongoose from 'mongoose';

const markSchema = new mongoose.Schema({
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    marks: { type: Number, default: null },
    siteSupervisorMarks: { type: Number, default: null },
    siteSupervisorRemarks: { type: String, default: '' },
    facultyMarks: { type: Number, default: null },
    facultyRemarks: { type: String, default: '' },
    isSiteSupervisorGraded: { type: Boolean, default: false },
    isFacultyGraded: { type: Boolean, default: false },
    siteSupervisorCriteria: { type: Map, of: Boolean, default: {} },
    siteSupervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    history: [{ marks: Number, role: String, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, updatedAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

markSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Pre-save hook for score logic
markSchema.pre('save', async function () {
    if (this.isModified('facultyMarks') || this.isModified('siteSupervisorMarks') || this.isNew) {
        try {
            const User = mongoose.model('User');
            const student = await User.findById(this.student);
            if (student) {
                const isFreelance = student.internshipRequest?.mode === 'Freelance' || (!student.assignedSiteSupervisor && !student.assignedCompanySupervisor);
                if (isFreelance) this.marks = this.facultyMarks;
                else {
                    const f = this.facultyMarks || 0, s = this.siteSupervisorMarks || 0;
                    this.marks = (f + s) / 2;
                }
            }
        } catch (err) {
        }
    }
});

export default mongoose.model('Mark', markSchema);
