import mongoose from 'mongoose';

const archiveSchema = new mongoose.Schema({
    cycleName: { type: String, required: true },
    year:      { type: Number, required: true },

    students: [{
        // ── Identity ──────────────────────────────────────────────────────
        name:  String,
        reg:   String,
        email: String,
        phone: String,

        // ── Internship Details ────────────────────────────────────────────
        grade:      String,
        percentage: Number,
        avgMarks:   Number,
        status:     String,       // DB status at time of archive
        finalStatus: String,      // Pass / Fail / Ineligible / Pending
        company:    String,
        companyAddress: String,
        mode:       String,       // Standard (Physical) | Freelance

        // ── Academic Supervisor ───────────────────────────────────────────
        faculty: {
            name:  String,
            email: String,
            phone: String
        },

        // ── Site Supervisor ───────────────────────────────────────────────
        siteSupervisor: {
            name:  String,
            email: String,
            phone: String
        },

        // ── Submissions (weekly task submissions) ─────────────────────────
        submissions: [{
            weekNumber:  Number,
            taskTitle:   String,
            description: String,
            submittedAt: Date,
            fileUrl:     String
        }],

        // ── Task Marks ────────────────────────────────────────────────────
        marks: [{
            title:                String,
            marks:                Number,
            totalMarks:           Number,
            facultyMarks:         Number,
            siteSupervisorMarks:  Number,
            facultyRemarks:       String,
            siteSupervisorRemarks: String,
            isFacultyGraded:      Boolean,
            gradedAt:             Date
        }],

        // ── Evaluations ───────────────────────────────────────────────────
        evaluations: [{
            title:         String,
            feedback:      String,
            score:         Number,
            submittedAt:   Date,
            evaluatorName: String,
            evaluatorRole: String
        }]
    }],

    // ── Cycle-Level Statistics ────────────────────────────────────────────
    statistics: {
        totalStudents:      Number,
        totalParticipated:  Number,
        totalPassed:        Number,
        totalFailed:        Number,
        totalIneligible:    Number,
        totalPhysical:      Number,
        totalFreelance:     Number,
        averagePercentage:  Number,
        gradeDistribution: {
            A:   Number,
            'A-': Number,
            'B+': Number,
            B:   Number,
            'B-': Number,
            'C+': Number,
            C:   Number,
            'C-': Number,
            'D+': Number,
            D:   Number,
            F:   Number
        }
    },

    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Archive', archiveSchema);
