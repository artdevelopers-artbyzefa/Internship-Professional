import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import StudentProfile from './StudentProfile.jsx';
import InternshipRequestForm from './InternshipRequestForm.jsx';
import StudentAgreementForm from './StudentAgreementForm.jsx';
import StudentAssignments from './StudentAssignments.jsx';
import StudentResults from './StudentResults.jsx';
import { apiRequest } from '../../utils/api.js';

export default function StudentPortal({ user, onLogout, onUpdateUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const status = user.status || 'verified';

  const [activePhase, setActivePhase] = useState(undefined);
  const [isEligible, setIsEligible] = useState(true); // default allow until loaded

  useEffect(() => {
    const userId = user.id || user._id;
    Promise.all([
      apiRequest('/phases/current'),
      apiRequest(`/student/eligibility/${userId}`)
    ])
      .then(([phase, eligData]) => {
        setActivePhase(phase);
        setIsEligible(eligData?.eligible ?? true);
      })
      .catch(() => setActivePhase(null));
  }, []);

  // Phase 1 = Student Registration — students only see the dashboard
  const isPhase1 = activePhase?.key === 'registration';
  // Phase 2+ starts (request_submission) — unlock the workflow
  const canSubmitRequest = activePhase?.key === 'request_submission' ||
    (activePhase && activePhase.order >= 2);

  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const handlePageChange = (newPageId) => navigate(`/student/${newPageId}`);

  // Navigation routing logic — phase aware
  useEffect(() => {
    if (activePhase === undefined) return; // wait for phase to load
    const isAtBase = location.pathname === '/student' || location.pathname === '/student/';

    if (!isAtBase) return;

    // During Phase 1: everyone goes to dashboard regardless of their status
    if (isPhase1) {
      navigate('/student/dashboard', { replace: true });
      return;
    }

    // No phase active yet — also send to dashboard
    if (!activePhase) {
      navigate('/student/dashboard', { replace: true });
      return;
    }

    // Phase 2+ — follow normal workflow routing
    if (status === 'verified' || status === 'Internship Request Submitted' || status === 'Internship Rejected') {
      navigate('/student/internship-request', { replace: true });
    } else if (status === 'Internship Approved' || status.includes('Agreement Submitted') || status === 'Agreement Rejected') {
      navigate('/student/agreement-form', { replace: true });
    } else {
      navigate('/student/dashboard', { replace: true });
    }
  }, [activePhase, status, location.pathname]);

  const isWorkflowComplete = user.status === 'Agreement Approved' || user.status === 'Assigned';
  const isProfileComplete = user.fatherName && user.section && user.dateOfBirth && user.profilePicture;

  const isLocked = isPhase1 && !isEligible;

  // During Phase 1: sidebar shows only Dashboard (and Profile if eligible)
  const studentNav = isPhase1
    ? [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-house' },
      ...(isLocked ? [] : [{ id: 'profile', label: 'My Profile', icon: 'fa-user-pen' }]),
    ]
    : isWorkflowComplete
      ? [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-house' },
        { id: 'profile', label: 'My Profile', icon: 'fa-user-pen' },
        { id: 'assignments', label: 'Assignments', icon: 'fa-cloud-arrow-up', disabled: !isProfileComplete },
        { id: 'results', label: 'Result', icon: 'fa-chart-column', disabled: !isProfileComplete },
      ]
      : [
        {
          id: (status.includes('Internship') || status === 'verified') ? 'internship-request' : 'agreement-form',
          label: 'Workflow Step', icon: 'fa-lock'
        }
      ];

  return (
    <AppLayout
      user={user}
      onLogout={onLogout}
      activePage={currentPath}
      setActivePage={handlePageChange}
      navItems={studentNav}
      disableSidebar={!isWorkflowComplete && !isPhase1}
    >
      <div className="p-6">
        <Routes>
          {/* Dashboard & Profile — always accessible */}
          <Route path="dashboard" element={<StudentDashboard user={user} isEligible={isEligible} isPhase1={isPhase1} />} />
          <Route path="profile" element={<StudentProfile user={user} onUpdate={onUpdateUser} isEligible={isEligible} isPhase1={isPhase1} />} />

          {/* Workflow Routes — blocked during Phase 1 */}
          <Route path="internship-request" element={
            isPhase1 ? <Navigate to="../dashboard" replace /> : <InternshipRequestForm user={user} />
          } />
          <Route path="agreement-form" element={
            isPhase1 ? <Navigate to="../dashboard" replace /> : <StudentAgreementForm user={user} />
          } />

          {/* Protected Routes */}
          <Route path="assignments" element={isProfileComplete ? <StudentAssignments user={user} /> : <Navigate to="../dashboard" replace />} />
          <Route path="results" element={isProfileComplete ? <StudentResults user={user} /> : <Navigate to="../dashboard" replace />} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
