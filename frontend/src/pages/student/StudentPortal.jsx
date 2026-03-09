import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import StudentProfile from './StudentProfile.jsx';
import InternshipRequestForm from './InternshipRequestForm.jsx';
import StudentAgreementForm from './StudentAgreementForm.jsx';
import StudentAssignments from './StudentAssignments.jsx';
import StudentResults from './StudentResults.jsx';
import InternshipStatus from './InternshipStatus.jsx';
import { apiRequest } from '../../utils/api.js';

export default function StudentPortal({ user, onLogout, onUpdateUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const status = user.status || 'verified';
  const [activePhase, setActivePhase] = useState(undefined);
  const [isEligible, setIsEligible] = useState(true);
  const [hardCriteriaMet, setHardCriteriaMet] = useState(true); // can the student participate at all?

  useEffect(() => {
    const userId = user.id || user._id;
    Promise.all([
      apiRequest('/phases/current'),
      apiRequest(`/student/eligibility/${userId}`)
    ])
      .then(([phase, eligData]) => {
        setActivePhase(phase);
        setIsEligible(eligData?.eligible ?? true);
        setHardCriteriaMet(eligData?.hardCriteriaMet ?? true);
      })
      .catch(() => setActivePhase(null));
  }, []);

  const isGlobalPhase1 = activePhase?.key === 'registration';
  // Derive from real user data so it reacts when onUpdateUser is called
  const isProfileComplete = !!(user.fatherName && user.section && user.dateOfBirth && user.profilePicture);

  // isPhase1 = student sees the onboarding/dashboard-only view
  // TRUE when: global is in registration, student fails hard criteria, OR profile is not done yet
  const isPhase1 = isGlobalPhase1 || !hardCriteriaMet || !isProfileComplete;

  // pendingSetup = student PASSES hard criteria but just hasn't filled profile yet
  // This is the "welcome, now set up your profile" state
  const isPendingSetup = hardCriteriaMet && !isProfileComplete;

  const currentPath = location.pathname.split('/').pop() || 'dashboard';
  const handlePageChange = (newPageId) => navigate(`/student/${newPageId}`);

  // Navigation routing logic — phase aware
  useEffect(() => {
    if (activePhase === undefined) return; // wait for phase to load
    const isAtBase = location.pathname === '/student' || location.pathname === '/student/';

    // If profile is not complete but hard criteria are met, only allow dashboard + profile
    const restrictedPaths = ['internship-assessment', 'internship-status', 'agreement-form', 'assignments', 'results'];
    if (!isProfileComplete && restrictedPaths.includes(currentPath)) {
      navigate('/student/dashboard', { replace: true });
      return;
    }

    if (!isAtBase) return;

    // Hard-locked (ineligible) or global Phase 1 → always dashboard
    if (isGlobalPhase1 || !hardCriteriaMet) {
      navigate('/student/dashboard', { replace: true });
      return;
    }

    // Profile incomplete but eligible → redirect to profile to finish setup
    if (isPendingSetup) {
      navigate('/student/profile', { replace: true });
      return;
    }

    // No phase active yet — also send to dashboard
    if (!activePhase) {
      navigate('/student/dashboard', { replace: true });
      return;
    }

    // Phase 2+ — follow normal workflow routing (only for eligible)
    if (status === 'verified' || status === 'Internship Request Submitted' || status === 'Internship Rejected') {
      navigate('/student/internship-request', { replace: true });
    } else if (status === 'Internship Approved' || status.includes('Agreement Submitted') || status === 'Agreement Rejected') {
      navigate('/student/agreement-form', { replace: true });
    } else {
      navigate('/student/dashboard', { replace: true });
    }
  }, [activePhase, isPhase1, isPendingSetup, status, location.pathname]);

  const isWorkflowComplete = user.status === 'Agreement Approved' || user.status === 'Assigned';
  const isLocked = !hardCriteriaMet; // True lock = failed semester/CGPA/reg/email — cannot participate

  // Nav: during pending setup, show dashboard + profile to let them complete
  const studentNav = isPhase1
    ? [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-house' },
      // Show profile only if they are eligible by hard criteria (or pending setup)
      ...(hardCriteriaMet ? [{ id: 'profile', label: 'My Profile', icon: 'fa-user-pen', badge: isPendingSetup ? '!' : undefined }] : []),
    ]
    : [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-house' },
      { id: 'internship-assessment', label: 'Internship Assessment', icon: 'fa-clipboard-list', disabled: isLocked },
      { id: 'internship-status', label: 'Internship Status', icon: 'fa-bars-progress', disabled: isLocked },
      { id: 'profile', label: 'My Profile', icon: 'fa-user-pen' },
    ];

  return (
    <AppLayout
      user={user}
      onLogout={onLogout}
      activePage={currentPath}
      setActivePage={handlePageChange}
      navItems={studentNav}
      disableSidebar={isLocked && (isGlobalPhase1 || !hardCriteriaMet)}
    >
      <div className="p-6">
        <Routes>
          {/* Dashboard & Profile — always accessible */}
          <Route path="dashboard" element={<StudentDashboard user={user} isEligible={isEligible} isPhase1={isPhase1} isPendingSetup={isPendingSetup} hardCriteriaMet={hardCriteriaMet} isProfileComplete={isProfileComplete} activePhase={activePhase} />} />
          <Route path="profile" element={<StudentProfile user={user} onUpdate={onUpdateUser} isEligible={isEligible} isPhase1={isPhase1} isPendingSetup={isPendingSetup} activePhase={activePhase} />} />

          {/* Institutional Workflow Routes */}
          <Route path="internship-assessment" element={
            isPhase1 ? <Navigate to="../dashboard" replace /> : <InternshipRequestForm user={user} />
          } />
          <Route path="internship-status" element={
            isPhase1 ? <Navigate to="../dashboard" replace /> : <InternshipStatus user={user} activePhase={activePhase} />
          } />
          <Route path="agreement-form" element={
            isPhase1 ? <Navigate to="../dashboard" replace /> : <StudentAgreementForm user={user} />
          } />

          {/* Backward compatibility for Phase 2 workflow trigger link */}
          <Route path="internship-request" element={<Navigate to="../internship-assessment" replace />} />

          {/* Protected Routes (for later phases) */}
          <Route path="assignments" element={isProfileComplete ? <StudentAssignments user={user} /> : <Navigate to="../dashboard" replace />} />
          <Route path="results" element={isProfileComplete ? <StudentResults user={user} /> : <Navigate to="../dashboard" replace />} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
