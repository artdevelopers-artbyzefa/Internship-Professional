import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import InternshipRequestForm from './InternshipRequestForm.jsx';
import StudentAgreementForm from './StudentAgreementForm.jsx';
import StudentReports from './StudentReports.jsx';
import StudentResults from './StudentResults.jsx';

export default function StudentPortal({ user, onLogout }) {
  const [page, setPage] = useState(() => sessionStorage.getItem('student_page') || 'dashboard');

  const handlePageChange = (newPage) => {
    setPage(newPage);
    sessionStorage.setItem('student_page', newPage);
  };
  
  // Decide active page based on status for first-time or pending users
  useEffect(() => {
    const status = user.status || 'verified';
    // Only force redirect if there's no saved page or if we are in a mandatory workflow step
    const savedPage = sessionStorage.getItem('student_page');
    
    if (!savedPage) {
        if (status === 'verified' || status === 'Internship Request Submitted' || status === 'Internship Rejected') {
          handlePageChange('internship-request');
        } else if (status === 'Internship Approved' || status.includes('Agreement Submitted') || status === 'Agreement Rejected') {
          handlePageChange('agreement-form');
        }
    }
  }, [user.status]);

  // Mandatory Sidebar Items (Visible only after Agreement Approved)
  const isWorkflowComplete = user.status === 'Agreement Approved' || user.status === 'Assigned';
  
  const studentNav = isWorkflowComplete ? [
    { id:'dashboard', label:'Dashboard', icon:'fa-house' },
    { id:'reports',   label:'Reports',   icon:'fa-cloud-arrow-up' },
    { id:'results',   label:'Result',    icon:'fa-chart-column' },
  ] : [
    // Temporary menu while in workflow
    { id: (user.status || '').includes('Internship') || user.status === 'verified' ? 'internship-request' : 'agreement-form', 
      label:'Workflow Step', icon:'fa-lock' }
  ];

  const renderPage = () => {
    const status = user.status || 'verified';
    
    // 1. Initial Internship Request Phase
    if (status === 'verified' || status === 'Internship Request Submitted' || status === 'Internship Rejected') {
      return <InternshipRequestForm user={user} />;
    }
    
    // 2. Agreement Submission Phase
    if (status === 'Internship Approved' || status.includes('Agreement Submitted') || status === 'Agreement Rejected') {
      return <StudentAgreementForm user={user} />;
    }

    // 3. Post-Approval Dashboard Phase
    switch (page) {
      case 'dashboard': return <StudentDashboard user={user} />;
      case 'reports':   return <StudentReports user={user} />;
      case 'results':   return <StudentResults user={user} />;
      default:          return <StudentDashboard user={user} />;
    }
  };

  return (
    <AppLayout 
      user={user} 
      onLogout={onLogout} 
      activePage={page} 
      setActivePage={handlePageChange} 
      navItems={studentNav}
      disableSidebar={!isWorkflowComplete}
    >
      <div className="p-6">
        {renderPage()}
      </div>
    </AppLayout>
  );
}
