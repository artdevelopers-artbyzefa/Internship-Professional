import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import OfficeDashboard from './OfficeDashboard.jsx';
import PendingRequests from './PendingRequests.jsx';
import PendingAgreements from './PendingAgreements.jsx';
import ApprovedStudents from './ApprovedStudents.jsx';
import FacultyManagement from './FacultyManagement.jsx';
import CompanyManagement from './CompanyManagement.jsx';
import AssignStudents from './AssignStudents.jsx';
import AssignedStudents from './AssignedStudents.jsx';
import ManageAssignments from './ManageAssignments.jsx';
import ViewAllResults from './ViewAllResults.jsx';
import NoticeManagement from './NoticeManagement.jsx';

const officeNav = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
  { 
    id: 'student-requests', 
    label: 'Student Requests', 
    icon: 'fa-user-clock',
    children: [
      { id: 'internship-approvals', label: 'Internship Approvals' },
      { id: 'student-agreements', label: 'Student Agreements' },
      { id: 'approved-students', label: 'Approved Students' }
    ]
  },
  {
    id: 'faculty-supervisor',
    label: 'Faculty Supervisor',
    icon: 'fa-user-tie',
    children: [
      { id: 'add-supervisors', label: 'Add Supervisors' },
      { id: 'view-supervisors', label: 'View Supervisors' }
    ]
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: 'fa-building',
    children: [
      { id: 'add-companies', label: 'Add Companies' },
      { id: 'view-companies', label: 'View Companies' }
    ]
  },
  { id: 'assign-students', label: 'Assign Students', icon: 'fa-user-check' },
  {
    id: 'interns',
    label: 'Interns',
    icon: 'fa-users',
    children: [
      { id: 'assigned-students', label: 'Assigned Students' }
    ]
  },
  {
    id: 'result',
    label: 'Result',
    icon: 'fa-square-poll-vertical',
    children: [
      { id: 'add-assignments', label: 'Add Assignments' },
      { id: 'view-results', label: 'View Results' }
    ]
  },
  {
    id: 'notice-board',
    label: 'Notice Board',
    icon: 'fa-bullhorn',
    children: [
      { id: 'create-notice', label: 'Create Notice' },
      { id: 'update-notice', label: 'Update Notice' }
    ]
  },
  { id: 'download-reports', label: 'Download Reports', icon: 'fa-file-arrow-down' }
];

export default function InternshipOfficePortal({ user, onLogout }) {
  const [page, setPage] = useState(() => sessionStorage.getItem('office_page') || 'dashboard');

  const handlePageChange = (newPage) => {
    setPage(newPage);
    sessionStorage.setItem('office_page', newPage);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':             return <OfficeDashboard user={user} />;
      case 'internship-approvals':  return <PendingRequests />;
      case 'student-agreements':    return <PendingAgreements />;
      case 'approved-students':     return <ApprovedStudents />;
      case 'add-supervisors':
      case 'view-supervisors':      return <FacultyManagement view={page} user={user} />;
      case 'add-companies':
      case 'view-companies':        return <CompanyManagement view={page} user={user} />;
      case 'assign-students':       return <AssignStudents user={user} />;
      case 'assigned-students':     return <AssignedStudents />;
      case 'add-assignments':      return <ManageAssignments user={user} />;
      case 'view-results':         return <ViewAllResults />;
      case 'create-notice':
      case 'update-notice':        return <NoticeManagement view={page} user={user} />;
      default:                      return <OfficeDashboard user={user} />;
    }
  };

  return (
    <AppLayout 
      user={user} 
      onLogout={onLogout} 
      activePage={page} 
      setActivePage={handlePageChange} 
      navItems={officeNav}
    >
      <div className="p-6">
        {renderPage()}
      </div>
    </AppLayout>
  );
}
