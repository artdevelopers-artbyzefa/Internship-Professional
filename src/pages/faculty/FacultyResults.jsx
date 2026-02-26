import React from 'react';
import Card from '../../components/ui/Card.jsx';
import { mockStudents } from '../../data/mockData.js';

export default function FacultyResults() {
  const withGrade = mockStudents.filter(s => s.grade);
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Final Results Archive</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Official performance records of students who have completed evaluation.</p>
        </div>
      </div>

      <Card>
        <div className="text-sm font-bold text-primary mb-4">Published Registry</div>
      {withGrade.map(s => (
        <div key={s.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
          <span className="text-xs text-gray-400 font-medium min-w-40">{s.name}</span>
          <strong className="text-primary">{s.grade}%</strong>
        </div>
      ))}
    </Card>
    </div>
  );
}
