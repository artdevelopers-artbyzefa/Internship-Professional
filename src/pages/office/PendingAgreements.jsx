import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextareaInput } from '../../components/ui/FormInput.jsx';

export default function PendingAgreements() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(null);
  const [comment, setComment] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const data = await apiRequest('/office/pending-agreements');
      setAgreements(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (studentId, decision) => {
    setDeciding(studentId);
    try {
      await apiRequest('/office/decide-agreement', {
        method: 'POST',
        body: { studentId, decision, comment }
      });
      setComment('');
      setSelectedAgreement(null);
      fetchAgreements();
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
      key: 'internshipAgreement', 
      label: 'Agreement Details',
      render: (agr, row) => (
        <div className="flex items-center justify-between gap-4">
          <div className="text-[10px] leading-tight max-w-[200px]">
            <div className="font-bold text-blue-700">{agr?.companyName}</div>
            <div><span className="text-gray-400">HR:</span> {agr?.companyHREmail}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setSelectedAgreement(row)}>
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
            placeholder="Add comments..." 
            className="text-[10px] p-2 border rounded outline-none focus:border-blue-400"
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
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Placement Verification</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Final audit and confirmation of student internship agreements (AppEx-B).</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary tracking-tight">Student Agreements Ledger</h3>
        </div>

      {error && <Alert type="danger" className="mb-4">{error}</Alert>}
      
      {agreements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed text-gray-400">
          <i className="fas fa-file-contract text-4xl mb-3"></i>
          <p>No pending student agreements found.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={agreements} />
      )}

      {selectedAgreement && (
        <Modal onClose={() => setSelectedAgreement(null)}>
          <ModalTitle>Internship Agreement Details</ModalTitle>
          <ModalSub>{selectedAgreement.name} ({selectedAgreement.reg})</ModalSub>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
            <div className="md:col-span-2">
                <h4 className="text-[10px] font-black text-gray-400 tracking-widest mb-2 border-b pb-1">01. Student Information</h4>
            </div>
            {[
              { label: 'Degree Program', value: selectedAgreement.internshipAgreement?.degreeProgram },
              { label: 'Semester', value: selectedAgreement.internshipAgreement?.semester },
              { label: 'Contact Number', value: selectedAgreement.internshipAgreement?.contactNumber },
              { label: 'Preferred Field', value: selectedAgreement.internshipAgreement?.preferredField },
            ].map(item => (
              <div key={item.label} className="p-3 bg-blue-50/50 rounded-xl border border-blue-50">
                <div className="text-[10px] font-bold text-blue-400">{item.label}</div>
                <div className="font-semibold text-primary">{item.value || 'N/A'}</div>
              </div>
            ))}

            <div className="md:col-span-2 mt-2">
                <h4 className="text-[10px] font-black text-gray-400 tracking-widest mb-2 border-b pb-1">02. Placement Information</h4>
            </div>
            {[
              { label: 'Company Name', value: selectedAgreement.internshipAgreement?.companyName },
              { label: 'Company Address', value: selectedAgreement.internshipAgreement?.companyAddress },
              { label: 'Registration #', value: selectedAgreement.internshipAgreement?.companyRegNo },
              { label: 'HR Email', value: selectedAgreement.internshipAgreement?.companyHREmail },
              { label: 'Supervisor Name', value: selectedAgreement.internshipAgreement?.companySupervisorName },
              { label: 'Supervisor Email', value: selectedAgreement.internshipAgreement?.companySupervisorEmail },
              { label: 'WhatsApp', value: selectedAgreement.internshipAgreement?.whatsappNumber },
              { label: 'Duration', value: selectedAgreement.internshipAgreement?.duration },
            ].map(item => (
              <div key={item.label} className="p-3 bg-gray-50 rounded-xl">
                <div className="text-[10px] font-bold text-gray-400">{item.label}</div>
                <div className="font-semibold text-gray-800">{item.value || 'N/A'}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
             <div className="text-[10px] font-bold text-blue-400 mb-1">Company Scope / Domain</div>
             <div className="text-sm text-blue-700 italic">
               {selectedAgreement.internshipAgreement?.companyScope}
             </div>
          </div>

          <hr className="my-6 border-gray-100" />

          <FormGroup label="Agreement Comments">
            <TextareaInput 
              placeholder="Add verification comments..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </FormGroup>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="success" className="flex-1"
              onClick={() => handleDecision(selectedAgreement._id, 'approve')}
              loading={deciding === selectedAgreement._id}
            >Verify & Approve</Button>
            <Button 
              variant="danger-outline" className="flex-1"
              onClick={() => handleDecision(selectedAgreement._id, 'reject')}
              loading={deciding === selectedAgreement._id}
            >Reject Agreement</Button>
          </div>
        </Modal>
      )}
    </div>
  </div>
  );
}
