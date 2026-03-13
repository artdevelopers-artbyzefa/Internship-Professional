import mongoose from 'mongoose';

const phaseSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: [
            'registration',
            'placement_process',
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
    // Scheduling
    scheduledStartAt: { type: Date },   // When the phase is set to auto-begin
    scheduledEndAt: { type: Date },   // When the phase is set to auto-end
    durationDays: { type: Number }, // Expected duration in days (informational)
    // Actual timestamps (set when manually or auto-triggered)
    startedAt: { type: Date },
    completedAt: { type: Date },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
}, { timestamps: true });

const Phase = mongoose.model('Phase', phaseSchema);
export default Phase;
