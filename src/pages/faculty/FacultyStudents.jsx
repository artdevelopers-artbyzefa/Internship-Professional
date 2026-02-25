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
    <Card>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
        <div className="text-sm font-bold text-primary">My Students</div>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." />
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
  );
}
