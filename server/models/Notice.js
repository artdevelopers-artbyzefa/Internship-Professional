import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true }
});

const attachmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number }
});

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    links: [linkSchema],
    attachments: [attachmentSchema],
    targetType: {
        type: String,
        enum: ['all_students', 'all_supervisors', 'specific_student', 'specific_supervisor', 'system_landing'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Notice', noticeSchema);
