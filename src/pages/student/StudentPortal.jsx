import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import StudentProfile from './StudentProfile.jsx';
import InternshipRequestForm from './InternshipRequestForm.jsx';
import StudentAgreementForm from './StudentAgreementForm.jsx';
import StudentAssignments from './StudentAssignments.jsx';
import StudentResults from './StudentResults.jsx';

export default function StudentPortal({ user, onLogout, onUpdateUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const status = user.status || 'verified';

  // Get current sub-page from URL
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const handlePageChange = (newPageId) => {
    navigate(`/student/${newPageId}`);
  };
  
  // Decide active page based on status for first-time or pending users (Workflow logic)
  useEffect(() => {
    const isAtBase = location.pathname === '/student' || location.pathname === '/student/';
    
    if (isAtBase) {
        if (status === 'verified' || status === 'Internship Request Submitted' || status === 'Internship Rejected') {
          navigate('/student/internship-request', { replace: true });
        } else if (status === 'Internship Approved' || status.includes('Agreement Submitted') || status === 'Agreement Rejected') {
          navigate('/student/agreement-form', { replace: true });
        } else {
          navigate('/student/dashboard', { replace: true });
        }
    }
  }, [status, location.pathname]);

  // Profiles and Workflows Completion Checking
  const isWorkflowComplete = user.status === 'Agreement Approved' || user.status === 'Assigned';
  const isProfileComplete = user.fatherName && user.section && user.dateOfBirth && user.profilePicture;
  
  const studentNav = isWorkflowComplete ? [
    { id:'dashboard',   label:'Dashboard',   icon:'fa-house' },
    { id:'profile',     label:'My Profile', icon:'fa-user-pen' },
    { id:'assignments', label:'Assignments', icon:'fa-cloud-arrow-up', disabled: !isProfileComplete },
    { id:'results',     label:'Result',      icon:'fa-chart-column',   disabled: !isProfileComplete },
  ] : [
    { id: (status.includes('Internship') || status === 'verified') ? 'internship-request' : 'agreement-form', 
      label:'Workflow Step', icon:'fa-lock' }
  ];

  return (
    <AppLayout 
      user={user} 
      onLogout={onLogout} 
      activePage={currentPath} 
      setActivePage={handlePageChange} 
      navItems={studentNav}
      disableSidebar={!isWorkflowComplete}
    >
      <div className="p-6">
        <Routes>
          {/* Workflow Routes */}
          <Route path="internship-request" element={<InternshipRequestForm user={user} />} />
          <Route path="agreement-form" element={<StudentAgreementForm user={user} />} />
          
          {/* Dashboard & Profile Routes */}
          <Route path="dashboard" element={<StudentDashboard user={user} />} />
          <Route path="profile" element={<StudentProfile user={user} onUpdate={onUpdateUser} />} />
          
          {/* Protected Routes (Locked until profile is complete) */}
          <Route path="assignments" element={isProfileComplete ? <StudentAssignments user={user} /> : <Navigate to="../dashboard" replace />} />
          <Route path="results" element={isProfileComplete ? <StudentResults user={user} /> : <Navigate to="../dashboard" replace />} />
          
          {/* Default fallback within portal */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
