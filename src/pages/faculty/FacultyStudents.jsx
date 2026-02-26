import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import SearchBar from '../../components/ui/SearchBar.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import { mockStudents } from '../../data/mockData.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';

export default function FacultyStudents() {
  const [search, setSearch] = useState('');
  const filtered = mockStudents.filter(s =>
    s.supervisor === 'Dr. Kamran Ahmed' &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Assigned Students</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Registry of interns under your academic supervision.</p>
        </div>
        <div className="flex items-center gap-3">
           <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="min-w-[280px]" />
           <Button variant="outline" size="sm" onClick={() => {}} className="p-2.5">
             <i className="fas fa-sync-alt"></i>
           </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="text-sm font-bold text-primary">Student Registry</div>
        </div>
      <DataTable columns={['Name','Reg. No.','Company','Status','Score','Actions']}>
        {filtered.map(s => (
          <TableRow key={s.id}>
            <TableCell><strong>{s.name}</strong></TableCell>
            <TableCell muted>{s.reg}</TableCell>
            <TableCell>{s.company}</TableCell>
            <TableCell><StatusBadge status={s.status} /></TableCell>
            <TableCell>
              {s.grade ? <strong className="text-primary">{s.grade}%</strong> : '—'}
            </TableCell>
            <TableCell>
              <Button variant="outline" size="sm"><i className="fas fa-eye"></i> View</Button>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
      </Card>
    </div>
  );
}
