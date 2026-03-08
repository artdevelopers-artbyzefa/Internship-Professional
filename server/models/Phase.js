import mongoose from 'mongoose';

const phaseSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: [
            'registration',
            'request_submission',
            'hod_approval',
            'agreement_submission',
            'agreement_review',
            'supervisor_assignment',
            'internship_active',
            'evaluation',
            'completion'
        ]
    },
    label: { type: String, required: true },
    description: { type: String },
    icon: { type: String, default: 'fa-circle' },
    order: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed'],
        default: 'pending'
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
}, { timestamps: true });

const Phase = mongoose.model('Phase', phaseSchema);
export default Phase;
