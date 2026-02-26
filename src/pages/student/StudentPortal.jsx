import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import InternshipRequestForm from './InternshipRequestForm.jsx';
import StudentAgreementForm from './StudentAgreementForm.jsx';
import StudentReports from './StudentReports.jsx';
import StudentResults from './StudentResults.jsx';

export default function StudentPortal({ user, onLogout }) {
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

  // Mandatory Sidebar Items (Visible only after Agreement Approved)
  const isWorkflowComplete = user.status === 'Agreement Approved' || user.status === 'Assigned';
  
  const studentNav = isWorkflowComplete ? [
    { id:'dashboard', label:'Dashboard', icon:'fa-house' },
    { id:'reports',   label:'Reports',   icon:'fa-cloud-arrow-up' },
    { id:'results',   label:'Result',    icon:'fa-chart-column' },
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
          
          {/* Dashboard Routes */}
          <Route path="dashboard" element={<StudentDashboard user={user} />} />
          <Route path="reports" element={<StudentReports user={user} />} />
          <Route path="results" element={<StudentResults user={user} />} />
          
          {/* Default fallback within portal */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
