import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { apiRequest } from '../../utils/api.js';

// Eagerly load dashboard (first paint)
import FacultyDashboard from './FacultyDashboard.jsx';

// Lazy-load all other pages
const FacultyStudents      = lazy(() => import('./FacultyStudents.jsx'));
const FacultyEvaluation    = lazy(() => import('./FacultyEvaluation.jsx'));
const FacultyReports       = lazy(() => import('./FacultyReports.jsx'));
const StudentProfileDetail = lazy(() => import('./StudentProfileDetail.jsx'));
const RegisteredStudents   = lazy(() => import('../office/RegisteredStudents.jsx'));
const SupervisionRequests  = lazy(() => import('./SupervisionRequests.jsx'));
const SupervisorProfile    = lazy(() => import('../../components/supervisor/SupervisorProfile.jsx'));
const AddAssignment        = lazy(() => import('./AddAssignment.jsx'));
const FacultyAssignments   = lazy(() => import('./FacultyAssignments.jsx'));

const PageLoader = () => (
  <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
    <div className="w-10 h-10 border-3 border-gray-100 border-t-primary rounded-full animate-spin" />
    <span className="sr-only">Loading page...</span>
  </div>
);

const LazyWrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export default function FacultyPortal({ user, onLogout, onUpdateUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePhase, setActivePhase] = useState(undefined);

  useEffect(() => {
    apiRequest('/phases/current')
      .then(phase => setActivePhase(phase))
      .catch((err) => { 
        // Error handled by apiRequest
        setActivePhase(null);
      });
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
          <Route path="requests" element={<LazyWrap><SupervisionRequests user={user} /></LazyWrap>} />
          <Route path="students" element={<LazyWrap><FacultyStudents user={user} /></LazyWrap>} />
          <Route path="students/:studentId" element={<LazyWrap><StudentProfileDetail /></LazyWrap>} />
          <Route path="registered-students" element={<LazyWrap><RegisteredStudents user={user} /></LazyWrap>} />
          <Route path="grading" element={<LazyWrap><FacultyEvaluation user={user} activePhase={activePhase} /></LazyWrap>} />
          <Route path="add-marks" element={<LazyWrap><FacultyEvaluation user={user} activePhase={activePhase} /></LazyWrap>} />
          <Route path="evaluation" element={<LazyWrap><FacultyEvaluation user={user} activePhase={activePhase} /></LazyWrap>} />
          <Route path="reports" element={<LazyWrap><FacultyReports user={user} /></LazyWrap>} />
          <Route path="profile" element={<LazyWrap><SupervisorProfile user={user} onUpdate={onUpdateUser} /></LazyWrap>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
