import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { FormGroup, SelectInput } from '../../components/ui/FormInput.jsx';
import { mockStudents, facultyList, mockCompanies } from '../../data/mockData.js';
import Button from '../../components/ui/Button.jsx';

export default function AssignmentPage() {
  const [sel, setSel] = useState({ student: '', faculty: '', company: '' });

  return (
    <Card>
      <div className="flex items-center gap-2 text-sm font-bold text-primary mb-4">
        <i className="fas fa-link text-secondary"></i> Assign Faculty Supervisor
      </div>
      <Alert type="info">Select student and faculty to create a supervision assignment.</Alert>

      {[
        { label:'Select Student',           key:'student', icon:'fa-user-graduate',  opts: mockStudents.map(s => s.name) },
        { label:'Assign Faculty Supervisor', key:'faculty', icon:'fa-chalkboard-user',opts: facultyList },
        { label:'Internship Company',        key:'company', icon:'fa-building',       opts: mockCompanies.map(c => c.name) },
      ].map(f => (
        <FormGroup key={f.key} label={f.label}>
          <SelectInput iconLeft={f.icon} value={sel[f.key]} onChange={e => setSel({ ...sel, [f.key]: e.target.value })}>
            <option value="">-- Select --</option>
            {f.opts.map(o => <option key={o}>{o}</option>)}
          </SelectInput>
        </FormGroup>
      ))}

      {sel.student && sel.faculty && (
        <Alert type="success">{sel.student} will be supervised by {sel.faculty}</Alert>
      )}

      <Button variant="primary"><i className="fas fa-save"></i> Save Assignment</Button>
    </Card>
  );
}
