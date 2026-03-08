import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
import ReportsAnalytics from './ReportsAnalytics.jsx';
import OfficeReports from './OfficeReports.jsx';
import StudentManagement from './StudentManagement.jsx';
import PhaseManagement from './PhaseManagement.jsx';

const officeNav = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'reports-analytics', label: 'Reports & Analytics', icon: 'fa-chart-line' },
  { id: 'student-registry', label: 'Student Registry', icon: 'fa-users' },
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
  { id: 'phase-control', label: 'Phase Control', icon: 'fa-layer-group' },
  { id: 'download-reports', label: 'Download Reports', icon: 'fa-file-arrow-down' }
];

export default function InternshipOfficePortal({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active page from URL
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const handlePageChange = (newPageId) => {
    navigate(`/office/${newPageId}`);
  };

  useEffect(() => {
    if (location.pathname === '/office' || location.pathname === '/office/') {
      navigate('/office/dashboard', { replace: true });
    }
  }, [location.pathname]);

  return (
    <AppLayout
      user={user}
      onLogout={onLogout}
      activePage={currentPath}
      setActivePage={handlePageChange}
      navItems={officeNav}
    >
      <div className="p-6">
        <Routes>
          <Route path="dashboard" element={<OfficeDashboard user={user} />} />
          <Route path="student-registry" element={<StudentManagement user={user} />} />
          <Route path="internship-approvals" element={<PendingRequests />} />
          <Route path="student-agreements" element={<PendingAgreements />} />
          <Route path="approved-students" element={<ApprovedStudents />} />

          <Route path="add-supervisors" element={<FacultyManagement view="add-supervisors" user={user} />} />
          <Route path="view-supervisors" element={<FacultyManagement view="view-supervisors" user={user} />} />

          <Route path="add-companies" element={<CompanyManagement view="add-companies" user={user} />} />
          <Route path="view-companies" element={<CompanyManagement view="view-companies" user={user} />} />

          <Route path="assign-students" element={<AssignStudents user={user} />} />
          <Route path="assigned-students" element={<AssignedStudents />} />

          <Route path="add-assignments" element={<ManageAssignments user={user} />} />
          <Route path="view-results" element={<ViewAllResults />} />

          <Route path="reports-analytics" element={<ReportsAnalytics user={user} />} />
          <Route path="download-reports" element={<OfficeReports user={user} />} />
          <Route path="create-notice" element={<NoticeManagement view="create-notice" user={user} />} />
          <Route path="update-notice" element={<NoticeManagement view="update-notice" user={user} />} />
          <Route path="phase-control" element={<PhaseManagement user={user} />} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
