import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageErrorBoundary from '../../components/ui/PageErrorBoundary.jsx';
import OfficeDashboard from './OfficeDashboard.jsx';
import StudentRequestVerification from './StudentRequestVerification.jsx';
import FacultyManagement from './FacultyManagement.jsx';
import CompanyManagement from './CompanyManagement.jsx';
import AssignmentCenter from './AssignmentCenter.jsx';
import ManageAssignments from './ManageAssignments.jsx';
import ViewAllResults from './ViewAllResults.jsx';
import NoticeManagement from './NoticeManagement.jsx';
import ReportsAnalytics from './ReportsAnalytics.jsx';
import OfficeReports from './OfficeReports.jsx';
import StudentManagement from './StudentManagement.jsx';
import RegisteredStudents from './RegisteredStudents.jsx';
import SiteSupervisorManagement from './SiteSupervisorManagement.jsx';
import PhaseManagement from './PhaseManagement.jsx';
import InternshipRequestsManager from './InternshipRequestsManager.jsx';
import EmailCenter from './EmailCenter.jsx';
import HODArchive from '../hod/HODArchive.jsx';

const officeNav = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'student-registry', label: 'Student Registry', icon: 'fa-user-plus' },
  { id: 'registered-students', label: 'Registered Students', icon: 'fa-users' },
  { id: 'internship-requests', label: 'Internship Requests', icon: 'fa-file-circle-check' },
  { id: 'faculty-management', label: 'Faculty Management', icon: 'fa-user-tie' },
  { id: 'supervisor-management', label: 'Site Supervisor', icon: 'fa-user-check' },
  { id: 'company-registry', label: 'Company Registry', icon: 'fa-building' },
  { id: 'notice-board', label: 'Notice Board', icon: 'fa-bullhorn' },
  { id: 'archive', label: 'Historical Archives', icon: 'fa-database' },
  { id: 'email-center', label: 'Email Center', icon: 'fa-envelope-open-text' },
  { id: 'phase-control', label: 'Phase Control', icon: 'fa-layer-group' }
];

// Helper — wraps any element in an error boundary so ONE page crash
// never takes down the entire portal.
const Safe = ({ children }) => (
  <PageErrorBoundary>{children}</PageErrorBoundary>
);

export default function InternshipOfficePortal({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

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
          <Route path="dashboard"           element={<Safe><OfficeDashboard user={user} /></Safe>} />
          <Route path="student-registry"    element={<Safe><StudentManagement user={user} /></Safe>} />
          <Route path="registered-students" element={<Safe><RegisteredStudents user={user} /></Safe>} />
          <Route path="internship-requests" element={<Safe><InternshipRequestsManager user={user} /></Safe>} />

          <Route path="verification-dashboard" element={<Safe><StudentRequestVerification user={user} /></Safe>} />

          <Route path="faculty-management"   element={<Safe><FacultyManagement user={user} /></Safe>} />
          <Route path="supervisor-management" element={<Safe><SiteSupervisorManagement user={user} /></Safe>} />
          <Route path="company-registry"     element={<Safe><CompanyManagement user={user} /></Safe>} />
          <Route path="assignment-center"    element={<Safe><AssignmentCenter user={user} /></Safe>} />

          <Route path="add-assignments"  element={<Safe><ManageAssignments user={user} /></Safe>} />
          <Route path="view-results"     element={<Safe><ViewAllResults /></Safe>} />

          <Route path="reports-analytics"  element={<Safe><ReportsAnalytics user={user} /></Safe>} />
          <Route path="download-reports"   element={<Safe><OfficeReports user={user} /></Safe>} />
          <Route path="notice-board"       element={<Safe><NoticeManagement user={user} /></Safe>} />
          <Route path="archive"            element={<Safe><HODArchive /></Safe>} />
          <Route path="email-center"       element={<Safe><EmailCenter /></Safe>} />
          <Route path="phase-control"      element={<Safe><PhaseManagement user={user} /></Safe>} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
