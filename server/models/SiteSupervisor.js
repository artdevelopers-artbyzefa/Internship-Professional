import mongoose from 'mongoose';
import { normalizeEntityName } from '../utils/normalization.js';

const siteSupervisorSchema = new mongoose.Schema({
    display_name: { type: String, required: true, trim: true },
    normalized_key: { type: String, unique: true },
    email: { type: String, lowercase: true, trim: true },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' } // optional link
}, { timestamps: true });

siteSupervisorSchema.pre('save', function (next) {
    if (this.isModified('display_name') && !this.normalized_key) {
        this.normalized_key = normalizeEntityName(this.display_name);
    }
    next();
});

const SiteSupervisor = mongoose.model('SiteSupervisor', siteSupervisorSchema);
export default SiteSupervisor;
