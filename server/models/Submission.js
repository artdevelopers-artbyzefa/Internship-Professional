import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
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
    fileUrl: {
        type: String,
        required: true
    },
    fileName: String,
    submissionDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Submitted', 'Late Submitted'],
        default: 'Submitted'
    }
}, {
    timestamps: true
});

export default mongoose.model('Submission', submissionSchema);
