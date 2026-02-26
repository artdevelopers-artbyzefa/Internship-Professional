import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import HODDashboard from './HODDashboard.jsx';
import HODApprovals from './HODApprovals.jsx';
import HODApprovedResults from './HODApprovedResults.jsx';
import HODReports from './HODReports.jsx';

const hodNav = [
  { id:'dashboard', label:'Dashboard',       icon:'fa-shield-halved' },
  { id:'approvals', label:'Pending Approvals',icon:'fa-clock' },
  { id:'approved',  label:'Approved Results', icon:'fa-circle-check' },
  { id:'reports',   label:'Reports',           icon:'fa-file-export' },
];

export default function HODPortal({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active page from URL
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const handlePageChange = (newPageId) => {
    navigate(`/hod/${newPageId}`);
  };

  useEffect(() => {
    if (location.pathname === '/hod' || location.pathname === '/hod/') {
      navigate('/hod/dashboard', { replace: true });
    }
  }, [location.pathname]);

  return (
    <AppLayout 
      user={user} 
      onLogout={onLogout} 
      activePage={currentPath} 
      setActivePage={handlePageChange} 
      navItems={hodNav}
    >
      <div className="p-6">
        <Routes>
          <Route path="dashboard" element={<HODDashboard />} />
          <Route path="approvals" element={<HODApprovals />} />
          <Route path="approved" element={<HODApprovedResults />} />
          <Route path="reports" element={<HODReports />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  );
}
