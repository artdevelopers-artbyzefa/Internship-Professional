import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import FacultyDashboard from './FacultyDashboard.jsx';
import FacultyStudents from './FacultyStudents.jsx';
import FacultyEvaluation from './FacultyEvaluation.jsx';
import FacultyReports from './FacultyReports.jsx';
import StudentProfileDetail from './StudentProfileDetail.jsx';
import RegisteredStudents from '../office/RegisteredStudents.jsx';
import SupervisorProfile from '../../components/supervisor/SupervisorProfile.jsx';
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

  const filteredNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    ...(!isPhase4 ? [{ id: 'registered-students', label: 'Registered Students', icon: 'fa-users' }] : []),
    { id: 'grading', label: isPhase4 ? 'Final Grading' : 'Weekly Grading', icon: 'fa-star' },
    { id: 'reports', label: 'Evaluation Reports', icon: 'fa-file-invoice' },
    { id: 'profile', label: 'Profile', icon: 'fa-user-gear' },
  ];

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
          <Route path="registered-students" element={<RegisteredStudents user={user} />} />
          <Route path="grading" element={<FacultyEvaluation user={user} activePhase={activePhase} />} />
          <Route path="reports" element={<FacultyReports user={user} />} />
          <Route path="profile" element={<SupervisorProfile user={user} onUpdate={onUpdateUser} />} />
          <Route path="students/:studentId" element={<StudentProfileDetail />} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
