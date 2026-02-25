import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import SearchBar from '../../components/ui/SearchBar.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import { mockRequests } from '../../data/mockData.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextareaInput } from '../../components/ui/FormInput.jsx';

export default function InternshipRequests() {
  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState('');
  const [data, setData] = useState(mockRequests);

  const handleAction = (id, action) => {
    setData(data.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' } : r));
    setModal(null);
  };

  return (
    <>
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div>
            <div className="text-sm font-bold text-primary">Internship Requests</div>
            <div className="text-xs text-gray-400 mt-1">Manage student internship applications</div>
          </div>
          <SearchBar value="" onChange={() => {}} placeholder="Search students..." />
        </div>
        <DataTable columns={['Student','Reg. No.','Company','Start Date','Duration','Status','Actions']}>
          {data.map(r => (
            <TableRow key={r.id}>
              <TableCell><strong>{r.student}</strong></TableCell>
              <TableCell muted>{r.reg}</TableCell>
              <TableCell>{r.company}</TableCell>
              <TableCell>{r.startDate}</TableCell>
              <TableCell>{r.duration}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell>
                <div className="flex gap-1.5">
                  {r.status === 'Pending' && <>
                    <Button variant="success" size="sm" onClick={() => handleAction(r.id, 'approve')}><i className="fas fa-check"></i></Button>
                    <Button variant="danger-outline" size="sm" onClick={() => setModal(r)}><i className="fas fa-xmark"></i></Button>
                  </>}
                  {r.status !== 'Pending' && <Button variant="outline" size="sm"><i className="fas fa-eye"></i></Button>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Card>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          <ModalTitle>Reject Internship Request</ModalTitle>
          <ModalSub>You are rejecting the request for {modal.student}</ModalSub>
          <FormGroup label="Rejection Reason">
            <TextareaInput rows={3} placeholder="Enter reason for rejection..."
              value={comment} onChange={e => setComment(e.target.value)} />
          </FormGroup>
          <div className="flex items-center justify-between mt-2">
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="danger-outline" onClick={() => handleAction(modal.id, 'reject')}>
              <i className="fas fa-xmark"></i> Reject Request
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
