import React, { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import { mockCompanies } from '../../data/mockData.js';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState(mockCompanies);
  const [showAdd, setShowAdd] = useState(false);
  const [supervisors, setSupervisors] = useState(['']);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" onClick={() => setShowAdd(true)}><i className="fas fa-plus"></i> Add Company</Button>
      </div>

      <Card>
        <div className="text-sm font-bold text-primary mb-4">Partner Companies</div>
        <DataTable columns={['#','Company','Sector','City','Supervisors','Actions']}>
          {companies.map((c, i) => (
            <TableRow key={c.id}>
              <TableCell muted>{i + 1}</TableCell>
              <TableCell><strong>{c.name}</strong></TableCell>
              <TableCell>{c.sector}</TableCell>
              <TableCell>{c.city}</TableCell>
              <TableCell><span className="text-xs">{c.supervisors.length} supervisors</span></TableCell>
              <TableCell>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm"><i className="fas fa-pen"></i></Button>
                  <Button variant="outline" size="sm"><i className="fas fa-eye"></i></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Card>

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)}>
          <ModalTitle>Add New Company</ModalTitle>
          <ModalSub>Enter company details and site supervisors</ModalSub>
          {[['Company Name','fa-building'],['Industry/Sector','fa-industry'],['City','fa-map-pin'],['Contact Email','fa-envelope']].map(([l,ic]) => (
            <FormGroup key={l} label={l}>
              <TextInput iconLeft={ic} placeholder={l} value="" onChange={() => {}} />
            </FormGroup>
          ))}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Site Supervisors</label>
              <Button variant="outline" size="sm" onClick={() => setSupervisors([...supervisors, ''])}>
                <i className="fas fa-plus"></i> Add
              </Button>
            </div>
            {supervisors.map((s, i) => (
              <div key={i} className="mb-2">
                <TextInput iconLeft="fa-user-tie" placeholder={`Supervisor ${i + 1} name`} value="" onChange={() => {}} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setShowAdd(false)}><i className="fas fa-save"></i> Save Company</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
