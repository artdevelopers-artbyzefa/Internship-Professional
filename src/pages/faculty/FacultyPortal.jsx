import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import FacultyDashboard from './FacultyDashboard.jsx';
import FacultyStudents from './FacultyStudents.jsx';
import FacultyReports from './FacultyReports.jsx';
import FacultyEvaluation from './FacultyEvaluation.jsx';
import FacultyResults from './FacultyResults.jsx';
import AddMarks from './AddMarks.jsx';

const facultyNav = [
  { id:'dashboard',  label:'Dashboard',  icon:'fa-chart-pie' },
  { id:'students',   label:'Students',   icon:'fa-users' },
  { 
    id:'reports-dropdown',    
    label:'Reports',    
    icon:'fa-file-lines',
    children: [
        { id: 'reports', label: 'View Reports' },
        { id: 'add-marks', label: 'Add Marks' }
    ]
  },
  { id:'evaluation', label:'Evaluation', icon:'fa-clipboard-list' },
  { id:'results',    label:'Results',    icon:'fa-award' },
];

export default function FacultyPortal({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active page from URL
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const handlePageChange = (newPageId) => {
    navigate(`/faculty/${newPageId}`);
  };

  useEffect(() => {
    if (location.pathname === '/faculty' || location.pathname === '/faculty/') {
      navigate('/faculty/dashboard', { replace: true });
    }
  }, [location.pathname]);

  return (
    <AppLayout 
      user={user} 
      onLogout={onLogout} 
      activePage={currentPath} 
      setActivePage={handlePageChange} 
      navItems={facultyNav}
    >
      <div className="p-6">
        <Routes>
          <Route path="dashboard" element={<FacultyDashboard user={user} />} />
          <Route path="students" element={<FacultyStudents />} />
          <Route path="reports" element={<FacultyReports />} />
          <Route path="add-marks" element={<AddMarks user={user} />} />
          <Route path="evaluation" element={<FacultyEvaluation />} />
          <Route path="results" element={<FacultyResults />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
