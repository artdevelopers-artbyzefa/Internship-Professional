import React from 'react';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';

export default function StudentDashboard({ user }) {
  return (
    <>
      <NoticeModal />
      <WelcomeBanner
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Student'}! 👋`}
        subtitle="Your internship progress is being monitored · Key announcements will appear as they arrive"
      />

      <StatsGrid stats={[
        { icon:'fa-building',         cls:'blue',   val:'Connected', label:'Company' },
        { icon:'fa-chalkboard-user',  cls:'green',  val:'Assigned',label:'Supervisor' },
        { icon:'fa-file-lines',       cls:'yellow', val:'Progress', label:'Reports' },
        { icon:'fa-chart-column',     cls:'purple', val:'Status',   label:'Current Score' },
      ]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm font-bold text-primary">
              <i className="fas fa-info-circle text-secondary mr-2"></i>Internship Status
            </div>
            <StatusBadge status="Approved" />
          </div>
          {[
            ['Company','TechSoft Pvt Ltd'],['City','Islamabad'],['Start Date','Feb 1, 2025'],
            ['End Date','Mar 29, 2025'],['Duration','8 Weeks'],['Mode','On-site'],
          ].map(([l, v]) => (
            <div key={l} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-400 font-medium min-w-28">{l}</span>
              <span className="text-sm text-gray-700 font-medium">{v}</span>
            </div>
          ))}
        </Card>

        <Card>
          <div className="text-sm font-bold text-primary mb-5">
            <i className="fas fa-tasks text-secondary mr-2"></i>Progress Tracker
          </div>
          {[
            ['Internship Form','Submitted',100],
            ['Agreement Form','Signed',100],
            ['Weekly Reports','3 of 4',75],
            ['Final Evaluation','Pending',0],
          ].map(([l, s, p]) => (
            <div key={l} className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{l}</span>
                <span className="text-xs text-gray-400">{s}</span>
              </div>
              <ProgressBar value={p} />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
