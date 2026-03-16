import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    reg: {
        type: String,
        required: function () { return this.role === 'student'; },
        unique: true,
        sparse: true, // Allows multiple null/missing values for non-students
        trim: true
    },
    semester: {
        type: String,
        enum: ['1', '2', '3', '4', '5', '6', '7', '8'],
        required: function () { return this.role === 'student'; }
    },
    cgpa: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Institutional email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (v) {
                // Students MUST use the institutional domain (@cuiatd.edu.pk)
                // We also allow @gmail.com for development/external test accounts
                if (this.role === 'student') {
                    return v.endsWith('@cuiatd.edu.pk') || v.endsWith('@gmail.com');
                }
                // Faculty and Staff can use any valid email
                return true;
            },
            message: props => `${props.value} is not a valid email domain for students! Must be @cuiatd.edu.pk`
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    role: {
        type: String,
        enum: ['student', 'hod', 'internship_office', 'faculty_supervisor', 'site_supervisor'],
        default: 'student'
    },
    whatsappNumber: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: [
            'unverified', 'verified', // Student Initial
            'Internship Request Submitted', 'Internship Approved', 'Internship Rejected',
            'Agreement Submitted - Self', 'Agreement Submitted - University Assigned',
            'Agreement Approved', 'Agreement Rejected', 'Assigned', // Student Final
            'Pending Activation', 'Active', 'Inactive', // Faculty / Staff
            'Pass', 'Fail'
        ],
        default: 'unverified'
    },

    // NEW: Student Profile Specific Mandatory Fields
    fatherName: { type: String, trim: true },
    secondaryEmail: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    secondaryEmailVerificationCode: { type: String },
    secondaryEmailVerificationExpires: { type: Date },
    pendingSecondaryEmail: { type: String, trim: true, lowercase: true },
    secondaryEmailOtp: { type: String },
    secondaryEmailOtpExpires: { type: Date },
    section: { type: String, trim: true },
    dateOfBirth: { type: Date },
    profilePicture: { type: String }, // URL or Base64
    registeredCourse: { type: String, default: 'Internship' },
    activationToken: String,
    activationExpires: Date,

    // Internship Approval Form Data
    internshipRequest: {
        type: {
            type: String,
            enum: ['Self', 'University Assigned']
        },
        companyName: String,
        siteSupervisorName: String,
        siteSupervisorEmail: String,
        siteSupervisorPhone: String,
        duration: String,
        startDate: Date,
        endDate: Date,
        mode: {
            type: String,
            enum: ['Onsite', 'Remote', 'Hybrid', 'Freelance']
        },
        description: String,
        freelancePlatform: String,       // e.g. 'Fiverr', 'Upwork', 'Freelancer', 'Other'
        freelanceProfileLink: String,    // URL to the student's freelancing profile

        // Faculty Supervisor Selection Block
        facultyType: {
            type: String,
            enum: ['Registered', 'Identify New'],
            default: 'Registered'
        },
        selectedFacultyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        newFacultyDetails: {
            name: String,
            email: String,
            department: String
        },
        facultyStatus: {
            type: String,
            enum: ['Pending', 'Accepted', 'Rejected'],
            default: 'Pending'
        },

        rejectionReason: String,
        submittedAt: Date
    },

    // Student Agreement Form Data
    internshipAgreement: {
        // Student Part
        degreeProgram: String,
        semester: String,
        contactNumber: String,
        preferredField: String,

        // Placement Part
        companyName: String,
        companyAddress: String, // only for self
        companyRegNo: String,   // only for self
        companyScope: String,   // only for self (Field/Domain)
        companyHREmail: String, // only for self
        companySupervisorName: String, // only for self
        companySupervisorEmail: String, // only for self
        whatsappNumber: String,
        duration: String,

        // Office Only Fields (filled after assignment)
        officeInternshipRole: String,
        officeFacultySupervisor: String,
        officeSiteSupervisor: String,
        officeStartDate: Date,
        officeEndDate: Date,

        rejectionComments: String,
        submittedAt: Date
    },

    // Assignment Data
    assignedFaculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedSiteSupervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedCompany: String,
    assignedCompanySupervisor: String,
    assignedCompanySupervisorEmail: { type: String, lowercase: true, trim: true },

    emailVerificationToken: { type: String, index: true },
    emailVerificationExpires: Date,
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date },
    mustChangePassword: { type: Boolean, default: false },
    lastLogin: Date
}, {
    timestamps: true
});

// Extreme Performance Indexes for high-traffic queries
userSchema.index({ role: 1, status: 1 });
userSchema.index({ assignedFaculty: 1 });
userSchema.index({ assignedSiteSupervisor: 1 });
userSchema.index({ name: 'text', email: 'text' }); // Search optimization
userSchema.index({ role: 1, createdAt: -1 }); // Registry sorting optimization

// Auto-extract and Enforce Roll Number from Email for Students (only if not manually provided)
userSchema.pre('save', async function () {
    if (this.role === 'student' && this.email && !this.reg) {
        const rollPart = this.email.split('@')[0].toUpperCase();
        this.reg = `CIIT/${rollPart}/ATD`;
    }
});

const User = mongoose.model('User', userSchema);
export default User;
