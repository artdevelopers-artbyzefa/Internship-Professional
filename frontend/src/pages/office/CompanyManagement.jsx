import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

export default function CompanyManagement({ view, user }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorDictionary, setErrorDictionary] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedSupervisorForStudents, setSelectedSupervisorForStudents] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const initialForm = {
    name: '',
    address: '',
    regNo: '',
    scope: '',
    hrEmail: '',
    mouSignedDate: '',
    isMOUSigned: false,
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
      setCompanies(data || []);
    } catch (err) {
      // Handled by apiRequest
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const e = {};
    if (!validate.required(form.name)) e.name = 'Company name is required';
    if (!validate.required(form.regNo)) e.regNo = 'Registration number is required';
    if (!validate.required(form.mouSignedDate)) e.mouSignedDate = 'MOU date is required';

    const supervisorErrors = [];
    form.siteSupervisors.forEach((s, i) => {
      const sErr = {};
      if (!validate.required(s.name)) sErr.name = 'Name required';
      if (!validate.required(s.email)) sErr.email = 'Email required';
      else if (!validate.email(s.email)) sErr.email = 'Invalid email';
      if (!validate.required(s.whatsappNumber)) sErr.whatsapp = 'WhatsApp required';
      else if (!validate.phone(s.whatsappNumber)) sErr.whatsapp = 'Invalid format (e.g. +923001234567)';
      if (Object.keys(sErr).length > 0) supervisorErrors[i] = sErr;
    });

    if (supervisorErrors.length > 0) e.supervisors = supervisorErrors;

    setErrorDictionary(e);
    return Object.keys(e).length === 0;
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

  const handleEditInit = (company) => {
    setEditingCompanyId(company._id);
    setForm({
      ...company,
      mouSignedDate: company.mouSignedDate ? new Date(company.mouSignedDate).toISOString().split('T')[0] : ''
    });
    setShowAddForm(true);
    setErrorDictionary({});
  };

  const handleViewStudents = async (companyName, supervisorName, email) => {
    setSelectedSupervisorForStudents({ company: companyName, name: supervisorName });
    setShowStudentsModal(true);
    setFetchingStudents(true);
    try {
      let url = `/office/supervisor-students?company=${encodeURIComponent(companyName)}&supervisor=${encodeURIComponent(supervisorName)}`;
      if (email) url += `&email=${encodeURIComponent(email)}`;
      const data = await apiRequest(url);
      setStudentsList(data || []);
    } catch (err) {
      // handled
    } finally {
      setFetchingStudents(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast.warning('Please correct the errors in the form.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCompanyId) {
        await apiRequest(`/office/edit-company/${editingCompanyId}`, {
          method: 'POST',
          body: { ...form, officeId: user?.id || user?._id }
        });
        showToast.success('Company partner details updated successfully.');
      } else {
        await apiRequest('/office/add-company', {
          method: 'POST',
          body: { ...form, officeId: user?.id || user?._id }
        });
        showToast.success('Company MOU partner registered successfully.');
      }
      setShowAddForm(false);
      setEditingCompanyId(null);
      setForm(initialForm);
      setErrorDictionary({});
      fetchCompanies();
    } catch (err) {
      // Handled by apiRequest
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    const confirmed = await showAlert.confirm(
      'Deactivate Partner?',
      'Are you sure you want to deactivate this company partner? All associated supervisors will also be affected.',
      'Yes, Deactivate'
    );
    if (!confirmed) return;

    try {
      await apiRequest(`/office/delete-company/${id}`, {
        method: 'POST',
        body: { officeId: user?.id || user?._id }
      });
      showToast.success('Company partner deactivated.');
      fetchCompanies();
    } catch (err) {
      // Handled by apiRequest
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Company Name',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-800">{val}</span>
          {row.assignedStudents > 0 && <span className="text-[10px] text-blue-500 font-bold"><i className="fas fa-users mr-1"></i>{row.assignedStudents} assigned</span>}
        </div>
      )
    },
    { key: 'scope', label: 'Domain/Scope' },
    {
      key: 'siteSupervisors',
      label: 'Supervisors',
      render: (val, row) => (
        <div className="flex flex-col gap-1.5">
          {val?.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 hover:bg-blue-50/50 rounded-xl border border-gray-100 transition-all group/sup">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-gray-700 truncate">{s.name}</span>
                <span className="text-[9px] text-gray-400 font-bold truncate leading-tight">{s.email || 'No Email'}</span>
                {s.whatsappNumber && <span className="text-[8px] text-emerald-600 font-bold truncate">{s.whatsappNumber}</span>}
              </div>
              <button
                onClick={() => handleViewStudents(row.name, s.name, s.email)}
                className={`h-7 px-2 rounded-lg flex items-center gap-1.5 transition-all font-black text-[10px] ${s.assignedStudents > 0 ? 'bg-primary text-white shadow-sm hover:scale-105' : 'bg-gray-100 text-gray-300'}`}
                title={s.assignedStudents > 0 ? `View ${s.assignedStudents} assigned students` : "No placements yet"}
              >
                <i className="fas fa-users-rectangle"></i>
                {s.assignedStudents || 0}
              </button>
            </div>
          ))}
          {val?.length > 3 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-dashed border-gray-200 rounded-lg">
              <span className="text-[9px] text-gray-400 font-black italic">+{val.length - 3} others</span>
              <button onClick={() => handleEditInit(row)} className="text-[9px] font-black text-primary hover:underline">View All</button>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'source',
      label: 'Onboarding',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${val === 'manual' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
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
              title={isFromStudent ? "Self-Arranged companies cannot be edited by the office" : "Edit Details"}
              onClick={() => handleEditInit(row)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${isFromStudent ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed hidden' : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary cursor-pointer'}`}
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Company Registry</h2>
          <p className="text-xs md:text-sm text-gray-500">Manage institutional partners and student-submitted internship sites.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingCompanyId(null);
            setForm(initialForm);
          }}
          className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition-all h-fit ${showAddForm ? 'bg-gray-100 text-gray-600' : 'bg-primary text-white shadow-lg shadow-blue-600/20'}`}
        >
          <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} text-xs`}></i>
          <span className="text-sm">{showAddForm ? 'Close Form' : 'Register MOU'}</span>
        </button>
      </div>

      <div className={`grid transition-all duration-500 ease-in-out ${showAddForm ? 'grid-rows-[1fr] opacity-100 mb-10' : 'grid-rows-[0fr] opacity-0 mb-0 overflow-hidden'}`}>
        <div className="overflow-hidden">
          <div className="bg-gray-50/50 rounded-2xl border-2 border-primary/20 p-4 md:p-8 shadow-xl shadow-primary/5">
            <div className="mb-6">
              <h3 className="text-lg font-black text-primary tracking-tight">{editingCompanyId ? 'Update Company Details' : 'Register MOU Company'}</h3>
              <p className="text-xs text-gray-500 font-medium font-poppins">{editingCompanyId ? 'Modify official institutional partner information' : 'Add an official institutional partner for university-assigned internships'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormGroup label="Company Name" error={errorDictionary.name}>
                  <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Google Pakistan" />
                </FormGroup>
                <FormGroup label="Registration Number" error={errorDictionary.regNo}>
                  <TextInput value={form.regNo} onChange={e => setForm({ ...form, regNo: e.target.value })} placeholder="e.g. SECP-12345" />
                </FormGroup>
                <FormGroup label="Industry Scope">
                  <TextInput value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} placeholder="e.g. Software Development" />
                </FormGroup>
                <FormGroup label="MOU Signed Date" error={errorDictionary.mouSignedDate}>
                  <TextInput type="date" value={form.mouSignedDate} onChange={e => setForm({ ...form, mouSignedDate: e.target.value })} />
                </FormGroup>
                <FormGroup label="MOU Status">
                  <div className="flex items-center gap-3 h-[42px]">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isMOUSigned: !form.isMOUSigned })}
                      className={`flex-1 h-full rounded-xl border-2 flex items-center justify-center gap-2 font-black text-xs transition-all ${form.isMOUSigned ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                    >
                      <i className={`fas ${form.isMOUSigned ? 'fa-check-circle' : 'fa-circle-xmark'}`}></i>
                      {form.isMOUSigned ? 'MOU SIGNED' : 'UNSIGNED'}
                    </button>
                  </div>
                </FormGroup>
                <div className="md:col-span-2">
                  <FormGroup label="Office Address">
                    <TextInput value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Complete postal address" />
                  </FormGroup>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h4 className="text-[11px] font-black text-gray-400 tracking-widest uppercase">Site Supervisors</h4>
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
                    <div key={idx} className={`p-4 md:p-6 rounded-2xl border relative group transition-all ${errorDictionary.supervisors?.[idx] ? 'bg-red-50/30 border-red-100' : 'bg-white border-gray-200 shadow-sm'}`}>
                      {form.siteSupervisors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSupervisor(idx)}
                          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer border-0 text-[10px]"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormGroup label="Full Name" error={errorDictionary.supervisors?.[idx]?.name}>
                          <TextInput
                            size="sm"
                            value={s.name}
                            onChange={e => handleSupervisorChange(idx, 'name', e.target.value)}
                            placeholder="Supervisor Name"
                          />
                        </FormGroup>
                        <FormGroup label="Official Email" error={errorDictionary.supervisors?.[idx]?.email}>
                          <TextInput
                            size="sm"
                            type="email"
                            value={s.email}
                            onChange={e => handleSupervisorChange(idx, 'email', e.target.value)}
                            placeholder="name@company.com"
                          />
                        </FormGroup>
                        <FormGroup label="WhatsApp" error={errorDictionary.supervisors?.[idx]?.whatsapp}>
                          <TextInput
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

              <div className="flex flex-col md:flex-row gap-3 pt-6 border-t md:justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-8 py-3 rounded-xl font-bold border-2 border-gray-100 text-gray-500 hover:bg-gray-50 transition-all text-sm"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl font-bold bg-primary text-white hover:bg-blue-800 transition-all text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : editingCompanyId ? 'Save Changes' : 'Register & Activate Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <DataTable columns={columns} data={companies} />
      </div>
      {showStudentsModal && (
        <Modal onClose={() => setShowStudentsModal(false)} size="lg">
          <ModalTitle>Assigned Students: {selectedSupervisorForStudents?.name}</ModalTitle>
          <ModalSub>{selectedSupervisorForStudents?.company} · Technical Placement List</ModalSub>

          <div className="mt-8 max-h-[60vh] overflow-y-auto pr-2">
            {fetchingStudents ? (
              <div className="text-center py-10">
                <i className="fas fa-circle-notch fa-spin text-2xl text-primary mb-2 block"></i>
                <span className="text-xs text-gray-400 font-medium tracking-tight">Accessing company records...</span>
              </div>
            ) : studentsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Info</th>
                      <th className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration</th>
                      <th className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                      <th className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map((s, idx) => (
                      <tr key={idx} className="border-b border-gray-50/50 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                              {s.name?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-gray-800">{s.name}</span>
                              <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap">Semester {s.semester}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[10px] text-gray-600 font-bold">{s.reg}</td>
                        <td className="px-3 py-3 text-[10px] text-gray-500 font-medium">{s.email}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-black text-[8px] uppercase tracking-wider whitespace-nowrap">Active Intern</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50/30">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-200 text-3xl mx-auto mb-4 border border-gray-100 shadow-sm">
                  <i className="fas fa-user-slash"></i>
                </div>
                <p className="text-sm font-black text-gray-400">Registry Entry Empty</p>
                <p className="text-[10px] text-gray-300 font-medium mt-1">No students have been officially assigned to this supervisor yet.</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
