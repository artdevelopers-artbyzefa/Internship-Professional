import React from 'react';
import Card from '../../components/ui/Card.jsx';
import { mockStudents } from '../../data/mockData.js';

export default function FacultyResults() {
  const withGrade = mockStudents.filter(s => s.grade);
  return (
    <Card>
      <div className="text-sm font-bold text-primary mb-4">Published Results</div>
      {withGrade.map(s => (
        <div key={s.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
          <span className="text-xs text-gray-400 font-medium min-w-40">{s.name}</span>
          <strong className="text-primary">{s.grade}%</strong>
        </div>
      ))}
    </Card>
  );
}
