import React from 'react';
import { StatsGrid } from '../../components/ui/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';

export default function AnalyticsPage() {
  const barData = [
    { dept:'CS', total:40, approved:35, rejected:5 },
    { dept:'SE', total:28, approved:24, rejected:4 },
    { dept:'EE', total:20, approved:17, rejected:3 },
    { dept:'ME', total:15, approved:12, rejected:3 },
  ];

  return (
    <>
      <StatsGrid stats={[
        { icon:'fa-users',       cls:'blue',   val:'103', label:'Total Students' },
        { icon:'fa-check-circle',cls:'green',  val:'88',  label:'Approved' },
        { icon:'fa-xmark-circle',cls:'red',    val:'10',  label:'Rejected' },
        { icon:'fa-clock',       cls:'yellow', val:'5',   label:'Pending' },
      ]} />

      <Card>
        <div className="text-sm font-bold text-primary mb-5">Department-wise Internship Statistics</div>
        {barData.map(d => (
          <div key={d.dept} className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold">{d.dept} Department</span>
              <span className="text-xs text-gray-400">{d.approved}/{d.total} approved</span>
            </div>
            <ProgressBar value={d.approved} max={d.total} />
          </div>
        ))}
      </Card>
    </>
  );
}
