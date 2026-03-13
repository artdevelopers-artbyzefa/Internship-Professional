import mongoose from 'mongoose';

const archiveSchema = new mongoose.Schema({
    cycleName: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    students: [{
        name: String,
        reg: String,
        email: String,
        grade: String,
        percentage: Number,
        status: String,
        company: String,
        mode: String,
        faculty: String
    }],
    statistics: {
        totalStudents: Number,
        totalPassed: Number,
        totalFailed: Number,
        averagePercentage: Number
    },
    archivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

export default mongoose.model('Archive', archiveSchema);
