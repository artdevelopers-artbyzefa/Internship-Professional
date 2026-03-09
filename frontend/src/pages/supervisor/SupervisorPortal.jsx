import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import SupervisorDashboard from './SupervisorDashboard.jsx';
import SupervisorAssignments from './SupervisorAssignments.jsx';
import SupervisorGrading from './SupervisorGrading.jsx';
import SupervisorProfile from '../../components/supervisor/SupervisorProfile.jsx';
import { apiRequest } from '../../utils/api.js';

const supervisorNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'assignments', label: 'Assignment Summary', icon: 'fa-tasks' },
    { id: 'grading', label: 'Grading', icon: 'fa-star' },
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

    const currentPath = location.pathname.split('/').pop() || 'dashboard';

    const handlePageChange = (newPageId) => {
        navigate(`/supervisor/${newPageId}`);
    };


    return (
        <AppLayout
            user={user}
            onLogout={onLogout}
            activePage={currentPath}
            setActivePage={handlePageChange}
            navItems={supervisorNav}
        >
            <div className="p-6">
                <Routes>
                    <Route path="/" element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<SupervisorDashboard user={user} activePhase={activePhase} />} />
                    <Route path="assignments" element={<SupervisorAssignments user={user} />} />
                    <Route path="grading" element={<SupervisorGrading user={user} />} />
                    <Route path="profile" element={<SupervisorProfile user={user} onUpdate={onUpdateUser} />} />

                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
            </div>
        </AppLayout>
    );
}
