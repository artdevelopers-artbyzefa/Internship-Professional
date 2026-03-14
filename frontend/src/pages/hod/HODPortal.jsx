import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import HODDashboard from './HODDashboard.jsx';
import HODApprovals from './HODApprovals.jsx';
import HODApprovedResults from './HODApprovedResults.jsx';
import HODReports from './HODReports.jsx';
import HODArchive from './HODArchive.jsx';
import RegisteredStudents from '../office/RegisteredStudents.jsx';
import EmailCenter from '../office/EmailCenter.jsx';
import { apiRequest } from '../../utils/api.js';

const hodNav = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-shield-halved' },
  { id: 'registered-students', label: 'Student Records', icon: 'fa-users' },
  { id: 'reports', label: 'Internship Analysis', icon: 'fa-file-export' },
  { id: 'email-center', label: 'Institutional Sync', icon: 'fa-envelope-open-text' },
  { id: 'archive', label: 'Previous Cycles', icon: 'fa-database' },
];

export default function HODPortal({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePhase, setActivePhase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/phases/current')
      .then(data => setActivePhase(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Determine current active page from URL
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  // Filter Nav Items based on Phase (Dashboard only in Phase 1 & 2, but keep Archive always)
  const isEarlyPhase = activePhase?.key === 'registration' || activePhase?.key === 'request_submission';
  const filteredNav = isEarlyPhase
    ? hodNav.filter(item => item.id === 'dashboard' || item.id === 'archive')
    : hodNav;

  const handlePageChange = (newPageId) => {
    navigate(`/hod/${newPageId}`);
  };

  useEffect(() => {
    if (loading) return;

    if (location.pathname === '/hod' || location.pathname === '/hod/') {
      navigate('/hod/dashboard', { replace: true });
    }

    // Redirect to dashboard if trying to access restricted pages in Phase 1 & 2
    if (isEarlyPhase && currentPath !== 'dashboard') {
      navigate('/hod/dashboard', { replace: true });
    }
  }, [location.pathname, activePhase, loading, currentPath, navigate]);

  if (loading) return null; // Or a loader

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
          <Route path="dashboard" element={<HODDashboard />} />
          <Route path="registered-students" element={<RegisteredStudents user={user} />} />
          <Route path="reports" element={<HODReports />} />
          <Route path="email-center" element={<EmailCenter />} />
          <Route path="archive" element={<HODArchive />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
