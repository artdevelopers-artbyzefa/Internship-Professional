import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import SupervisorDashboard from './SupervisorDashboard.jsx';
import FacultyStudents from '../faculty/FacultyStudents.jsx';
import SupervisionRequests from '../faculty/SupervisionRequests.jsx';
import { apiRequest } from '../../utils/api.js';

const supervisorNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'interns', label: 'My Interns', icon: 'fa-users' },
    { id: 'evaluations', label: 'Evaluations', icon: 'fa-file-signature' },
];

export default function SupervisorPortal({ user, onLogout }) {
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
    // For Phase 1 (Registration), this will be true
    const isLocked = activePhase !== undefined && (!activePhase || activePhase.order < 7);

    const filteredNav = activePhase?.order < 7
        ? supervisorNav.filter(item => ['dashboard', 'interns'].includes(item.id))
        : supervisorNav;

    const handlePageChange = (newPageId) => {
        navigate(`/supervisor/${newPageId}`);
    };

    useEffect(() => {
        const isAtBase = location.pathname === '/supervisor' || location.pathname === '/supervisor/';
        if (isAtBase) {
            navigate('/supervisor/dashboard', { replace: true });
        }

        // If locked and trying to access other pages (excluding dashboard and interns subpaths)
        const segment = location.pathname.split('/')[2] || 'dashboard';
        const allowed = ['dashboard', 'interns'].includes(segment);

        if (isLocked && !allowed && !isAtBase) {
            navigate('/supervisor/dashboard', { replace: true });
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
                    <Route path="dashboard" element={<SupervisorDashboard user={user} activePhase={activePhase} />} />
                    <Route path="requests" element={<SupervisionRequests user={user} />} />
                    <Route path="interns" element={<FacultyStudents user={user} />} />
                    <Route path="evaluations" element={<div className="p-8 text-center text-gray-500 font-bold">Evaluation Module Coming Soon</div>} />

                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
            </div>
        </AppLayout>
    );
}

