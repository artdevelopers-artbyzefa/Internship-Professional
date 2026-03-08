import React from 'react';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import Phase1EligibilityBanner from '../../components/student/Phase1EligibilityBanner.jsx';
import { apiRequest } from '../../utils/api.js';

export default function StudentDashboard({ user, isEligible, isPhase1, activePhase }) {
  const [showAlert, setShowAlert] = React.useState(true);
  const isProfileComplete = user.fatherName && user.section && user.dateOfBirth && user.profilePicture;

  // Authority Progression Counter: The primary driver for dashboard projection
  const phaseOrder = activePhase?.order || 1;
  const isLocked = phaseOrder === 1 && !isEligible;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const extractProgram = (reg) => {
    if (!reg) return 'N/A';
    const parts = reg.split('-');
    if (parts.length >= 2) return parts[1];
    return 'N/A';
  };

  const InfoItem = ({ label, value, grow = 0 }) => (
    <div className={`p-4 border-b border-r last:border-r-0 flex flex-col justify-center min-h-[70px] ${grow ? 'md:col-span-2' : ''}`}>
      <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] leading-none mb-2 uppercase">{label}</span>
      <span className="font-black text-gray-800 truncate tracking-tight">{value || 'NOT SET'}</span>
    </div>
  );

  const ProfileTable = () => (
    <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm text-[13px] mb-8">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-48 bg-gray-50/50 flex items-center justify-center p-6 border-r-2 border-gray-100">
          <div className="w-32 h-32 rounded-[2rem] bg-white border-4 border-white shadow-xl overflow-hidden flex items-center justify-center group relative ring-1 ring-gray-100">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <i className="fas fa-user text-5xl text-gray-200"></i>
            )}
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4">
          <InfoItem label="Full Name" value={user.name} grow={1} />
          <InfoItem label="Registration No" value={user.reg} />
          <InfoItem label="Father Name" value={user.fatherName} />
          <InfoItem label="Program" value={extractProgram(user.reg)} />
          <InfoItem label="Section" value={user.section} />
          <InfoItem label="DOB" value={formatDate(user.dateOfBirth)} />
          <InfoItem label="Institutional Email" value={user.email} grow={1} />
          {user.secondaryEmail && (
            <InfoItem
              label="Secondary Email"
              value={
                <span className="flex items-center gap-2">
                  <span className="truncate">{user.secondaryEmail}</span>
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0">Linked</span>
                </span>
              }
              grow={1}
            />
          )}
          <InfoItem
            label="Faculty Supervisor"
            value={
              user.assignedFaculty?.name ||
              (user.internshipRequest?.facultyStatus === 'Pending' ? 'Pending Approval' :
                user.internshipRequest?.facultyStatus === 'Rejected' ? 'Rejected - Reassign Needed' : 'Not Assigned')
            }
            grow={1}
          />
        </div>
      </div>
    </div>
  );

  // ── PHASE 1: REGISTRATION & ELIGIBILITY DESIGN ──
  const Phase1Dashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 p-8 bg-gradient-to-br from-white to-blue-50/30 rounded-[2.5rem] border-2 border-blue-100 shadow-xl shadow-blue-50/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">Phase 1</span>
            <span className="text-sm font-bold text-primary">Self-Registration & Verification</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-3">Welcome to DIMS Portal</h2>
          <p className="text-gray-500 font-medium max-w-xl">
            You are currently in the initial onboarding phase. Ensure your institutional profile is accurate to maintain eligibility for the internship cycle.
          </p>
        </div>
      </div>

      <Phase1EligibilityBanner user={user} />

      {(!isProfileComplete && showAlert && !isLocked) && (
        <Alert type="warning" className="mb-8 rounded-[1.5rem] border-2 shadow-lg" onClose={() => setShowAlert(false)}>
          <div className="flex items-center gap-4 py-1">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
              <i className="fas fa-user-pen"></i>
            </div>
            <p className="font-bold text-amber-900">
              Institutional Profile Incomplete: <span className="font-medium text-amber-700">Please provide your Father's Name, Section, and DOB in the Profile section to unlock Phase 2.</span>
            </p>
          </div>
        </Alert>
      )}

      {!isLocked && <ProfileTable />}
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
          <h3 className="text-2xl font-black text-gray-800 tracking-tight mb-2">Internship Phase 2</h3>
          <p className="text-gray-500 text-sm font-medium max-w-md leading-relaxed">
            The internship cycle is now open. Complete the steps below to submit and finalize your placement.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Phase</p>
          <p className="text-xl font-black text-primary tracking-tight">{activePhase?.label || 'In Progress'}</p>
          <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${(phaseOrder / 9) * 100}%` }}></div>
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

      {!isLocked && <ProfileTable />}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-2">
      <NoticeModal />

      {/* Dynamic Phase Router (Counter Based) */}
      {phaseOrder === 1 ? <Phase1Dashboard /> : <Phase2PlusDashboard />}
    </div>
  );
}
