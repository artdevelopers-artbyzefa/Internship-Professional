import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

// 1. Sleek Skeleton Component
const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-50/50">
    <td className="px-5 py-6"><div className="h-12 w-48 bg-slate-100 rounded-xl"></div></td>
    <td className="px-5 py-6"><div className="h-7 w-40 bg-slate-50 rounded-lg"></div></td>
    <td className="px-5 py-6"><div className="h-10 w-28 bg-slate-100 rounded-xl"></div></td>
    <td className="px-5 py-6"><div className="h-7 w-20 bg-slate-50 rounded-lg"></div></td>
    <td className="px-5 py-6"><div className="h-10 w-32 bg-slate-100 rounded-xl"></div></td>
  </tr>
);

import { useNavigate } from 'react-router-dom';

// 2. High-Performance Memoized Row
const FacultyRow = memo(({ fac, onEdit, onDeactivate, onResendLink, onResetPassword, resending, resetting }) => {
  const navigate = useNavigate();

  const handleViewRoster = useCallback(() => {
    if (fac.assignedStudents > 0) {
      navigate(`/office/faculty-management/${fac._id}/students?type=faculty`, { state: { supervisor: fac } });
    }
  }, [fac, navigate]);

  const statusStyle = useMemo(() => {
    switch (fac.status) {
      case 'Active': return 'bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider';
      case 'Pending Activation': return 'bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider';
      default: return 'bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider';
    }
  }, [fac.status]);

  return (
    <>
      <tr
        className="flex flex-col lg:table-row border-b border-gray-50 hover:bg-slate-50 transition-all duration-200 p-6 lg:p-0"
      >
        <td className="lg:table-cell px-2 lg:px-5 py-4 lg:py-6 relative">
          <p className="text-[10px] font-bold text-slate-400 mb-2 lg:hidden">Faculty Profile</p>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-800 tracking-tight">{fac.name}</span>
            <span className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">Faculty Member</span>
          </div>
        </td>
        <td className="lg:table-cell px-2 lg:px-5 py-4 lg:py-6">
          <p className="text-[10px] font-bold text-slate-400 mb-2 lg:hidden">Contact Details</p>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-600 font-bold flex items-center gap-2">
              <i className="fas fa-envelope text-primary/40 text-[9px]"></i>
              {fac.email}
            </span>
            <span className="text-[10px] text-slate-400 font-black tracking-tight flex items-center gap-2">
              <i className="fab fa-whatsapp text-emerald-400 text-[10px]"></i>
              {fac.whatsappNumber || 'No Contact'}
            </span>
          </div>
        </td>
        <td className="lg:table-cell px-2 lg:px-5 py-4 lg:py-6">
          <p className="text-[10px] font-bold text-slate-400 mb-2 lg:hidden">Assignees</p>
          <button
            onClick={handleViewRoster}
            className={`h-9 px-4 rounded-xl flex items-center gap-2.5 transition-all font-black text-[10px] w-max ${fac.assignedStudents > 0
              ? 'bg-primary text-white shadow-md shadow-primary/10 hover:bg-blue-800'
              : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-default'}`}
          >
            <i className={`fas fa-external-link-alt text-[9px]`}></i>
            {fac.assignedStudents || 0} Assigned
          </button>
        </td>
        <td className="lg:table-cell px-2 lg:px-5 py-4 lg:py-6">
          <p className="text-[10px] font-bold text-slate-400 mb-2 lg:hidden">Status</p>
          <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black ${statusStyle}`}>
            {fac.status}
          </span>
        </td>
        <td className="lg:table-cell px-2 lg:px-5 py-4 lg:py-6 border-t border-slate-100 lg:border-none mt-2 lg:mt-0 lg:text-right">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {fac.status === 'Active' ? (
              <button
                onClick={() => onResetPassword(fac)}
                title="Reset Password"
                className="flex-1 lg:flex-none w-11 h-11 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-amber-500 hover:bg-amber-500 hover:text-white hover:border-amber-600 transition-all shadow-sm"
              >
                <i className={`fas ${resetting === fac._id ? 'fa-circle-notch fa-spin' : 'fa-key'} text-sm`}></i>
              </button>
            ) : (
              <button
                onClick={() => onResendLink(fac)}
                title="Resend Activation Link"
                className="flex-1 lg:flex-none w-11 h-11 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
              >
                <i className={`fas ${resending === fac._id ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-sm`}></i>
              </button>
            )}
            <button
              onClick={() => onEdit(fac)}
              title="Edit Profile"
              className="flex-1 lg:flex-none w-11 h-11 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
            >
              <i className="fas fa-edit text-sm"></i>
            </button>
            <button
              onClick={() => onDeactivate(fac)}
              title="Delete Faculty Account"
              className="flex-1 lg:flex-none w-11 h-11 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-rose-300 hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-all shadow-sm"
            >
              <i className="fas fa-trash-can text-sm"></i>
            </button>
          </div>
        </td>
      </tr>
    </>
  );
});

// 3. Main Component
export default function FacultyManagement({ user }) {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', whatsappNumber: '' });
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [errorDictionary, setErrorDictionary] = useState({});

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiRequest(`/office/faculty-registry?page=${page}&search=${debouncedSearch}`);
      setFaculty(resp.data || []);
      setTotalPages(resp.pages || 1);
    } catch (err) {
      // Error handled by apiRequest
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  const handleOnboard = useCallback(async (e) => {
    e.preventDefault();
    const eDict = {};
    if (!validate.required(form.name)) eDict.name = 'Full name is required';
    if (!validate.required(form.email) || !validate.email(form.email)) eDict.email = 'Valid institutional email required';
    if (!validate.required(form.whatsappNumber) || !validate.phone(form.whatsappNumber)) eDict.whatsappNumber = 'Correct phone format required';

    if (Object.keys(eDict).length > 0) {
      setErrorDictionary(eDict);
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/office/onboard-faculty', {
        method: 'POST',
        body: { ...form, officeId: user.id || user._id }
      });
      setForm({ name: '', email: '', whatsappNumber: '' });
      showToast.success('Faculty member successfully onboarded.');
      setShowAddForm(false);
      fetchFaculty();
    } catch (err) {
      // Logic for specific error
      if (err.status === 400 && err.message?.includes('email')) {
        setErrorDictionary(prev => ({ ...prev, email: err.message }));
      }
    }
    finally { setSubmitting(false); }
  }, [form, user, fetchFaculty]);

  const handleDeactivate = useCallback(async (fac) => {
    const confirmed = await showAlert.confirm('Purge Account?', `Are you sure you want to PERMANENTLY delete ${fac.name}? This frees up their email for re-registration.`, 'Delete Permanently');
    if (!confirmed) return;
    try {
      await apiRequest(`/office/delete-faculty/${fac._id}`, { method: 'POST', body: { officeId: user.id || user._id } });
      showToast.success('Faculty account purged from registry.');
      fetchFaculty();
    } catch (err) {
      // Error handled by apiRequest
    }
  }, [user, fetchFaculty]);

  const handleResetPassword = useCallback(async (fac) => {
    const confirmed = await showAlert.confirm('Reset Password?', `Send a new temporary password to ${fac.name}?`, 'Reset Account');
    if (!confirmed) return;
    setResetting(fac._id);
    try {
      await apiRequest(`/office/reset-faculty-password/${fac._id}`, { method: 'POST', body: { officeId: user.id || user._id } });
      showAlert.success('Password Reset', 'New credentials have been sent to their email.');
    } catch (err) {
      // Error handled by apiRequest
    }
    finally { setResetting(null); }
  }, [user]);
  const handleEdit = useCallback((f) => {
    setEditingFaculty(f);
    setForm({ name: f.name, email: f.email, whatsappNumber: f.whatsappNumber });
    setShowEditModal(true);
  }, []);

  const handleResendLink = useCallback(async (f) => {
    setResending(f._id);
    try {
      await apiRequest('/office/resend-faculty-activation', {
        method: 'POST',
        body: { facultyId: f._id, officeId: user.id || user._id }
      });
      showToast.success('Activation link resent.');
    } catch (err) {
      // Error handled by apiRequest
    }
    finally { setResending(null); }
  }, [user]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
      {/* Professional Header */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <i className="fas fa-user-tie text-xl"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Faculty Registry</h2>
              <p className="text-xs text-slate-400 font-bold mt-1">Manage Faculty Internship Supervisors</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-80">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
            <input
              type="text"
              placeholder="Search faculty ..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-black text-[11px] transition-all w-full lg:w-auto ${showAddForm ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-primary text-white hover:bg-blue-800 shadow-lg shadow-primary/20'}`}
          >
            <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} text-xs`}></i>
            {showAddForm ? 'Cancel' : 'Onboard Faculty'}
          </button>
        </div>
      </div>

      {/* Onboarding Form */}
      {showAddForm && (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:p-10 animate-in slide-in-from-top-4 duration-500">
          <h3 className="text-sm font-black text-slate-800 mb-8 pb-4 border-b border-slate-50">Faculty Onboarding Details</h3>

          <form onSubmit={handleOnboard} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="Full Name" error={errorDictionary.name}>
                <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} iconLeft="fa-user" placeholder="e.g. Dr. Ahmed Ali" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
              </FormGroup>
              <FormGroup label="WhatsApp / Contact" error={errorDictionary.whatsappNumber}>
                <TextInput value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-phone" placeholder="+923000000000" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
              </FormGroup>
              <div className="md:col-span-2">
                <FormGroup label="Institutional Email Address" error={errorDictionary.email}>
                  <TextInput type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} iconLeft="fa-envelope" placeholder="username@cuiatd.edu.pk" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
                </FormGroup>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={submitting} className="px-12 py-3.5 rounded-2xl font-black bg-primary text-white hover:bg-blue-800 transition-all text-[11px] shadow-lg shadow-primary/20 disabled:opacity-50 tracking-widest uppercase">
                {submitting ? 'Registering...' : 'Register Faculty Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left block lg:table">
            <thead className="hidden lg:table-header-group">
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Faculty Supervisor', 'Contact Details', 'Current Assigned Students', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-8 text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="block lg:table-row-group divide-y lg:divide-y mb-6">
              {loading && faculty.length === 0 ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : faculty.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto border border-slate-100">
                      <i className="fas fa-users-slash text-slate-200 text-3xl"></i>
                    </div>
                    <div>
                      <h4 className="text-slate-500 font-extrabold text-lg">No Faculty Members Found</h4>
                      <p className="text-slate-400 text-xs font-bold mt-2">Try a different search or onboard a new member</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {faculty.map((fac, i) => (
                    <FacultyRow
                      key={fac._id || i}
                      fac={fac}
                      onEdit={handleEdit}
                      onDeactivate={handleDeactivate}
                      onResendLink={handleResendLink}
                      onResetPassword={handleResetPassword}
                      resending={resending}
                      resetting={resetting}
                    />
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-8 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 mb-1">Page Statistics</span>
              <span className="text-xs font-black text-slate-800 mt-1">Page {page} <span className="text-slate-300 font-medium mx-1">of</span> {totalPages}</span>
            </div>
            <div className="flex gap-3">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all disabled:opacity-30"
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all disabled:opacity-30"
              >
                <i className="fas fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)}>
          <div className="p-4 py-6 space-y-8">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <i className="fas fa-user-edit text-lg"></i>
              </div>
              <div>
                <ModalTitle>Update Faculty Profile</ModalTitle>
                <ModalSub>Edit supervisor identity and contact credentials.</ModalSub>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setErrorDictionary({});
              try {
                await apiRequest(`/office/edit-faculty/${editingFaculty._id}`, {
                  method: 'PUT',
                  body: {
                    name: form.name,
                    whatsappNumber: form.whatsappNumber,
                    officeId: user.id || user._id
                  }
                });
                showToast.success('Profile updated successfully.');
                setShowEditModal(false);
                fetchFaculty();
              } catch (err) {
                if (err.status === 400) {
                  setErrorDictionary({ general: err.message });
                }
              } finally {
                setSubmitting(false);
              }
            }} className="space-y-8">
              <FormGroup label="Full Name" error={errorDictionary.name}>
                <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} iconLeft="fa-user-cog" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm" />
              </FormGroup>
              <FormGroup label="WhatsApp / Phone">
                <TextInput value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-phone-alt" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm" />
              </FormGroup>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1 !rounded-2xl !font-black !py-4 !text-[10px]" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1 !rounded-2xl !font-black !py-4 !text-[10px]" type="submit" loading={submitting}>Save Changes</Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
