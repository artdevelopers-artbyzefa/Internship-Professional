import React from 'react';
import Card from '../../components/ui/Card.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';

export default function FacultyPage() {
  const facultyMembers = [
    { name:'Dr. Kamran Ahmed', dept:'CS', assigned:3 },
    { name:'Dr. Amna Shah',    dept:'CS', assigned:2 },
    { name:'Dr. Farhan Zafar', dept:'CS', assigned:1 },
  ];
  return (
    <Card>
      <div className="text-sm font-bold text-primary mb-5">Faculty Supervisors</div>
      <DataTable columns={['Name','Department','Assigned Students','Actions']}>
        {facultyMembers.map((f, i) => (
          <TableRow key={i}>
            <TableCell><strong>{f.name}</strong></TableCell>
            <TableCell>{f.dept}</TableCell>
            <TableCell>{f.assigned}</TableCell>
            <TableCell><Button variant="outline" size="sm"><i className="fas fa-eye"></i></Button></TableCell>
          </TableRow>
        ))}
      </DataTable>
    </Card>
  );
}
