import React from 'react';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';

export default function HODDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">HOD Oversight Dashboard</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Final approval and quality assurance of internship evaluations (CS Dept).</p>
        </div>
      </div>

      <StatsGrid stats={[
        { icon:'fa-hourglass-half', cls:'yellow', val:'2',  label:'Pending Approvals' },
        { icon:'fa-circle-check',   cls:'green',  val:'31', label:'Approved Results' },
        { icon:'fa-rotate-left',    cls:'red',    val:'1',  label:'Returned' },
        { icon:'fa-lock',           cls:'blue',   val:'28', label:'Locked & Published' },
      ]} />
    </div>
  );
}
