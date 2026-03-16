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

// 2. High-Performance Memoized Row
const FacultyRow = memo(({ fac, onEdit, onDeactivate, onResendLink, onResetPassword, resending, resetting }) => {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const hoverTimer = useRef(null);

  // Predictive Pre-fetch: Load data on mouse hover
  const prefetch = useCallback(async () => {
    if (fetched || loading || fac.assignedStudents === 0) return;
    try {
      const data = await apiRequest(`/office/faculty-students/${fac._id}`);
      setStudents(data || []);
      setFetched(true);
    } catch { /* suppress background errors */ }
  }, [fetched, loading, fac._id, fac.assignedStudents]);

  const toggle = useCallback(async () => {
    if (!open && !fetched) {
      setLoading(true);
      await prefetch();
      setLoading(false);
    }
    setOpen(o => !o);
  }, [open, fetched, prefetch]);

  const handleMouseEnter = () => {
     hoverTimer.current = setTimeout(prefetch, 150); 
  };

  const handleMouseLeave = () => {
     if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  const statusStyle = useMemo(() => {
    switch(fac.status) {
      case 'Active': return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'Pending Activation': return 'bg-amber-50 text-amber-600 border border-amber-100';
      default: return 'bg-rose-50 text-rose-600 border border-rose-100';
    }
  }, [fac.status]);

  return (
    <>
      <tr 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="border-b border-gray-50 hover:bg-slate-50 transition-all duration-200"
      >
        <td className="px-5 py-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-sm shadow-sm">
              {fac.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-800 tracking-tight">{fac.name}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Faculty Member</span>
            </div>
          </div>
        </td>
        <td className="px-5 py-6">
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
        <td className="px-5 py-6">
          <button
            onClick={toggle}
            className={`h-9 px-4 rounded-xl flex items-center gap-2.5 transition-all font-black text-[10px] tracking-widest ${fac.assignedStudents > 0
              ? 'bg-primary text-white shadow-md shadow-primary/10 hover:bg-blue-800'
              : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-default'}`}
          >
            <i className={`fas ${open ? 'fa-minus' : 'fa-plus'} text-[9px]`}></i>
            {fac.assignedStudents || 0} ASSIGNED
          </button>
        </td>
        <td className="px-5 py-6">
          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statusStyle}`}>
            {fac.status}
          </span>
        </td>
        <td className="px-5 py-6">
          <div className="flex gap-2">
            {fac.status === 'Active' ? (
              <button
                onClick={() => onResetPassword(fac)}
                title="Reset Password"
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-amber-500 hover:bg-amber-50 hover:border-amber-500 transition-all shadow-sm"
              >
                <i className={`fas ${resetting === fac._id ? 'fa-circle-notch fa-spin' : 'fa-key'} text-xs`}></i>
              </button>
            ) : (
              <button
                onClick={() => onResendLink(fac)}
                title="Resend Activation Link"
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-primary hover:bg-primary/5 hover:border-primary transition-all shadow-sm"
              >
                <i className={`fas ${resending === fac._id ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-xs`}></i>
              </button>
            )}
            <button
              onClick={() => onEdit(fac)}
              title="Edit Profile"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm"
            >
              <i className="fas fa-edit text-xs"></i>
            </button>
            <button
              onClick={() => onDeactivate(fac._id)}
              title="Deactivate Account"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm"
            >
              <i className="fas fa-user-slash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={5} className="px-5 pb-6 pt-0">
            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-8 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  Assigned Students List
                </h4>
                <div className="text-[9px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/5 uppercase tracking-widest">
                  {students.length} Total Interns
                </div>
              </div>
              
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Roster...</p>
                </div>
              ) : students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((s, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-extrabold text-xs">
                          {s.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-black text-slate-800 truncate">{s.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{s.reg}</p>
                        </div>
                        <div className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
                           S{s.semester}
                        </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No assigned students found for this supervisor.</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
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
      console.error(err);
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
    } catch { /* Handled */ }
    finally { setSubmitting(false); }
  }, [form, user, fetchFaculty]);

  const handleDeactivate = useCallback(async (id) => {
    const confirmed = await showAlert.confirm('Revoke Access?', 'Are you sure you want to deactivate this supervisor account?', 'Deactivate Account');
    if (!confirmed) return;
    try {
      await apiRequest(`/office/delete-faculty/${id}`, { method: 'POST', body: { officeId: user.id || user._id } });
      showToast.success('Faculty account deactivated.');
      fetchFaculty();
    } catch { /* Handled */ }
  }, [user, fetchFaculty]);

  const handleResetPassword = useCallback(async (fac) => {
    const confirmed = await showAlert.confirm('Reset Password?', `Send a new temporary password to ${fac.name}?`, 'Reset Account');
    if (!confirmed) return;
    setResetting(fac._id);
    try {
      await apiRequest(`/office/reset-faculty-password/${fac._id}`, { method: 'POST', body: { officeId: user.id || user._id } });
      showAlert.success('Password Reset', 'New credentials have been sent to their email.');
    } catch { /* Handled */ }
    finally { setResetting(null); }
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
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Manage Faculty Internship Supervisors</p>
             </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-80">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
            <input 
              type="text"
              placeholder="Search faculty roster..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-black text-[11px] transition-all tracking-widest uppercase w-full lg:w-auto ${showAddForm ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-primary text-white hover:bg-blue-800 shadow-lg shadow-primary/20'}`}
          >
            <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} text-xs`}></i>
            {showAddForm ? 'Cancel' : 'Onboard Faculty'}
          </button>
        </div>
      </div>

      {/* Onboarding Form */}
      {showAddForm && (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:p-10 animate-in slide-in-from-top-4 duration-500">
             <h3 className="text-sm font-black text-slate-800 tracking-widest uppercase mb-8 pb-4 border-b border-slate-50">Faculty Onboarding Details</h3>
             
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

      {/* Roster Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Faculty Supervisor', 'Contact Details', 'Current Roster', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
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
                      <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-2">Try a different search or onboard a new member</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {faculty.map((fac, i) => (
                    <FacultyRow
                      key={fac._id || i}
                      fac={fac}
                      onEdit={(f) => { setEditingFaculty(f); setForm({ name: f.name, email: f.email, whatsappNumber: f.whatsappNumber }); setShowEditModal(true); }}
                      onDeactivate={handleDeactivate}
                      onResendLink={async (f) => { setResending(f._id); try { await apiRequest('/office/resend-faculty-activation', { method: 'POST', body: { facultyId: f._id, officeId: user.id || user._id } }); showToast.success('Activation link resent.'); } catch { /* handled */ } finally { setResending(null); } }}
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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page Statistics</span>
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
            
            <form onSubmit={async (e) => { e.preventDefault(); setSubmitting(true); try { await apiRequest(`/office/edit-faculty/${editingFaculty._id}`, { method: 'PUT', body: { name: form.name, whatsappNumber: form.whatsappNumber, officeId: user.id || user._id } }); showToast.success('Profile updated successfully.'); setShowEditModal(false); fetchFaculty(); } catch { /* handled */ } finally { setSubmitting(false); } }} className="space-y-8">
              <FormGroup label="Full Name" error={errorDictionary.name}>
                <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} iconLeft="fa-user-cog" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm" />
              </FormGroup>
              <FormGroup label="WhatsApp / Phone">
                <TextInput value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-phone-alt" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm" />
              </FormGroup>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1 !rounded-2xl !font-black !py-4 !text-[10px] uppercase tracking-widest" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1 !rounded-2xl !font-black !py-4 !text-[10px] uppercase tracking-widest" type="submit" loading={submitting}>Save Changes</Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
