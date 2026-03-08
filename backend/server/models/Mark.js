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
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    marks: {
        type: Number,
        required: true,
        min: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    history: [{
        marks: Number,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Ensure one mark per student per assignment
markSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model('Mark', markSchema);
