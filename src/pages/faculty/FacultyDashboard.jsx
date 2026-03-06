import React from 'react';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';

export default function FacultyDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Supervisor Dashboard</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Academic oversight and evaluation management for assigned interns.</p>
        </div>
      </div>
      
      <NoticeModal />
      
      <StatsGrid stats={[
        { icon:'fa-users',         cls:'blue',   val:'Active',  label:'Assigned Students' },
        { icon:'fa-file-lines',    cls:'green',  val:'Ready',   label:'Assignments Reviewed' },
        { icon:'fa-clipboard-list',cls:'yellow', val:'Pending', label:'Evaluations' },
        { icon:'fa-award',         cls:'purple', val:'Track',   label:'Results' },
      ]} />
    </div>
  );
}


