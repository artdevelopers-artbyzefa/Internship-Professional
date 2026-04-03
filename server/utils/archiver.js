/**
 * @fileoverview Archiver Utility for Internship Management System.
 * This module manages the aggregation and processing of internship data 
 * to create comprehensive snapshots for institutional records and HOD reporting.
 * It calculates final grades, student eligibility, and supervisor performance metrics.
 */

import User from '../models/User.js';
import Mark from '../models/Mark.js';
import Submission from '../models/Submission.js';
import Evaluation from '../models/Evaluation.js';
import Assignment from '../models/Assignment.js';
import Company from '../models/Company.js';
import Phase from '../models/Phase.js';

/**
 * Generates a high-fidelity snapshot of the current internship cycle.
 * Performs deep aggregation across multiple schemas (Students, Marks, Submissions, 
 * Evaluations, Phases, etc.) and computes performance analytics.
 * 
 * @returns {Promise<Object>} A comprehensive archive object containing:
 * - cycleName: Formatted name of the internship cycle
 * - statistics: Aggregate counts and distributions (Pass/Fail, Ineligibility breakdown, Mode)
 * - students: Processed list of students with computed grades and mapped data
 * - rawSnapshot: Complete entities for forensic audit purposes
 */
export const getArchiveSnapshot = async () => {
    // Fetch all core data in parallel for performance optimization
    const [
        allStudents, 
        allSiteSupervisors, 
        allFaculty, 
        allCompanies, 
        allAssignments, 
        allMarks, 
        allSubmissions, 
        allEvaluations, 
        allPhases
    ] = await Promise.all([
        User.find({ role: 'student' }).populate('assignedFaculty assignedSiteSupervisor').lean(),
        User.find({ role: 'site_supervisor' }).lean(),
        User.find({ role: 'faculty_supervisor' }).lean(),
        Company.find({}).lean(),
        Assignment.find({}).sort({ weekNumber: 1 }).lean(),
        Mark.find({}).populate('assignment').lean(),
        Submission.find({}).populate('assignment').lean(),
        Evaluation.find({}).populate('evaluator').lean(),
        Phase.find({}).sort({ order: 1 }).lean()
    ]);

    const archiveData = [];
    
    // Process each student to compute performance and map relationships
    for (const s of allStudents) {
        const marksEntries = allMarks.filter(m => m.student?.toString() === s._id.toString());
        const studentSubmissions = allSubmissions.filter(sub => sub.student?.toString() === s._id.toString());
        const studentEvaluations = allEvaluations.filter(e => e.student?.toString() === s._id.toString());

        let avg = 0, pct = 0, grade = 'F';
        const gradedMarks = marksEntries.filter(m => m.isFacultyGraded);

        if (gradedMarks.length > 0) {
            // Determine if student is freelance or has site supervisor for grading logic
            const isFreelance = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
            
            const taskScores = gradedMarks.map(m => {
                const f = m.facultyMarks || 0;
                const ss = m.siteSupervisorMarks || 0;
                // Freelance only uses faculty marks, otherwise average of both
                return isFreelance ? f : (f + ss) / 2;
            });

            avg = taskScores.reduce((sum, v) => sum + v, 0) / taskScores.length;
            pct = Math.round((avg / 10) * 100);

            // Grade assignment based on standard academic thresholds
            if (pct >= 85) grade = 'A';
            else if (pct >= 80) grade = 'A-';
            else if (pct >= 75) grade = 'B+';
            else if (pct >= 71) grade = 'B';
            else if (pct >= 68) grade = 'B-';
            else if (pct >= 64) grade = 'C+';
            else if (pct >= 61) grade = 'C';
            else if (pct >= 58) grade = 'C-';
            else if (pct >= 54) grade = 'D+';
            else if (pct >= 50) grade = 'D';
        }

        const didParticipate = gradedMarks.length > 0 || studentSubmissions.length > 0;
        const isIneligible = !didParticipate && !['Assigned', 'Internship Approved', 'Agreement Approved'].includes(s.status);

        let finalStatus;
        if (isIneligible) finalStatus = 'Ineligible';
        else if (!didParticipate) finalStatus = 'No Submissions';
        else if (gradedMarks.length === 0) finalStatus = 'Pending Grading';
        else if (pct >= 50) finalStatus = 'Pass';
        else finalStatus = 'Fail';

        // Map site supervisor details, handling both assigned and request-level details
        const siteSup = s.assignedSiteSupervisor ? { 
            name: s.assignedSiteSupervisor.name || 'N/A', 
            email: s.assignedSiteSupervisor.email || 'N/A', 
            phone: s.assignedSiteSupervisor.whatsappNumber || 'N/A' 
        } : { 
            name: s.internshipRequest?.siteSupervisorName || s.assignedCompanySupervisor || 'N/A', 
            email: s.internshipRequest?.siteSupervisorEmail || s.assignedCompanySupervisorEmail || 'N/A', 
            phone: s.internshipRequest?.siteSupervisorPhone || 'N/A' 
        };

        archiveData.push({
            name: s.name, 
            reg: s.reg, 
            email: s.email, 
            phone: s.whatsappNumber || s.internshipAgreement?.whatsappNumber || 'N/A',
            grade, 
            percentage: pct, 
            avgMarks: Math.round(avg * 100) / 100, 
            status: s.status, 
            finalStatus, 
            company: s.assignedCompany || s.internshipRequest?.companyName || s.internshipAgreement?.companyName || 'N/A', 
            companyAddress: s.internshipAgreement?.companyAddress || 'N/A', 
            mode: s.internshipRequest?.mode || 'N/A',
            faculty: { 
                name: s.assignedFaculty?.name || 'N/A', 
                email: s.assignedFaculty?.email || 'N/A', 
                phone: s.assignedFaculty?.whatsappNumber || 'N/A' 
            },
            siteSupervisor: siteSup,
            submissions: studentSubmissions.map(sub => ({ 
                weekNumber: sub.assignment?.weekNumber || null, 
                taskTitle: sub.assignment?.title || 'Unknown Task', 
                submittedAt: sub.submissionDate || sub.createdAt, 
                fileUrl: sub.fileUrl || null, 
                status: sub.status 
            })),
            marks: marksEntries.map(m => ({ 
                title: m.assignment?.title || 'Unknown Assignment', 
                totalMarks: m.assignment?.totalMarks || 10, 
                marks: m.marks, 
                facultyMarks: m.facultyMarks, 
                siteSupervisorMarks: m.siteSupervisorMarks, 
                facultyRemarks: m.facultyRemarks, 
                siteSupervisorRemarks: m.siteSupervisorRemarks, 
                isFacultyGraded: m.isFacultyGraded, 
                gradedAt: m.updatedAt 
            })),
            evaluations: studentEvaluations.map(e => ({ 
                title: e.title || 'General Evaluation', 
                feedback: e.feedback, 
                score: e.score, 
                submittedAt: e.submittedAt || e.createdAt, 
                evaluatorName: e.evaluator?.name || 'Supervisor', 
                evaluatorRole: e.evaluator?.role || 'Unknown' 
            }))
        });
    }

    // Global Statistics Calculation
    const participated = archiveData.filter(a => a.finalStatus !== 'Ineligible' && a.finalStatus !== 'No Submissions');
    const passedCount = archiveData.filter(a => a.finalStatus === 'Pass').length;
    const failedCount = archiveData.filter(a => a.finalStatus === 'Fail').length;
    const pcts = participated.map(a => a.percentage);
    const avgPct = pcts.length > 0 ? Math.round(pcts.reduce((sum, v) => sum + v, 0) / pcts.length * 10) / 10 : 0;
    const gradeDistribution = { A: 0, 'A-': 0, 'B+': 0, B: 0, 'B-': 0, 'C+': 0, C: 0, 'C-': 0, 'D+': 0, D: 0, F: 0 };
    archiveData.forEach(a => { if (gradeDistribution.hasOwnProperty(a.grade)) gradeDistribution[a.grade]++; });

    // Ineligibility Breakdown logic
    const ineligibility = {
        lowCGPA: allStudents.filter(s => s.status === 'Ineligible' && (s.ineligibleReason?.toLowerCase().includes('cgpa') || s.cgpa < 2.0)).length,
        lateRegistration: allStudents.filter(s => s.status === 'Ineligible' && (s.ineligibleReason?.toLowerCase().includes('late') || s.ineligibleReason?.toLowerCase().includes('time'))).length,
        other: allStudents.filter(s => s.status === 'Ineligible' && !s.ineligibleReason?.toLowerCase().includes('cgpa') && !s.ineligibleReason?.toLowerCase().includes('late')).length
    };

    // Process Site Supervisor Performance Matrix
    const siteSupervisorMatrix = allSiteSupervisors.map(ss => {
        const interns = archiveData.filter(a => a.siteSupervisor?.email === ss.email);
        const gradedTasks = allMarks.filter(m => m.siteSupervisorId?.toString() === ss._id.toString() && m.isSiteSupervisorGraded).length;
        const totalMarksGiven = allMarks
            .filter(m => m.siteSupervisorId?.toString() === ss._id.toString() && m.isSiteSupervisorGraded)
            .reduce((sum, m) => sum + (m.siteSupervisorMarks || 0), 0);
        
        return {
            ...ss,
            internCount: interns.length,
            tasksGraded: gradedTasks,
            avgScoreGiven: gradedTasks > 0 ? (totalMarksGiven / gradedTasks).toFixed(2) : 0,
            performanceStatus: gradedTasks > (interns.length * 2) ? 'Exemplary' : gradedTasks > 0 ? 'Standard' : 'Pending'
        };
    });

    return {
        cycleName: `Internship Cycle — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
        year: new Date().getFullYear(),
        students: archiveData,
        phases: allPhases,
        statistics: { 
            totalStudents: archiveData.length, 
            totalParticipated: participated.length, 
            totalPassed: passedCount, 
            totalFailed: failedCount, 
            totalIneligible: archiveData.length - participated.length, 
            ineligibilityBreakdown: ineligibility,
            totalPhysical: participated.filter(a => a.mode !== 'Freelance').length, 
            totalFreelance: participated.filter(a => a.mode === 'Freelance').length, 
            averagePercentage: avgPct, 
            gradeDistribution 
        },
        rawSnapshot: { 
            metadata: { archivedAt: new Date(), version: '3.0-High-Fidelity' },
            entities: { 
                students: allStudents, 
                faculty: allFaculty,
                siteSupervisors: siteSupervisorMatrix, 
                companies: allCompanies, 
                assignments: allAssignments, 
                marks: allMarks, 
                submissions: allSubmissions, 
                evaluations: allEvaluations,
                phases: allPhases
            }
        }
    };
};

