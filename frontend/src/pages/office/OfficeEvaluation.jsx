import React from 'react';
import Card from '../../components/ui/Card.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import { mockEvaluations } from '../../data/mockData.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';

export default function OfficeEvaluation() {
  return (
    <Card>
      <div className="text-sm font-bold text-primary mb-5">Evaluation Management</div>
      <DataTable columns={['Student','Reg. No.','Technical','Professional','Reports','Total','Status']}>
        {mockEvaluations.map(e => (
          <TableRow key={e.id}>
            <TableCell><strong>{e.student}</strong></TableCell>
            <TableCell muted>{e.reg}</TableCell>
            <TableCell>{e.technical}/50</TableCell>
            <TableCell>{e.professional}/30</TableCell>
            <TableCell>{e.reports}/40</TableCell>
            <TableCell><strong className="text-primary">{e.total}/{e.maxTotal}</strong></TableCell>
            <TableCell><StatusBadge status={e.status} /></TableCell>
          </TableRow>
        ))}
      </DataTable>
    </Card>
  );
}
