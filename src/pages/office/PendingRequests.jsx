import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextareaInput } from '../../components/ui/FormInput.jsx';

export default function PendingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(null);
  const [comment, setComment] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await apiRequest('/office/pending-requests');
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (studentId, decision) => {
    if (decision === 'reject' && !comment) {
      alert('Please add a rejection reason in the comment box.');
      return;
    }
    
    setDeciding(studentId);
    try {
      await apiRequest('/office/decide-request', {
        method: 'POST',
        body: { studentId, decision, comment }
      });
      setComment('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeciding(null);
    }
  };

  const columns = [
    { key: 'reg', label: 'Reg #' },
    { key: 'name', label: 'Name' },
    { 
      key: 'internshipRequest', 
      label: 'Internship Details',
      render: (req, row) => (
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs">
            <div className="font-bold text-primary">{req?.type}</div>
            <div>{req?.companyName}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setSelectedRequest(row)}>
            Details
          </Button>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button 
              size="sm" variant="success" 
              onClick={() => handleDecision(row._id, 'approve')}
              loading={deciding === row._id}
            >Approve</Button>
            <Button 
              size="sm" variant="danger" 
              onClick={() => handleDecision(row._id, 'reject')}
              loading={deciding === row._id}
            >Reject</Button>
          </div>
          <input 
            type="text" 
            placeholder="Add comment..." 
            className="text-[10px] p-2 border rounded outline-none focus:border-blue-400 w-full"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      )
    }
  ];

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Placement Approvals</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Review and verify student internship placement requests (AppEx-A).</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary tracking-tight">Pending Requests Queue</h3>
        </div>

      {error && <Alert type="danger" className="mb-4">{error}</Alert>}
      
      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed text-gray-400">
          <i className="fas fa-inbox text-4xl mb-3"></i>
          <p>No pending internship requests found.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={requests} />
      )}

      {selectedRequest && (
        <Modal onClose={() => setSelectedRequest(null)}>
          <ModalTitle>Internship Request Details</ModalTitle>
          <ModalSub>{selectedRequest.name} ({selectedRequest.reg})</ModalSub>
          
          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-[10px] font-bold text-gray-400">Internship Type</div>
              <div className="font-semibold text-primary">{selectedRequest.internshipRequest?.type}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-[10px] font-bold text-gray-400">Company Name</div>
              <div className="font-semibold text-primary">{selectedRequest.internshipRequest?.companyName}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-[10px] font-bold text-gray-400">Duration</div>
              <div className="font-semibold text-primary">{selectedRequest.internshipRequest?.duration}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-[10px] font-bold text-gray-400">Mode</div>
              <div className="font-semibold text-primary">{selectedRequest.internshipRequest?.mode}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-[10px] font-bold text-gray-400">Start Date</div>
              <div className="font-semibold text-primary">{new Date(selectedRequest.internshipRequest?.startDate).toLocaleDateString()}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-[10px] font-bold text-gray-400">End Date</div>
              <div className="font-semibold text-primary">{new Date(selectedRequest.internshipRequest?.endDate).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="text-[10px] font-bold text-gray-400 mb-1">Description</div>
            <div className="text-xs text-gray-600 leading-relaxed italic">
              "{selectedRequest.internshipRequest?.description}"
            </div>
          </div>

          <hr className="my-6 border-gray-100" />

          <FormGroup label="Decision Comment">
            <TextareaInput 
              placeholder="Add comments for the student..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </FormGroup>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="success" className="flex-1"
              onClick={() => handleDecision(selectedRequest._id, 'approve')}
              loading={deciding === selectedRequest._id}
            >Approve Request</Button>
            <Button 
              variant="danger-outline" className="flex-1"
              onClick={() => handleDecision(selectedRequest._id, 'reject')}
              loading={deciding === selectedRequest._id}
            >Reject Request</Button>
          </div>
        </Modal>
      )}
    </div>
  </div>
  );
}
