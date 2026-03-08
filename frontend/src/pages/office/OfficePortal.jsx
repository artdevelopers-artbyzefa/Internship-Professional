import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import OfficeDashboard from './OfficeDashboard.jsx';
import InternshipRequests from './InternshipRequests.jsx';
import CompaniesPage from './CompaniesPage.jsx';
import FacultyPage from './FacultyPage.jsx';
import AssignmentPage from './AssignmentPage.jsx';
import OfficeEvaluation from './OfficeEvaluation.jsx';
import AnalyticsPage from './AnalyticsPage.jsx';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';

const officeNav = [
  { id:'dashboard',  label:'Dashboard',           icon:'fa-gauge' },
  { id:'requests',   label:'Internship Requests', icon:'fa-inbox' },
  { id:'agreements', label:'Agreement Requests',  icon:'fa-clipboard-check' },
  { id:'companies',  label:'Companies',            icon:'fa-building' },
  { id:'faculty',    label:'Faculty Supervisors', icon:'fa-user-check' },
  { id:'assignment', label:'Assignment',           icon:'fa-link' },
  { id:'evaluation', label:'Evaluation',           icon:'fa-file-pen' },
  { id:'analytics',  label:'Analytics',            icon:'fa-chart-line' },
];

export default function OfficePortal({ user, onLogout }) {
  const [page, setPage] = useState('dashboard');

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <OfficeDashboard />;
      case 'requests':   return <InternshipRequests />;
      case 'companies':  return <CompaniesPage />;
      case 'faculty':    return <FacultyPage />;
      case 'assignment': return <AssignmentPage />;
      case 'evaluation': return <OfficeEvaluation />;
      case 'analytics':  return <AnalyticsPage />;
      case 'agreements': return (
        <Card>
          <div className="text-sm font-bold text-primary mb-4">Agreement Requests</div>
          <Alert type="info">Review signed agreement forms submitted by students.</Alert>
        </Card>
            );
      default: return <OfficeDashboard />;
    }
  };

  return (
    <AppLayout user={user} onLogout={onLogout} activePage={page} setActivePage={setPage} navItems={officeNav}>
      {renderPage()}
    </AppLayout>
  );
}
