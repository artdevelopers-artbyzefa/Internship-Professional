import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
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
import SiteSupervisorManagement from './SiteSupervisorManagement.jsx';
import PhaseManagement from './PhaseManagement.jsx';

const officeNav = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'student-registry', label: 'Student Registry', icon: 'fa-users' },
  { id: 'faculty-management', label: 'Faculty Management', icon: 'fa-user-tie' },
  { id: 'supervisor-management', label: 'Site Supervisor', icon: 'fa-user-check' },
  { id: 'company-registry', label: 'Company Registry', icon: 'fa-building' },
  { id: 'notice-board', label: 'Notice Board', icon: 'fa-bullhorn' },
  { id: 'phase-control', label: 'Phase Control', icon: 'fa-layer-group' }
];

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
          <Route path="dashboard" element={<OfficeDashboard user={user} />} />
          <Route path="student-registry" element={<StudentManagement user={user} />} />

          <Route path="verification-dashboard" element={<StudentRequestVerification user={user} />} />

          <Route path="faculty-management" element={<FacultyManagement user={user} />} />
          <Route path="supervisor-management" element={<SiteSupervisorManagement user={user} />} />
          <Route path="company-registry" element={<CompanyManagement user={user} />} />
          <Route path="assignment-center" element={<AssignmentCenter user={user} />} />

          <Route path="add-assignments" element={<ManageAssignments user={user} />} />
          <Route path="view-results" element={<ViewAllResults />} />

          <Route path="reports-analytics" element={<ReportsAnalytics user={user} />} />
          <Route path="download-reports" element={<OfficeReports user={user} />} />
          <Route path="notice-board" element={<NoticeManagement user={user} />} />
          <Route path="phase-control" element={<PhaseManagement user={user} />} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
