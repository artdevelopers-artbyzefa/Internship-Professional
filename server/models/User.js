import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         name:
 *           type: string
 *           description: Full legal name of the user
 *         reg:
 *           type: string
 *           description: Registration number (CIIT/FAXX-BYS-XXX/ATD)
 *         semester:
 *           type: string
 *           enum: [1, 2, 3, 4, 5, 6, 7, 8]
 *         email:
 *           type: string
 *           description: Institutional or verified email address
 *         role:
 *           type: string
 *           enum: [student, hod, internship_office, faculty_supervisor, site_supervisor]
 *         status:
 *           type: string
 *           description: Logical state of the user in the system workflow
 *         whatsappNumber:
 *           type: string
 *         profilePicture:
 *           type: string
 *           description: Cloudinary URL for the profile image
 *         assignedFaculty:
 *           type: string
 *           description: MongoDB ID of the assigned faculty supervisor
 *         assignedSiteSupervisor:
 *           type: string
 *           description: MongoDB ID of the assigned site supervisor
 */
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
        sparse: true,
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
                if (this.role === 'student') {
                    return v.endsWith('@cuiatd.edu.pk') || v.endsWith('@gmail.com');
                }
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
            'unverified', 'verified', 
            'Internship Request Submitted', 'Internship Approved', 'Internship Rejected',
            'Agreement Submitted - Self', 'Agreement Submitted - University Assigned',
            'Agreement Approved', 'Agreement Rejected', 'Assigned',
            'Pending Activation', 'Active', 'Inactive',
            'Pass', 'Fail'
        ],
        default: 'verified'
    },

    fatherName: { type: String, trim: true },
    secondaryEmail: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    secondaryEmailVerificationCode: { type: String },
    secondaryEmailVerificationExpires: { type: Date },
    pendingSecondaryEmail: { type: String, trim: true, lowercase: true },
    secondaryEmailOtp: { type: String },
    secondaryEmailOtpExpires: { type: Date },
    section: { type: String, trim: true },
    dateOfBirth: { type: Date },
    profilePicture: { type: String },
    registeredCourse: { type: String, default: 'Internship' },
    activationToken: String,
    activationExpires: Date,

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
        freelancePlatform: String,
        freelanceProfileLink: String,

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

    internshipAgreement: {
        degreeProgram: String,
        semester: String,
        contactNumber: String,
        preferredField: String,

        companyName: String,
        companyAddress: String,
        companyRegNo: String,
        companyScope: String,
        companyHREmail: String,
        companySupervisorName: String,
        companySupervisorEmail: String,
        whatsappNumber: String,
        duration: String,

        officeInternshipRole: String,
        officeFacultySupervisor: String,
        officeSiteSupervisor: String,
        officeStartDate: Date,
        officeEndDate: Date,

        rejectionComments: String,
        submittedAt: Date
    },

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
    certificateUrl: String,
    lastLogin: Date
}, {
    timestamps: true
});

userSchema.index({ role: 1, status: 1 });
userSchema.index({ assignedFaculty: 1 });
userSchema.index({ assignedSiteSupervisor: 1 });
userSchema.index({ name: 'text', email: 'text' });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ 'internshipRequest.submittedAt': 1 });
userSchema.index({ role: 1, status: 1, 'internshipRequest.submittedAt': 1 });
userSchema.index({ assignedCompany: 1 });
userSchema.index({ assignedCompanySupervisorEmail: 1 });

userSchema.pre('save', async function () {
    if (this.role === 'student' && this.email && !this.reg) {
        const rollPart = this.email.split('@')[0].toUpperCase();
        this.reg = `CIIT/${rollPart}/ATD`;
    }
});

const User = mongoose.model('User', userSchema);
export default User;
