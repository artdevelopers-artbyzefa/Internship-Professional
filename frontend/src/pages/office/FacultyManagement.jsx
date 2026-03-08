import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

export default function FacultyManagement({ user }) {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorDictionary, setErrorDictionary] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(null);
  const [resetting, setResetting] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsappNumber: ''
  });

  const [editingFaculty, setEditingFaculty] = useState(null);

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const data = await apiRequest('/auth/faculty-list');
      setFaculty(data);
    } catch (err) {
      // apiRequest handles toast
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      // Handled by apiRequest
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInit = (fac) => {
    setEditingFaculty(fac);
    setForm({
      name: fac.name,
      email: fac.email,
      whatsappNumber: fac.whatsappNumber
    });
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
        body: {
          name: form.name,
          whatsappNumber: form.whatsappNumber,
          officeId: user.id || user._id
        }
      });
      showToast.success('Faculty details updated successfully.');
      setShowEditModal(false);
      fetchFaculty();
    } catch (err) {
      // Handled by apiRequest
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmed = await showAlert.confirm(
      'Are you sure?',
      'You want to deactivate this faculty supervisor?',
      'Yes, Deactivate'
    );
    if (!confirmed) return;

    try {
      await apiRequest(`/office/delete-faculty/${id}`, {
        method: 'POST',
        body: { officeId: user.id || user._id }
      });
      showToast.success('Faculty supervisor deactivated.');
      fetchFaculty();
    } catch (err) {
      // Handled by apiRequest
    }
  };

  const handleResetPassword = async (fac) => {
    const confirmed = await showAlert.confirm(
      'Reset Password?',
      `Are you sure you want to reset password for ${fac.name}? A temporary password will be emailed to ${fac.email}.`,
      'Yes, Reset'
    );
    if (!confirmed) return;

    setResetting(fac._id);
    try {
      await apiRequest(`/office/reset-faculty-password/${fac._id}`, {
        method: 'POST',
        body: { officeId: user.id || user._id }
      });
      showAlert.success('Password Reset', 'Temporary password has been sent via email.');
    } catch (err) {
      // Handled by apiRequest
    } finally {
      setResetting(null);
    }
  };

  const handleResendLink = async (fac) => {
    setResending(fac._id);
    try {
      await apiRequest('/office/resend-faculty-activation', {
        method: 'POST',
        body: { facultyId: fac._id, officeId: user.id || user._id }
      });
      showToast.success('Activation link resent successfully.');
    } catch (err) {
      // Handled by apiRequest
    } finally {
      setResending(null);
    }
  };

  const columns = [
    { key: 'name', label: 'Faculty Name' },
    { key: 'email', label: 'Email Address' },
    { key: 'whatsappNumber', label: 'WhatsApp' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${val === 'Active' ? 'bg-green-50 text-green-600' :
          val === 'Pending Activation' ? 'bg-amber-50 text-amber-600' :
            'bg-red-50 text-red-600'
          }`}>
          {val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          {row.status === 'Active' ? (
            <button
              title="Reset Password"
              onClick={() => handleResetPassword(row)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-amber-600 hover:border-amber-500 hover:bg-amber-50 cursor-pointer transition-all ${resetting === row._id ? 'animate-pulse' : ''}`}
            >
              <i className="fas fa-key text-xs"></i>
            </button>
          ) : (
            <button
              title="Resend Activation"
              onClick={() => handleResendLink(row)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-primary hover:border-primary hover:bg-blue-50 cursor-pointer transition-all ${resending === row._id ? 'animate-pulse' : ''}`}
            >
              <i className="fas fa-paper-plane text-xs"></i>
            </button>
          )}

          <button
            title="Edit Details"
            onClick={() => handleEditInit(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary cursor-pointer transition-all"
          >
            <i className="fas fa-pen-to-square text-xs"></i>
          </button>

          <button
            title="Deactivate"
            onClick={() => handleDeactivate(row._id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:border-red-500 hover:text-red-500 cursor-pointer transition-all"
          >
            <i className="fas fa-trash-can text-xs"></i>
          </button>
        </div>
      )
    }
  ];

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Faculty Supervisor Registry</h2>
          <p className="text-sm text-gray-500">Nominate, monitor, and manage academic supervisors.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all h-fit ${showAddForm ? 'bg-gray-100 text-gray-600' : 'bg-primary text-white shadow-lg shadow-blue-600/20'}`}
          >
            <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} text-xs`}></i>
            <span className="text-sm">{showAddForm ? 'Close Form' : 'Nominate Faculty'}</span>
          </button>
        </div>
      </div>

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
                  className="px-10 py-3 rounded-xl font-bold bg-primary text-white hover:bg-blue-800 transition-all text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Nomination Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={faculty} />

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
