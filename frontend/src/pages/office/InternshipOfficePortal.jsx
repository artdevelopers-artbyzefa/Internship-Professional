import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageErrorBoundary from '../../components/ui/PageErrorBoundary.jsx';

import OfficeDashboard from './OfficeDashboard.jsx';

const StudentRequestVerification  = lazy(() => import('./StudentRequestVerification.jsx'));
const FacultyManagement           = lazy(() => import('./FacultyManagement.jsx'));
const CompanyManagement          = lazy(() => import('./CompanyManagement.jsx'));
const AssignmentCenter           = lazy(() => import('./AssignmentCenter.jsx'));
const ManageAssignments          = lazy(() => import('./ManageAssignments.jsx'));
const ViewAllResults             = lazy(() => import('./ViewAllResults.jsx'));
const NoticeManagement           = lazy(() => import('./NoticeManagement.jsx'));
const ReportsAnalytics           = lazy(() => import('./ReportsAnalytics.jsx'));
const OfficeReports              = lazy(() => import('./OfficeReports.jsx'));
const StudentManagement          = lazy(() => import('./StudentManagement.jsx'));
const RegisteredStudents         = lazy(() => import('./RegisteredStudents.jsx'));
const SiteSupervisorManagement   = lazy(() => import('./SiteSupervisorManagement.jsx'));
const PhaseManagement            = lazy(() => import('./PhaseManagement.jsx'));
const InternshipRequestsManager  = lazy(() => import('./InternshipRequestsManager.jsx'));
const InternshipRequestDetail   = lazy(() => import('./InternshipRequestDetail.jsx'));
const RosterDetail              = lazy(() => import('./RosterDetail.jsx'));
const EmailCenter                = lazy(() => import('./EmailCenter.jsx'));
const HODArchive                 = lazy(() => import('../hod/HODArchive.jsx'));
const SystemMonitoring            = lazy(() => import('./SystemMonitoring.jsx'));

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
  { id: 'phase-control', label: 'Phase Control', icon: 'fa-layer-group' },
  { id: 'system-monitoring', label: 'System Health', icon: 'fa-shield-halved' }
];

const PageLoader = () => (
  <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
    <div className="w-10 h-10 border-3 border-gray-100 border-t-primary rounded-full animate-spin" />
    <span className="sr-only">Loading page...</span>
  </div>
);

const Safe = ({ children }) => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  </PageErrorBoundary>
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
      <div>
        <Routes>
          <Route path="dashboard"           element={<Safe><OfficeDashboard user={user} /></Safe>} />
          <Route path="student-registry"    element={<Safe><StudentManagement user={user} /></Safe>} />
          <Route path="registered-students" element={<Safe><RegisteredStudents user={user} /></Safe>} />
          <Route path="internship-requests" element={<Safe><InternshipRequestsManager user={user} /></Safe>} />
          <Route path="internship-requests/:studentId" element={<Safe><InternshipRequestDetail user={user} /></Safe>} />

          <Route path="verification-dashboard" element={<Safe><StudentRequestVerification user={user} /></Safe>} />

          <Route path="faculty-management"   element={<Safe><FacultyManagement user={user} /></Safe>} />
          <Route path="faculty-management/:id/students" element={<Safe><RosterDetail /></Safe>} />
          
          <Route path="supervisor-management" element={<Safe><SiteSupervisorManagement user={user} /></Safe>} />
          <Route path="supervisor-management/:id/students" element={<Safe><RosterDetail /></Safe>} />
          
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
          <Route path="system-monitoring"  element={<Safe><SystemMonitoring user={user} /></Safe>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
