import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import FacultyDashboard from './FacultyDashboard.jsx';
import FacultyStudents from './FacultyStudents.jsx';
import FacultyAssignments from './FacultyAssignments.jsx';
import FacultyEvaluation from './FacultyEvaluation.jsx';
import FacultyResults from './FacultyResults.jsx';
import AddAssignment from './AddAssignment.jsx';
import AddMarks from './AddMarks.jsx';
import FacultyReports from './FacultyReports.jsx';
import StudentProfileDetail from './StudentProfileDetail.jsx';
import SupervisionRequests from './SupervisionRequests.jsx';
import { apiRequest } from '../../utils/api.js';

const facultyNav = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'requests', label: 'Pending Requests', icon: 'fa-user-pen' },
  { id: 'students', label: 'Students', icon: 'fa-users' },
  {
    id: 'assignments-dropdown',
    label: 'Assignments',
    icon: 'fa-file-lines',
    children: [
      { id: 'view-assignments', label: 'View Assignments' },
      { id: 'add-assignment', label: 'Add Assignment' },
      { id: 'add-marks', label: 'Add Marks' }
    ]
  },
  { id: 'evaluation', label: 'Evaluation', icon: 'fa-clipboard-list' },
  { id: 'reports', label: 'Reports', icon: 'fa-chart-line' },
  { id: 'results', label: 'Results', icon: 'fa-award' },
];

export default function FacultyPortal({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePhase, setActivePhase] = useState(undefined);

  useEffect(() => {
    apiRequest('/phases/current')
      .then(phase => setActivePhase(phase))
      .catch(() => setActivePhase(null));
  }, []);

  // Determine current active page from URL
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  // Lock logic: Only show full menu after Phase 6 (order >= 7)
  const isLocked = activePhase !== undefined && (!activePhase || activePhase.order < 7);

  const filteredNav = activePhase?.order < 7
    ? facultyNav.filter(item => ['dashboard', 'requests', 'students'].includes(item.id))
    : facultyNav;

  const handlePageChange = (newPageId) => {
    navigate(`/faculty/${newPageId}`);
  };

  useEffect(() => {
    const isAtBase = location.pathname === '/faculty' || location.pathname === '/faculty/';
    if (isAtBase) {
      navigate('/faculty/dashboard', { replace: true });
    }

    // If locked and trying to access other pages (excluding dashboard, requests, students and their subpaths)
    const segment = location.pathname.split('/')[2] || 'dashboard';
    const allowed = ['dashboard', 'requests', 'students'].includes(segment);

    if (isLocked && !allowed && !isAtBase) {
      navigate('/faculty/dashboard', { replace: true });
    }
  }, [location.pathname, isLocked, currentPath]);

  return (
    <AppLayout
      user={user}
      onLogout={onLogout}
      activePage={currentPath}
      setActivePage={handlePageChange}
      navItems={filteredNav}
    >
      <div className="p-6">
        <Routes>
          <Route path="dashboard" element={<FacultyDashboard user={user} activePhase={activePhase} />} />
          <Route path="requests" element={<SupervisionRequests user={user} />} />
          <Route path="students" element={<FacultyStudents user={user} />} />
          <Route path="students/:studentId" element={<StudentProfileDetail />} />
          <Route path="view-assignments" element={<FacultyAssignments />} />
          <Route path="add-assignment" element={<AddAssignment user={user} />} />
          <Route path="add-marks" element={<AddMarks user={user} />} />
          <Route path="evaluation" element={<FacultyEvaluation user={user} />} />
          <Route path="reports" element={<FacultyReports user={user} />} />
          <Route path="results" element={<FacultyResults />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
