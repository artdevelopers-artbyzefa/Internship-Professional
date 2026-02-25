import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';

export default function CompanyManagement({ view }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const initialForm = {
    name: '',
    address: '',
    regNo: '',
    scope: '',
    hrEmail: '',
    mouSignedDate: '',
    siteSupervisors: [
      { name: '', email: '', whatsappNumber: '' }
    ]
  };

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await apiRequest('/office/companies');
      setCompanies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSupervisor = () => {
    setForm({
      ...form,
      siteSupervisors: [...form.siteSupervisors, { name: '', email: '', whatsappNumber: '' }]
    });
  };

  const removeSupervisor = (index) => {
    const list = [...form.siteSupervisors];
    list.splice(index, 1);
    setForm({ ...form, siteSupervisors: list });
  };

  const handleSupervisorChange = (index, field, value) => {
    const list = [...form.siteSupervisors];
    list[index][field] = value;
    setForm({ ...form, siteSupervisors: list });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/office/add-company', {
        method: 'POST',
        body: { ...form, officeId: user.id || user._id }
      });
      setShowAddModal(false);
      setForm(initialForm);
      fetchCompanies();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this company partner?')) return;
    try {
        await apiRequest(`/office/delete-company/${id}`, {
            method: 'POST',
            body: { officeId: user.id || user._id }
        });
        fetchCompanies();
    } catch (err) {
        alert(err.message);
    }
  };

  const columns = [
    { key: 'name', label: 'Company Name' },
    { key: 'scope', label: 'Domain/Scope' },
    { 
        key: 'siteSupervisors', 
        label: 'Supervisors',
        render: (val) => (
            <div className="flex flex-col gap-1">
                {val?.slice(0, 2).map((s, i) => (
                    <span key={i} className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        {s.name}
                    </span>
                ))}
                {val?.length > 2 && <span className="text-[9px] text-primary italic">+{val.length - 2} more</span>}
            </div>
        )
    },
    { 
      key: 'source', 
      label: 'Onboarding',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${val === 'manual' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
          {val === 'manual' ? 'Official Partner' : 'Student Lead'}
        </span>
      )
    },
    {
      key: 'isMOUSigned',
      label: 'MOU Status',
      render: (val) => (
        <div className={`flex items-center gap-1.5 font-bold text-xs ${val ? 'text-green-500' : 'text-gray-400'}`}>
          <i className={`fas ${val ? 'fa-file-circle-check' : 'fa-file-circle-xmark'}`}></i>
          {val ? 'MOU Signed' : 'No MOU'}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const isFromStudent = row.source === 'student_submission';
        return (
          <div className="flex gap-2">
            <button 
              disabled={isFromStudent}
              title={isFromStudent ? "Self-Arranged companies cannot be edited by the office" : "Edit Details"}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${isFromStudent ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary cursor-pointer'}`}
            >
              <i className="fas fa-pen-to-square text-xs"></i>
            </button>
            <button 
                onClick={() => handleDeleteCompany(row._id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:border-danger hover:text-danger cursor-pointer transition-all"
            >
              <i className="fas fa-trash-can text-xs"></i>
            </button>
          </div>
        );
      }
    }
  ];

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Company Registry</h2>
          <p className="text-sm text-gray-500">Manage institutional partners and student-submitted internship sites.</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <i className="fas fa-plus mr-2"></i> Register MOU Partner
        </Button>
      </div>

      {error && <Alert type="danger" className="mb-4">{error}</Alert>}

      <DataTable columns={columns} data={companies} />

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} className="max-w-3xl">
          <ModalTitle>Register MOU Company</ModalTitle>
          <ModalSub>Add an official institutional partner for university-assigned internships</ModalSub>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <FormGroup label="Company Name">
                <TextInput required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Google Pakistan" />
              </FormGroup>
              <FormGroup label="Registration Number">
                <TextInput required value={form.regNo} onChange={e => setForm({...form, regNo: e.target.value})} placeholder="e.g. SECP-12345" />
              </FormGroup>
              <FormGroup label="Industry Scope">
                <TextInput value={form.scope} onChange={e => setForm({...form, scope: e.target.value})} placeholder="e.g. Software Development" />
              </FormGroup>
              <FormGroup label="MOU Signed Date">
                <TextInput type="date" required value={form.mouSignedDate} onChange={e => setForm({...form, mouSignedDate: e.target.value})} />
              </FormGroup>
              <div className="col-span-2">
                <FormGroup label="Office Address">
                    <TextInput value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Complete postal address" />
                </FormGroup>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Site Supervisors</h4>
                <button 
                  type="button" 
                  onClick={addSupervisor}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
                >
                  <i className="fas fa-plus-circle"></i> Add Supervisor
                </button>
              </div>

              <div className="space-y-4">
                {form.siteSupervisors.map((s, idx) => (
                  <div key={idx} className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 relative group">
                    {form.siteSupervisors.length > 1 && (
                        <button 
                            type="button"
                            onClick={() => removeSupervisor(idx)}
                            className="absolute top-4 right-4 w-6 h-6 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer border-0 text-[10px]"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <FormGroup label="Full Name">
                        <TextInput 
                            required 
                            size="sm"
                            value={s.name} 
                            onChange={e => handleSupervisorChange(idx, 'name', e.target.value)} 
                            placeholder="Supervisor Name"
                        />
                      </FormGroup>
                      <FormGroup label="Official Email">
                        <TextInput 
                            required 
                            size="sm"
                            type="email" 
                            value={s.email} 
                            onChange={e => handleSupervisorChange(idx, 'email', e.target.value)} 
                            placeholder="name@company.com"
                        />
                      </FormGroup>
                      <FormGroup label="WhatsApp">
                        <TextInput 
                            required 
                            size="sm"
                            value={s.whatsappNumber} 
                            onChange={e => handleSupervisorChange(idx, 'whatsappNumber', e.target.value)} 
                            placeholder="+92..."
                        />
                      </FormGroup>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button variant="outline" block onClick={() => setShowAddModal(false)}>Discard</Button>
              <Button variant="primary" block type="submit" loading={submitting}>Register & Activate Partner</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
