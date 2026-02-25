import React from 'react';
import { StatCard } from '../../components/ui/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import UploadArea from '../../components/ui/UploadArea.jsx';

export default function StudentReports() {
  const reports = [
    { id:1, title:'Weekly Report 1', deadline:'Jan 14, 2025', status:'Submitted', file:'report1.pdf' },
    { id:2, title:'Weekly Report 2', deadline:'Jan 21, 2025', status:'Submitted', file:'report2.pdf' },
    { id:3, title:'Weekly Report 3', deadline:'Jan 28, 2025', status:'Submitted', file:'report3.pdf' },
    { id:4, title:'Weekly Report 4', deadline:'Feb 4, 2025',  status:'Pending',   file:null },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-5">
        {[{ icon:'fa-cloud-arrow-up', cls:'blue', val:'3', lbl:'Submitted' },
          { icon:'fa-clock', cls:'yellow', val:'1', lbl:'Pending' }].map((s, i) => (
          <StatCard key={i} icon={s.icon} colorClass={s.cls} value={s.val} label={s.lbl} />
        ))}
      </div>

      <Card>
        <div className="text-sm font-bold text-primary mb-5">Report Submissions</div>
        {reports.map(r => (
          <div key={r.id} className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lightbg rounded-xl flex items-center justify-center text-secondary">
                <i className="fas fa-file-pdf text-lg"></i>
              </div>
              <div>
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="text-xs text-gray-400">Deadline: {r.deadline}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={r.status} />
              {r.status === 'Pending'
                ? <Button variant="primary" size="sm"><i className="fas fa-cloud-arrow-up"></i> Upload</Button>
                : <Button variant="outline" size="sm"><i className="fas fa-eye"></i> View</Button>}
            </div>
          </div>
        ))}
        <UploadArea label="Drag & drop your report here" hint="or click to browse · PDF, DOCX (max 10MB)" />
      </Card>
    </>
  );
}
