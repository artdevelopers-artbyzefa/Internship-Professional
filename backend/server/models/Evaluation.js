import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    siteSupervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    source: {
        type: String,
        enum: ['faculty', 'site_supervisor'],
        required: true
    },
    marks: {
        technical: { type: Number, default: 0 },
        professional: { type: Number, default: 0 },
        reports: { type: Number, default: 0 },
        presentation: { type: Number, default: 0 }
    },
    totalMarks: { type: Number, default: 0 },
    maxTotal: { type: Number, default: 150 },
    status: {
        type: String,
        enum: ['Draft', 'Submitted', 'Approved'],
        default: 'Draft'
    },
    comments: String,
    submittedAt: Date,
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Evaluation = mongoose.model('Evaluation', evaluationSchema);
export default Evaluation;
