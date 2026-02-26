import React from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

export default function HODReports() {
  const reportTypes = ['Full Internship Report','Department Summary','Company-wise Report','Grade Sheet'];
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Departmental Intelligence</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Generate and export comprehensive internship analytics and performance reports.</p>
        </div>
      </div>

      <Card>
        <div className="text-sm font-bold text-primary mb-5">Available Report Modules</div>
      <div className="flex gap-3 flex-wrap">
        {reportTypes.map(r => (
          <Button key={r} variant="outline"><i className="fas fa-file-export"></i> {r}</Button>
        ))}
      </div>
    </Card>
    </div>
  );
}
