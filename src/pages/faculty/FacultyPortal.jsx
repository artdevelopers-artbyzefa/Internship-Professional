import React, { useState } from 'react';
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
  const [page, setPage] = useState(() => sessionStorage.getItem('faculty_page') || 'dashboard');

  const handlePageChange = (newPage) => {
    setPage(newPage);
    sessionStorage.setItem('faculty_page', newPage);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <FacultyDashboard user={user} />;
      case 'students':   return <FacultyStudents />;
      case 'reports':    return <FacultyReports />;
      case 'add-marks':   return <AddMarks user={user} />;
      case 'evaluation': return <FacultyEvaluation />;
      case 'results':    return <FacultyResults />;
      default:           return <FacultyDashboard user={user} />;
    }
  };

  return (
    <AppLayout user={user} onLogout={onLogout} activePage={page} setActivePage={handlePageChange} navItems={facultyNav}>
      {renderPage()}
    </AppLayout>
  );
}
