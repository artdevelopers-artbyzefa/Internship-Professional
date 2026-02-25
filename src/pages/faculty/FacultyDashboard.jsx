import React from 'react';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';

export default function FacultyDashboard({ user }) {
  return (
    <>
      <NoticeModal />
      <WelcomeBanner
        title="Faculty Supervisor Portal"
        subtitle="Manage your assigned students and evaluations · Key announcements will appear here"
      />
      
      <StatsGrid stats={[
        { icon:'fa-users',         cls:'blue',   val:'Active',  label:'Assigned Students' },
        { icon:'fa-file-lines',    cls:'green',  val:'Ready',   label:'Reports Reviewed' },
        { icon:'fa-clipboard-list',cls:'yellow', val:'Pending', label:'Evaluations' },
        { icon:'fa-award',         cls:'purple', val:'Track',   label:'Results' },
      ]} />
    </>
  );
}


