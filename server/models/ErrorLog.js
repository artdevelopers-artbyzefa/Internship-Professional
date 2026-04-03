import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema({
    message: { type: String, required: true },
    stack_trace: { type: String },
    route: { type: String },
    method: { type: String },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    request_body: { type: mongoose.Schema.Types.Mixed },
    error_type: { type: String, default: 'server', index: true },
    status_code: { type: Number },
    status: { type: String, enum: ['unresolved', 'resolved'], default: 'unresolved', index: true },
    created_at: { type: Date, default: Date.now, index: true }
}, {
    timestamps: true
});

// Optimization: Indexing common filter fields
errorLogSchema.index({ created_at: -1 });

const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);
export default ErrorLog;
