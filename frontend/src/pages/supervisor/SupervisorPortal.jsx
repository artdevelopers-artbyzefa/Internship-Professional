import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { apiRequest } from '../../utils/api.js';

// Eagerly load dashboard (first paint)
import SupervisorDashboard from './SupervisorDashboard.jsx';

// Lazy-load all other pages
const SupervisorAssignments = lazy(() => import('./SupervisorAssignments.jsx'));
const SupervisorGrading     = lazy(() => import('./SupervisorGrading.jsx'));
const SupervisorCertificates = lazy(() => import('./SupervisorCertificates.jsx'));
const FacultyEvaluation    = lazy(() => import('../faculty/FacultyEvaluation.jsx'));
const StudentProfileDetail = lazy(() => import('../faculty/StudentProfileDetail.jsx'));
const SupervisorProfile     = lazy(() => import('../../components/supervisor/SupervisorProfile.jsx'));
const RegisteredStudents    = lazy(() => import('../office/RegisteredStudents.jsx'));

const PageLoader = () => (
  <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
    <div className="w-10 h-10 border-3 border-gray-100 border-t-primary rounded-full animate-spin" />
    <span className="sr-only">Loading page...</span>
  </div>
);

const LazyWrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const supervisorNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'registered-students', label: 'Registered Students', icon: 'fa-users' },
    { id: 'assignments', label: 'Assignment Summary', icon: 'fa-tasks' },
    { id: 'grading', label: 'Grading', icon: 'fa-star' },
    { id: 'certificates', label: 'Certificates', icon: 'fa-award' },
    { id: 'profile', label: 'Profile', icon: 'fa-user-gear' },
];

export default function SupervisorPortal({ user, onLogout, onUpdateUser }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [activePhase, setActivePhase] = useState(undefined);

    useEffect(() => {
        apiRequest('/phases/current')
            .then(phase => setActivePhase(phase))
            .catch(() => setActivePhase(null));
    }, []);

    const rawPath = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
    const cleanPath = rawPath.split('?')[0];

    // Map aliases to sidebar IDs
    const currentPath = 
        ['grading', 'evaluation', 'evaluations', 'add-marks'].includes(cleanPath) ? 'grading' :
        ['registered-students', 'students'].includes(cleanPath) ? 'registered-students' : 
        cleanPath;

    const handlePageChange = (newPageId) => {
        navigate(`/supervisor/${newPageId}`);
    };

    const filteredNav = supervisorNav.filter(item => {
        if (activePhase?.order <= 2) {
            return ['dashboard', 'registered-students', 'profile'].includes(item.id);
        }
        if (activePhase?.order >= 4) {
            return ['dashboard', 'grading', 'certificates', 'profile'].includes(item.id);
        }
        return true;
    }).map(item => {
        if (activePhase?.order >= 4 && item.id === 'grading') {
            return { ...item, label: 'Evaluation Reports', icon: 'fa-clipboard-check' };
        }
        return item;
    });

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
                    <Route path="dashboard" element={<SupervisorDashboard user={user} activePhase={activePhase} />} />
                    <Route path="registered-students" element={<LazyWrap><RegisteredStudents user={user} /></LazyWrap>} />
                    <Route path="students/:studentId" element={<LazyWrap><StudentProfileDetail /></LazyWrap>} />
                    <Route path="assignments" element={<LazyWrap><SupervisorAssignments user={user} /></LazyWrap>} />
                    <Route path="grading" element={<LazyWrap><SupervisorGrading user={user} activePhase={activePhase} /></LazyWrap>} />
                    <Route path="certificates" element={<LazyWrap><SupervisorCertificates user={user} /></LazyWrap>} />
                    <Route path="evaluation" element={<LazyWrap><FacultyEvaluation user={user} activePhase={activePhase} /></LazyWrap>} />
                    <Route path="profile" element={<LazyWrap><SupervisorProfile user={user} onUpdate={onUpdateUser} /></LazyWrap>} />

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </div>
        </AppLayout>
    );
}
