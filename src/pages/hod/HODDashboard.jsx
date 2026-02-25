import React from 'react';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';

export default function HODDashboard() {
  return (
    <>
      <WelcomeBanner
        title="HOD Dashboard · Department of Computer Science"
        subtitle="Review and approve student evaluation results"
      />
      <StatsGrid stats={[
        { icon:'fa-hourglass-half', cls:'yellow', val:'2',  label:'Pending Approvals' },
        { icon:'fa-circle-check',   cls:'green',  val:'31', label:'Approved Results' },
        { icon:'fa-rotate-left',    cls:'red',    val:'1',  label:'Returned' },
        { icon:'fa-lock',           cls:'blue',   val:'28', label:'Locked & Published' },
      ]} />
    </>
  );
}
