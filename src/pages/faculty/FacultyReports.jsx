import React from 'react';
import Card from '../../components/ui/Card.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import { mockReports } from '../../data/mockData.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';

export default function FacultyReports() {
  return (
    <Card>
      <div className="text-sm font-bold text-primary mb-5">Student Reports</div>
      <DataTable columns={['Student','Report','Submitted','Status','Actions']}>
        {mockReports.map(r => (
          <TableRow key={r.id}>
            <TableCell>{r.student}</TableCell>
            <TableCell>{r.type}</TableCell>
            <TableCell>{r.submitted || '—'}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell>
              {r.submitted && <Button variant="outline" size="sm"><i className="fas fa-eye"></i></Button>}
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </Card>
  );
}
