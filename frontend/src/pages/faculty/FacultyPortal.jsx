import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import FacultyDashboard from './FacultyDashboard.jsx';
import FacultyStudents from './FacultyStudents.jsx';
import FacultyEvaluation from './FacultyEvaluation.jsx';
import FacultyReports from './FacultyReports.jsx';
import StudentProfileDetail from './StudentProfileDetail.jsx';
import RegisteredStudents from '../office/RegisteredStudents.jsx';
import SupervisionRequests from './SupervisionRequests.jsx';
import SupervisorProfile from '../../components/supervisor/SupervisorProfile.jsx';
import AddAssignment from './AddAssignment.jsx';
import FacultyAssignments from './FacultyAssignments.jsx';
import { apiRequest } from '../../utils/api.js';

export default function FacultyPortal({ user, onLogout, onUpdateUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePhase, setActivePhase] = useState(undefined);

  useEffect(() => {
    apiRequest('/phases/current')
      .then(phase => setActivePhase(phase))
      .catch(() => setActivePhase(null));
  }, []);

  const currentPhaseOrder = activePhase ? activePhase.order : 1;
  const isPhase4 = currentPhaseOrder >= 4;

  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const handlePageChange = (newPageId) => {
    navigate(`/faculty/${newPageId}`);
  };

  // Phase-aware navigation
  const filteredNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
  ];

  if (currentPhaseOrder === 2) {
    filteredNav.push({ id: 'requests', label: 'Internship Requests', icon: 'fa-user-pen' });
  }

  if (currentPhaseOrder >= 2) {
    filteredNav.push({ id: 'students', label: 'Registered Students', icon: 'fa-users' });
  }

  if (currentPhaseOrder >= 3) {
    if (!isPhase4) {
      filteredNav.push({ id: 'grading', label: 'Weekly Grading', icon: 'fa-star' });
    } else {
      filteredNav.push({ id: 'grading', label: 'Final Grading', icon: 'fa-star' });
    }
    filteredNav.push({ id: 'reports', label: 'Evaluation Reports', icon: 'fa-file-invoice' });
  }

  filteredNav.push({ id: 'profile', label: 'Profile', icon: 'fa-user-gear' });

  // Safety check to prevent infinite navigation loops
  useEffect(() => {
    if (activePhase === undefined) return;

    const restrictedPhase3Paths = ['registered-students', 'grading', 'reports'];
    if (activePhase?.order < 2 && currentPath === 'students') {
      navigate('/faculty/dashboard', { replace: true });
    }
    if (activePhase?.order < 3 && restrictedPhase3Paths.includes(currentPath)) {
      navigate('/faculty/dashboard', { replace: true });
    }
  }, [activePhase, currentPath, navigate]);

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
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FacultyDashboard user={user} activePhase={activePhase} />} />
          <Route path="requests" element={<SupervisionRequests user={user} />} />
          <Route path="students" element={<FacultyStudents user={user} />} />
          <Route path="students/:studentId" element={<StudentProfileDetail />} />
          <Route path="registered-students" element={<RegisteredStudents user={user} />} />
          <Route path="grading" element={<FacultyEvaluation user={user} activePhase={activePhase} />} />
          <Route path="add-marks" element={<FacultyEvaluation user={user} activePhase={activePhase} />} />
          <Route path="evaluation" element={<FacultyEvaluation user={user} activePhase={activePhase} />} />
          <Route path="reports" element={<FacultyReports user={user} />} />
          <Route path="profile" element={<SupervisorProfile user={user} onUpdate={onUpdateUser} />} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
