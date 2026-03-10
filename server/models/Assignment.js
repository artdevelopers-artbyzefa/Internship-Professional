import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    courseTitle: {
        type: String,
        default: 'Internship'
    },
    description: String,
    startDate: {
        type: Date,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    totalMarks: {
        type: Number,
        default: 100
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Finalized'],
        default: 'Active'
    },
    // Faculty-specific deadline overrides
    overrides: [{
        facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deadline: Date
    }],
    fileUrl: String,
    targetStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

export default mongoose.model('Assignment', assignmentSchema);
