import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

// Inline expandable student row per faculty
function FacultyRow({ fac, onEdit, onDeactivate, onResendLink, onResetPassword, resending, resetting }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const toggle = async () => {
    if (!open && !fetched) {
      setLoading(true);
      try {
        const data = await apiRequest(`/office/faculty-students/${fac._id}`);
        setStudents(data || []);
        setFetched(true);
      } catch { /* handled */ }
      finally { setLoading(false); }
    }
    setOpen(o => !o);
  };

  const statusStyle = fac.status === 'Active'
    ? 'bg-green-50 text-green-600'
    : fac.status === 'Pending Activation'
      ? 'bg-amber-50 text-amber-600'
      : 'bg-red-50 text-red-600';

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs flex-shrink-0">
              {fac.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-bold text-gray-800">{fac.name}</span>
          </div>
        </td>
        <td className="px-5 py-4 text-xs text-gray-500 font-medium">{fac.email}</td>
        <td className="px-5 py-4 text-xs text-gray-500 font-medium">{fac.whatsappNumber || '—'}</td>
        <td className="px-5 py-4">
          <button
            onClick={toggle}
            disabled={!fac.assignedStudents}
            className={`h-7 px-3 rounded-lg flex items-center gap-1.5 transition-all font-black text-[10px] ${fac.assignedStudents > 0
              ? 'bg-blue-600 text-white shadow-sm hover:scale-105 cursor-pointer'
              : 'bg-gray-100 text-gray-300 cursor-default'}`}
            title={fac.assignedStudents > 0 ? 'Click to view assigned students' : 'No students assigned'}
          >
            <i className={`fas ${open ? 'fa-chevron-up' : 'fa-users-viewfinder'} text-[9px]`}></i>
            {fac.assignedStudents || 0}
          </button>
        </td>
        <td className="px-5 py-4">
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusStyle}`}>{fac.status}</span>
        </td>
        <td className="px-5 py-4">
          <div className="flex gap-2">
            {fac.status === 'Active' ? (
              <button
                title="Reset Password"
                onClick={() => onResetPassword(fac)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-amber-600 hover:border-amber-500 hover:bg-amber-50 cursor-pointer transition-all ${resetting === fac._id ? 'animate-pulse' : ''}`}
              >
                <i className="fas fa-key text-xs"></i>
              </button>
            ) : (
              <button
                title="Resend Activation"
                onClick={() => onResendLink(fac)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-primary hover:border-primary hover:bg-blue-50 cursor-pointer transition-all ${resending === fac._id ? 'animate-pulse' : ''}`}
              >
                <i className="fas fa-paper-plane text-xs"></i>
              </button>
            )}
            <button
              title="Edit Details"
              onClick={() => onEdit(fac)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary cursor-pointer transition-all"
            >
              <i className="fas fa-pen-to-square text-xs"></i>
            </button>
            <button
              title="Deactivate"
              onClick={() => onDeactivate(fac._id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:border-red-500 hover:text-red-500 cursor-pointer transition-all"
            >
              <i className="fas fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>

      {/* Inline student dropdown */}
      {open && (
        <tr>
          <td colSpan={6} className="px-5 pb-4 pt-0">
            <div className="bg-gray-50/70 rounded-2xl border border-gray-100 p-4 animate-in slide-in-from-top-2 duration-200">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                <i className="fas fa-user-graduate mr-1.5"></i>
                Students under {fac.name}
              </p>
              {loading ? (
                <div className="py-6 text-center">
                  <i className="fas fa-circle-notch fa-spin text-primary text-xl"></i>
                </div>
              ) : students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Information</th>
                        <th className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration</th>
                        <th className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                        <th className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => (
                        <tr key={idx} className="border-b border-gray-50/50 hover:bg-white transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-[10px]">
                                {s.name?.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-gray-800">{s.name}</span>
                                <span className="text-[9px] text-gray-400 font-medium">Semester {s.semester}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[10px] text-gray-600 font-bold">{s.reg}</td>
                          <td className="px-3 py-3 text-[10px] text-gray-500 font-medium">{s.email}</td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-black text-[8px] uppercase tracking-wider">Active</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-medium text-center py-4">No students assigned yet.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function FacultyManagement({ user }) {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorDictionary, setErrorDictionary] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', whatsappNumber: '' });
  const [editingFaculty, setEditingFaculty] = useState(null);

  useEffect(() => { fetchFaculty(); }, []);

  const fetchFaculty = async () => {
    try {
      const data = await apiRequest('/auth/faculty-list');
      setFaculty(data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  const handleValidation = () => {
    const e = {};
    if (!validate.required(form.name)) e.name = 'Full name is required';
    if (!validate.required(form.email)) e.email = 'Email is required';
    else if (!validate.email(form.email)) e.email = 'Invalid email format';
    if (!validate.required(form.whatsappNumber)) e.whatsappNumber = 'WhatsApp number is required';
    else if (!validate.phone(form.whatsappNumber)) e.whatsappNumber = 'Invalid format (e.g. +923001234567)';
    setErrorDictionary(e);
    return Object.keys(e).length === 0;
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!handleValidation()) return;
    setSubmitting(true);
    try {
      await apiRequest('/office/onboard-faculty', {
        method: 'POST',
        body: { ...form, officeId: user.id || user._id }
      });
      setForm({ name: '', email: '', whatsappNumber: '' });
      showToast.success('Faculty supervisor nominated successfully.');
      setShowAddForm(false);
      fetchFaculty();
    } catch { /* handled */ }
    finally { setSubmitting(false); }
  };

  const handleEditInit = (fac) => {
    setEditingFaculty(fac);
    setForm({ name: fac.name, email: fac.email, whatsappNumber: fac.whatsappNumber });
    setErrorDictionary({});
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validate.required(form.name) || !validate.phone(form.whatsappNumber)) {
      showToast.warning('Please fill all fields correctly');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest(`/office/edit-faculty/${editingFaculty._id}`, {
        method: 'PUT',
        body: { name: form.name, whatsappNumber: form.whatsappNumber, officeId: user.id || user._id }
      });
      showToast.success('Faculty details updated successfully.');
      setShowEditModal(false);
      fetchFaculty();
    } catch { /* handled */ }
    finally { setSubmitting(false); }
  };

  const handleDeactivate = async (id) => {
    const confirmed = await showAlert.confirm('Are you sure?', 'You want to deactivate this faculty supervisor?', 'Yes, Deactivate');
    if (!confirmed) return;
    try {
      await apiRequest(`/office/delete-faculty/${id}`, { method: 'POST', body: { officeId: user.id || user._id } });
      showToast.success('Faculty supervisor deactivated.');
      fetchFaculty();
    } catch { /* handled */ }
  };

  const handleResetPassword = async (fac) => {
    const confirmed = await showAlert.confirm('Reset Password?', `Reset password for ${fac.name}? A temporary password will be emailed.`, 'Yes, Reset');
    if (!confirmed) return;
    setResetting(fac._id);
    try {
      await apiRequest(`/office/reset-faculty-password/${fac._id}`, { method: 'POST', body: { officeId: user.id || user._id } });
      showAlert.success('Password Reset', 'Temporary password sent via email.');
    } catch { /* handled */ }
    finally { setResetting(null); }
  };

  const handleResendLink = async (fac) => {
    setResending(fac._id);
    try {
      await apiRequest('/office/resend-faculty-activation', { method: 'POST', body: { facultyId: fac._id, officeId: user.id || user._id } });
      showToast.success('Activation link resent successfully.');
    } catch { /* handled */ }
    finally { setResending(null); }
  };

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Faculty Supervisor Registry</h2>
          <p className="text-sm text-gray-500">Nominate, monitor, and manage academic supervisors.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all h-fit ${showAddForm ? 'bg-gray-100 text-gray-600' : 'bg-primary text-white shadow-lg shadow-blue-600/20'}`}
        >
          <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} text-xs`}></i>
          <span className="text-sm">{showAddForm ? 'Close Form' : 'Nominate Faculty'}</span>
        </button>
      </div>

      {/* Add Form */}
      <div className={`grid transition-all duration-500 ease-in-out ${showAddForm ? 'grid-rows-[1fr] opacity-100 mb-10' : 'grid-rows-[0fr] opacity-0 mb-0 overflow-hidden'}`}>
        <div className="overflow-hidden">
          <div className="bg-gray-50/50 rounded-3xl border-2 border-primary/20 p-8 shadow-xl shadow-primary/5">
            <h3 className="text-xs font-black text-primary tracking-widest mb-6 border-b border-primary/10 pb-2 uppercase">Official Nomination Form</h3>
            <form onSubmit={handleOnboard} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup label="Full Name" error={errorDictionary.name}>
                  <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} iconLeft="fa-user" placeholder="Enter Full Name" />
                </FormGroup>
                <FormGroup label="WhatsApp Number" error={errorDictionary.whatsappNumber}>
                  <TextInput value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-brands fa-whatsapp" placeholder="+92..." />
                </FormGroup>
                <div className="md:col-span-2">
                  <FormGroup label="Official Email Address" error={errorDictionary.email}>
                    <TextInput type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} iconLeft="fa-envelope" placeholder="faculty@cuiatd.edu.pk" />
                  </FormGroup>
                </div>
              </div>
              <div className="flex gap-3 pt-4 justify-end">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-8 py-3 rounded-xl font-bold border-2 border-gray-100 text-gray-500 hover:bg-gray-50 transition-all text-sm">Discard</button>
                <button type="submit" disabled={submitting} className="px-10 py-3 rounded-xl font-bold bg-primary text-white hover:bg-blue-800 transition-all text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50">
                  {submitting ? 'Sending...' : 'Send Nomination Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {faculty.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <i className="fas fa-chalkboard-user text-4xl mb-4 block"></i>
            <p className="font-bold">No faculty supervisors onboarded yet.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                {['Faculty Name', 'Email Address', 'WhatsApp', 'Students', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faculty.map((fac, i) => (
                <FacultyRow
                  key={fac._id || i}
                  fac={fac}
                  onEdit={handleEditInit}
                  onDeactivate={handleDeactivate}
                  onResendLink={handleResendLink}
                  onResetPassword={handleResetPassword}
                  resending={resending}
                  resetting={resetting}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)}>
          <ModalTitle>Update Faculty Details</ModalTitle>
          <ModalSub>Modify supervisor information (Email is immutable)</ModalSub>
          <form onSubmit={handleUpdate} className="mt-6 space-y-6">
            <FormGroup label="Full Name" error={errorDictionary.name}>
              <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} iconLeft="fa-user" />
            </FormGroup>
            <FormGroup label="Official Email Address (Locked)">
              <TextInput type="email" disabled value={form.email} iconLeft="fa-lock" className="bg-gray-50 opacity-70" />
            </FormGroup>
            <FormGroup label="WhatsApp Number" error={errorDictionary.whatsappNumber}>
              <TextInput value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-brands fa-whatsapp" />
            </FormGroup>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" block onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" block type="submit" loading={submitting}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
