import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import { mockEvaluations } from '../../data/mockData.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';

export default function HODApprovals() {
  const [evals, setEvals] = useState(mockEvaluations.filter(e => e.status === 'Pending HOD'));
  const [selected, setSelected] = useState(null);

  const handleAction = (id, action) => {
    setEvals(evals.map(e => e.id === id ? { ...e, status: action === 'approve' ? 'Locked' : 'Returned' } : e));
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Pending Approval Queue</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Review student internship performance results for final departmental verification.</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-2 text-sm font-bold text-primary mb-5">
          <i className="fas fa-clock text-amber-500"></i> Verification Required
        </div>
        <DataTable columns={['Student','Reg. No.','Technical','Professional','Reports','Total','Status','Actions']}>
          {evals.map(e => (
            <TableRow key={e.id}>
              <TableCell><strong>{e.student}</strong></TableCell>
              <TableCell muted>{e.reg}</TableCell>
              <TableCell>{e.technical}</TableCell>
              <TableCell>{e.professional}</TableCell>
              <TableCell>{e.reports}</TableCell>
              <TableCell><strong className="text-primary">{e.total}/{e.maxTotal}</strong></TableCell>
              <TableCell><StatusBadge status={e.status} /></TableCell>
              <TableCell>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setSelected(e)}><i className="fas fa-eye"></i></Button>
                  <Button variant="success" size="sm" onClick={() => handleAction(e.id, 'approve')}><i className="fas fa-check"></i></Button>
                  <Button variant="danger-outline" size="sm" onClick={() => handleAction(e.id, 'return')}><i className="fas fa-rotate-left"></i></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Card>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <ModalTitle>Evaluation Review · {selected.student}</ModalTitle>
          <ModalSub>{selected.reg}</ModalSub>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[['Technical Skills', selected.technical, 50],
              ['Professional Conduct', selected.professional, 30],
              ['Reports', selected.reports, 40]].map(([l, v, m]) => (
              <div key={l} className="bg-lightbg rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1">{l}</div>
                <div className="text-xl font-extrabold text-primary">{v}</div>
                <div className="text-xs text-gray-400">out of {m}</div>
              </div>
            ))}
            <div className="bg-secondary text-white rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">Total Score</div>
              <div className="text-xl font-extrabold">{selected.total}</div>
              <div className="text-xs opacity-80">out of {selected.maxTotal}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <div className="flex gap-2">
              <Button variant="danger-outline" onClick={() => handleAction(selected.id, 'return')}>
                <i className="fas fa-rotate-left"></i> Return
              </Button>
              <Button variant="primary" onClick={() => handleAction(selected.id, 'approve')}>
                <i className="fas fa-check"></i> Approve & Lock
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
