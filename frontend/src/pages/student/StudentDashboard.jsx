import React from 'react';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import Phase1EligibilityBanner from '../../components/student/Phase1EligibilityBanner.jsx';
import { apiRequest } from '../../utils/api.js';

export default function StudentDashboard({ user, isEligible, isPhase1, isPendingSetup, hardCriteriaMet, isProfileComplete: isProfileCompleteProp, activePhase }) {
  const [showAlert, setShowAlert] = React.useState(true);
  const isProfileComplete = isProfileCompleteProp ?? !!(user.fatherName && user.section && user.dateOfBirth && user.profilePicture);

  // Authority Progression Counter: The primary driver for dashboard projection
  const phaseOrder = activePhase?.order || 1;
  const isLocked = !hardCriteriaMet; // True lock = failed CGPA/semester/etc.

  // Helpers and ProfileTable moved to StudentProfileCard and handled at Portal level

  // ── PHASE 1: REGISTRATION & ELIGIBILITY DESIGN ──
  const Phase1Dashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 p-8 bg-gradient-to-br from-white to-blue-50/30 rounded-[2.5rem] border-2 border-blue-100 shadow-xl shadow-blue-50/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">Phase 1</span>
            <span className="text-sm font-bold text-primary">Self-Registration &amp; Verification</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-3">Welcome to DIMS Portal</h2>
          <p className="text-gray-500 font-medium max-w-xl">
            You are currently in the initial onboarding phase. Ensure your institutional profile is accurate to maintain eligibility for the internship cycle.
          </p>
        </div>
      </div>

      <Phase1EligibilityBanner user={user} />

      {/* Pending Setup State: eligible but profile not filled */}
      {isPendingSetup && (
        <div className="mt-8 p-8 bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-[2.5rem] border-2 border-amber-200 shadow-xl shadow-amber-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center text-white text-2xl shadow-lg shadow-amber-200 flex-shrink-0">
              <i className="fas fa-id-card-clip"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-600 tracking-widest uppercase mb-1">Action Required — Profile Setup</p>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Complete Your Profile to Continue</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                Great news — you meet all academic eligibility criteria! Complete your personal profile (Father&apos;s Name, Section, DOB &amp; Profile Picture) to unlock the internship workflow.
              </p>
            </div>
          </div>
          <a href="/student/profile" className="flex-shrink-0">
            <button className="font-black text-xs px-8 py-4 rounded-2xl bg-amber-500 text-white shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all active:scale-95 border-0 cursor-pointer uppercase tracking-widest whitespace-nowrap">
              Complete Profile Now <i className="fas fa-arrow-right ml-2 text-[10px]"></i>
            </button>
          </a>
        </div>
      )}

      {(!isProfileComplete && showAlert && !isLocked && !isPendingSetup) && (
        <Alert type="warning" className="mb-8 rounded-[1.5rem] border-2 shadow-lg mt-8" onClose={() => setShowAlert(false)}>
          <div className="flex items-center gap-4 py-1">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
              <i className="fas fa-user-pen"></i>
            </div>
            <p className="font-bold text-amber-900">
              Institutional Profile Incomplete: <span className="font-medium text-amber-700">Please provide your Father&apos;s Name, Section, and DOB in the Profile section to unlock Phase 2.</span>
            </p>
          </div>
        </Alert>
      )}

      {/* ProfileTable moved to main return */}
    </div>
  );

  // Decision logic for Phase 2+ progress
  const facultyRejected = user.internshipRequest?.facultyStatus === 'Rejected';
  const isOfficiallyAssigned = user.status === 'Assigned' || (user.assignedCompany && user.assignedFaculty && user.assignedCompanySupervisor);
  // Check if request is in a final state that doesn't NEED a new submission (but can still be viewed)
  const isRequestInLog = (user.status === 'Internship Request Submitted' || user.status === 'Internship Approved' || user.status.includes('Agreement') || user.status === 'Assigned') && !facultyRejected;

  // ── PHASE 2+: WORKFLOW & ONBOARDING DESIGN ──
  const Phase2PlusDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-8 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Internship Cycle Active</span>
          </div>
          <h3 className="text-2xl font-black text-gray-800 tracking-tight mb-2">
            {activePhase?.order <= 2 ? 'Placement & Onboarding' : 'Academic Execution'}
          </h3>
          <p className="text-gray-500 text-sm font-medium max-w-md leading-relaxed">
            The internship cycle is now open. Complete the steps below to submit and finalize your placement.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Phase</p>
          <p className="text-xl font-black text-primary tracking-tight">{activePhase?.label || 'In Progress'}</p>
          <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${(phaseOrder / 5) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {facultyRejected && showAlert && (
        <Alert type="danger" className="mb-8 rounded-[1.5rem] border-2 shadow-lg" onClose={() => setShowAlert(false)}>
          <div className="flex items-center gap-4 py-1">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 flex-shrink-0">
              <i className="fas fa-user-xmark"></i>
            </div>
            <div>
              <p className="font-black text-rose-900 uppercase text-[10px] tracking-widest">Supervision Rejected</p>
              <p className="font-bold text-rose-700 text-sm italic">
                The requested Faculty Supervisor has declined your request. You must select a different supervisor to proceed.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Dynamic Workflow Trigger Card */}
      {!isLocked && (
        <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col md:flex-row md:items-center justify-between gap-8 transition-all shadow-xl mb-8 ${isRequestInLog ? 'bg-emerald-50/50 border-emerald-100 shadow-emerald-50/50' : 'bg-primary/5 border-primary/10 shadow-primary/5'}`}>
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl shadow-2xl ${isRequestInLog ? 'bg-emerald-500 rotate-3' : 'bg-primary -rotate-3'}`}>
              <i className={`fas ${isRequestInLog ? 'fa-clipboard-check' : 'fa-rocket'}`}></i>
            </div>
            <div>
              <h4 className="text-2xl font-black text-gray-800 tracking-tight">
                {isOfficiallyAssigned ? 'Final Placement Confirmed' : isRequestInLog ? (user.status === 'Internship Approved' ? 'Internship Approved' : 'Application Transmitted') : facultyRejected ? 'Reassignment Required' : 'Initialize Workflow'}
              </h4>
              <p className="text-sm text-gray-500 font-medium mt-1 max-w-sm">
                {isOfficiallyAssigned
                  ? 'Your placement has been officially locked and confirmed by the Internship Office. Enrollment is complete.'
                  : isRequestInLog
                    ? user.status === 'Internship Approved'
                      ? 'Congratulations! Your placement has been approved. You can still view or update your request if needed.'
                      : 'Your AppEx-A request is currently under departmental review. You can view or refine your details.'
                    : facultyRejected
                      ? 'Your supervision request was rejected. Please resubmit your form with an available faculty member.'
                      : 'The mandatory Internship Request (AppEx-A) module is now active. Submit your preferences immediately.'}
              </p>
            </div>
          </div>

          <a href="/student/internship-assessment" className="flex-shrink-0">
            <button className={`font-black text-xs px-10 py-5 rounded-2xl shadow-xl transition-all active:scale-95 border-0 cursor-pointer uppercase tracking-widest ${facultyRejected ? 'bg-rose-500 text-white shadow-rose-200' : isOfficiallyAssigned ? 'bg-primary text-white shadow-primary/20' : isRequestInLog ? 'bg-white border border-emerald-200 text-emerald-600 shadow-emerald-50' : 'bg-primary text-white shadow-primary/20'}`}>
              {isOfficiallyAssigned ? 'View Official Details' : isRequestInLog ? 'View/Edit Request' : facultyRejected ? 'Edit Request' : 'Start Assessment'} <i className={`fas ${isOfficiallyAssigned ? 'fa-certificate' : 'fa-arrow-right'} ml-2 text-[10px]`}></i>
            </button>
          </a>
        </div>
      )}

      {/* ── Phase 3: Internship Commences (Assignment Submissions) ── */}
      {(!isLocked && phaseOrder >= 3) && (
        <div className="p-8 rounded-[2.5rem] border-2 bg-gradient-to-br from-indigo-50 to-blue-50/30 border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-8 transition-all shadow-xl shadow-indigo-50/50 mb-8 animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-3xl shadow-2xl shadow-indigo-200 rotate-2">
              <i className="fas fa-file-arrow-up"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 tracking-widest uppercase mb-1">Phase 3 — Internship Commences</p>
              <h4 className="text-2xl font-black text-gray-800 tracking-tight">Assignment Submissions</h4>
              <p className="text-sm text-gray-500 font-medium mt-1 max-w-sm">
                The technical phase has begun. Submit your monthly reports, task logs, and final evaluation files for faculty review.
              </p>
            </div>
          </div>

          <a href="/student/assignments" className="flex-shrink-0">
            <button className="font-black text-xs px-10 py-5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 border-0 cursor-pointer uppercase tracking-widest">
              Go to Assignments <i className="fas fa-arrow-right ml-2 text-[10px]"></i>
            </button>
          </a>
        </div>
      )}

      {/* ── PHASE 4: EVALUATION & RESULTS ── */}
      {(!isLocked && phaseOrder >= 4) && (
        <div className="p-8 rounded-[2.5rem] border-2 bg-gradient-to-br from-emerald-50 to-teal-50/30 border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-8 transition-all shadow-xl shadow-emerald-50/50 mb-8 animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center text-white text-3xl shadow-2xl shadow-emerald-200 -rotate-2">
              <i className="fas fa-award"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-500 tracking-widest uppercase mb-1">Phase 4 — Results &amp; Completion</p>
              <h4 className="text-2xl font-black text-gray-800 tracking-tight">Final Academic Results</h4>
              <p className="text-sm text-gray-500 font-medium mt-1 max-w-sm">
                Your internship evaluations have been finalized. View your performance transcript and aggregate marks.
              </p>
            </div>
          </div>

          <a href="/student/results" className="flex-shrink-0">
            <button className="font-black text-xs px-10 py-5 rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95 border-0 cursor-pointer uppercase tracking-widest">
              View My Results <i className="fas fa-certificate ml-2 text-[10px]"></i>
            </button>
          </a>
        </div>
      )}

      {/* ProfileTable moved to main return */}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-2">
      <NoticeModal />

      {/* Dynamic Phase Router (Prop Based) — prioritizes personal onboarding */}
      {isPhase1 ? <Phase1Dashboard /> : <Phase2PlusDashboard />}
    </div>
  );
}
