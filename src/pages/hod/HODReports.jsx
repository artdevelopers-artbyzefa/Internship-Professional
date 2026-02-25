import React from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

export default function HODReports() {
  const reportTypes = ['Full Internship Report','Department Summary','Company-wise Report','Grade Sheet'];
  return (
    <Card>
      <div className="text-sm font-bold text-primary mb-5">Export Reports</div>
      <div className="flex gap-3 flex-wrap">
        {reportTypes.map(r => (
          <Button key={r} variant="outline"><i className="fas fa-file-export"></i> {r}</Button>
        ))}
      </div>
    </Card>
  );
}
