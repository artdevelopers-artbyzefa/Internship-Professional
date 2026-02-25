import React, { useState } from 'react';
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
  const [page, setPage] = useState(() => sessionStorage.getItem('hod_page') || 'dashboard');

  const handlePageChange = (newPage) => {
    setPage(newPage);
    sessionStorage.setItem('hod_page', newPage);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <HODDashboard />;
      case 'approvals': return <HODApprovals />;
      case 'approved':  return <HODApprovedResults />;
      case 'reports':   return <HODReports />;
      default:          return <HODDashboard />;
    }
  };

  return (
    <AppLayout user={user} onLogout={onLogout} activePage={page} setActivePage={handlePageChange} navItems={hodNav}>
      {renderPage()}
    </AppLayout>
  );
}
