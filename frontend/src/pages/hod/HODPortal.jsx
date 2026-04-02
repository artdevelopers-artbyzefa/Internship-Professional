import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { apiRequest } from '../../utils/api.js';

// Eagerly load dashboard for immediate first-paint
import HODDashboard from './HODDashboard.jsx';

// Lazy-load secondary pages
const HODApprovals       = lazy(() => import('./HODApprovals.jsx'));
const HODApprovedResults = lazy(() => import('./HODApprovedResults.jsx'));
const HODReports         = lazy(() => import('./HODReports.jsx'));
const HODArchive         = lazy(() => import('./HODArchive.jsx'));
const RegisteredStudents = lazy(() => import('../office/RegisteredStudents.jsx'));
const EmailCenter        = lazy(() => import('../office/EmailCenter.jsx'));

const PageLoader = () => (
  <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
    <div className="w-10 h-10 border-3 border-gray-100 border-t-primary rounded-full animate-spin" />
    <span className="sr-only">Loading page...</span>
  </div>
);

const LazyWrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const hodNav = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-shield-halved' },
  { id: 'registered-students', label: 'Student Records', icon: 'fa-users' },
  { id: 'reports', label: 'Internship Analysis', icon: 'fa-file-export' },
  { id: 'email-center', label: 'Email Center', icon: 'fa-envelope-open-text' },
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
      .catch(err => {
        // Error handled by apiRequest
      })
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
          <Route path="registered-students" element={<LazyWrap><RegisteredStudents user={user} /></LazyWrap>} />
          <Route path="reports" element={<LazyWrap><HODReports /></LazyWrap>} />
          <Route path="email-center" element={<LazyWrap><EmailCenter /></LazyWrap>} />
          <Route path="archive" element={<LazyWrap><HODArchive /></LazyWrap>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
