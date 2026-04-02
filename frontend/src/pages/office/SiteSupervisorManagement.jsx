import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal, { ModalTitle } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

import { useNavigate } from 'react-router-dom';

// Inline expandable student list per supervisor row
function SupervisorRow({ sup, onEdit, onDelete }) {
    const navigate = useNavigate();

    const handleViewRoster = () => {
        if (sup.assignedStudents > 0) {
            const params = new URLSearchParams();
            if (sup.email) params.append('email', sup.email);
            if (sup.name) params.append('name', sup.name);
            params.append('type', 'site');
            navigate(`/office/supervisor-management/${sup._id || 'details'}/students?${params.toString()}`, { state: { supervisor: sup } });
        }
    };

    return (
        <tr className="border-b border-slate-50 hover:bg-slate-50 transition-all duration-200">
            <td className="px-6 py-6 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-xs shrink-0 border border-primary/5 transition-colors group-hover:bg-primary group-hover:text-white">
                        {sup.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 tracking-tight">{sup.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap">Site Supervisor</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-6">
                <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-600 font-bold flex items-center gap-2">
                        <i className="fas fa-envelope text-primary/40 text-[9px]"></i>
                        {sup.email || 'No email provided'}
                    </span>
                    {sup.whatsappNumber && (
                        <span className="text-[10px] text-slate-400 font-black tracking-tight flex items-center gap-2">
                            <i className="fab fa-whatsapp text-emerald-400 text-[10px]"></i>
                            {sup.whatsappNumber}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-6 py-6">
                <button
                    onClick={handleViewRoster}
                    disabled={sup.assignedStudents === 0 || (!sup.email && !sup.companies?.[0]?.name)}
                    className={`h-9 px-4 rounded-xl flex items-center gap-2.5 transition-all font-black text-[10px] w-max ${sup.assignedStudents > 0
                        ? 'bg-primary text-white shadow-md shadow-primary/10 hover:bg-blue-800'
                        : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-default'}`}
                    title={sup.assignedStudents > 0 ? 'Click to view assigned students' : 'No placements yet'}
                >
                    <i className="fas fa-external-link-alt text-[9px]"></i>
                    {sup.assignedStudents || 0} Assigned
                </button>
            </td>
            <td className="px-6 py-6">
                <div className="flex flex-wrap gap-1.5">
                    {sup.companies.map((c, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-black text-[9px] uppercase tracking-wider border border-blue-100">
                            {c.name}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-6 py-6 text-right">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onEdit(sup)}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                        title="Edit Details"
                    >
                        <i className="fas fa-edit text-sm"></i>
                    </button>
                    <button
                        onClick={() => onDelete(sup)}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-all shadow-sm"
                        title="Remove Supervisor"
                    >
                        <i className="fas fa-trash-alt text-sm"></i>
                    </button>
                </div>
            </td>
        </tr>
    );
}


export default function SiteSupervisorManagement({ user }) {
    const [companies, setCompanies] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSupervisor, setEditingSupervisor] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Pagination & Search State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const initialForm = { companyId: '', name: '', email: '', whatsappNumber: '' };
    const [form, setForm] = useState(initialForm);
    const [errorDictionary, setErrorDictionary] = useState({});

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => { fetchInitialData(); }, [page, debouncedSearch]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [companyResp, supResp] = await Promise.all([
                apiRequest('/office/companies/dropdown'),
                apiRequest(`/office/site-supervisors?page=${page}&search=${debouncedSearch}`)
            ]);
            setCompanies(companyResp || []);
            setSupervisors(supResp.data || []);
            setTotalPages(supResp.pages || 1);
        } catch (err) {
            // Error handled by apiRequest
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const e = {};
        if (!validate.required(form.companyId)) e.companyId = 'Please select a company';
        if (!validate.required(form.name)) e.name = 'Full name is required';
        if (!validate.required(form.email)) e.email = 'Email is required';
        else if (!validate.email(form.email)) e.email = 'Invalid email';
        if (!validate.required(form.whatsappNumber)) e.whatsappNumber = 'WhatsApp number is required';
        setErrorDictionary(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            await apiRequest('/office/add-site-supervisor', {
                method: 'POST',
                body: { ...form, officeId: user?.id || user?._id }
            });
            showToast.success('Site Supervisor successfully registered and linked.');
            setShowAddForm(false);
            setForm(initialForm);
            setErrorDictionary({});
            fetchInitialData();
        } catch { /* handled */ }
        finally { setSubmitting(false); }
    };

    const handleEditInit = (sup) => {
        setEditingSupervisor(sup);
        setForm({ companyId: sup.companies[0]?.id || '', name: sup.name, email: sup.email, whatsappNumber: sup.whatsappNumber });
        setShowEditModal(true);
        setErrorDictionary({});
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            await apiRequest(`/office/edit-site-supervisor/${editingSupervisor._id || editingSupervisor.email}`, {
                method: 'POST',
                body: { ...form, officeId: user?.id || user?._id }
            });
            showToast.success('Supervisor details updated successfully.');
            setShowEditModal(false);
            setEditingSupervisor(null);
            setForm(initialForm);
            fetchInitialData();
        } catch { /* handled */ }
        finally { setSubmitting(false); }
    };

    const handleDeleteSupervisor = async (sup) => {
        const companyNames = sup.companies.map(c => c.name).join(', ');
        const confirmed = await showAlert.confirm(
            'Remove Supervisor?',
            `Remove ${sup.name} from: ${companyNames}?`,
            'Yes, Remove'
        );
        if (!confirmed) return;
        try {
            await Promise.all(sup.companies.map(c =>
                apiRequest('/office/remove-site-supervisor', {
                    method: 'POST',
                    body: { email: sup.email, companyId: c.id, officeId: user?.id || user?._id }
                })
            ));
            showToast.success('Supervisor unlinked from all companies.');
            fetchInitialData();
        } catch { /* handled */ }
    };

    if (loading) return (
        <div className="text-center py-20">
            <i className="fas fa-circle-notch fa-spin text-3xl text-primary mb-4 block mx-auto"></i>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Syncing Supervisor Registry...</p>
        </div>
    );
    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
            {/* Professional Header */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <i className="fas fa-building-user text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Site Supervisors</h2>
                            <p className="text-xs text-slate-400 font-bold mt-1">  Mentors & Institutional Partners</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-80">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                        <input
                            type="text"
                            placeholder="Search supervisors..."
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
                        {showAddForm ? 'Discard Changes' : 'Deploy Mentor'}
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:p-10 animate-in slide-in-from-top-4 duration-500">
                    <h3 className="text-sm font-black text-slate-800 mb-8 pb-4 border-b border-slate-50">Onboard New Mentor</h3>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormGroup label="Professional Full Name" error={errorDictionary.name}>
                                <TextInput required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} iconLeft="fa-user-tie" placeholder="e.g. Dr. Salman Ahmed" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
                            </FormGroup>
                            <FormGroup label="WhatsApp / Contact Number" error={errorDictionary.whatsappNumber}>
                                <TextInput required value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-phone" placeholder="+92 3XX XXXXXXX" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
                            </FormGroup>
                            <FormGroup label="Official Company Email" error={errorDictionary.email}>
                                <TextInput type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} iconLeft="fa-envelope" placeholder="salman@company.com" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
                            </FormGroup>
                            <FormGroup label="Affiliated Partner Company" error={errorDictionary.companyId}>
                                <SelectInput required value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0">
                                    <option value="">Select Company Partnership...</option>
                                    {companies.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </SelectInput>
                            </FormGroup>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={submitting} className="px-12 py-3.5 rounded-2xl font-black bg-primary text-white hover:bg-blue-800 transition-all text-[11px] shadow-lg shadow-primary/20 disabled:opacity-50 tracking-widest uppercase">
                                {submitting ? 'Authorizing...' : 'Authorize & Invite Mentor'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Student Table */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                {['Full Name', 'Contact Details', 'Interns', 'Affiliated Company', 'Actions'].map(h => (
                                    <th key={h} className="px-6 py-8 text-[11px] font-black text-slate-500 whitespace-nowrap uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {supervisors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center space-y-6">
                                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto border border-slate-100">
                                            <i className="fas fa-user-slash text-slate-200 text-3xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="text-slate-500 font-extrabold text-lg">No Supervisors Found</h4>
                                            <p className="text-slate-400 text-xs font-bold mt-2">Try a different search or deploy a new mentor</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                supervisors.map((sup, i) => (
                                    <SupervisorRow
                                        key={sup.email || i}
                                        sup={sup}
                                        onEdit={handleEditInit}
                                        onDelete={handleDeleteSupervisor}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-8 bg-slate-50/50 flex items-center justify-between border-t border-slate-100 rounded-b-[32px]">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">Page Statistics</span>
                        <span className="text-xs font-black text-slate-800 mt-1">Page {page} <span className="text-slate-300 font-medium mx-1 text-[10px]">OF</span> {totalPages}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all disabled:opacity-30"
                        >
                            <i className="fas fa-chevron-left text-xs"></i>
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all disabled:opacity-30"
                        >
                            <i className="fas fa-chevron-right text-xs"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <Modal onClose={() => setShowEditModal(false)}>
                    <div className="p-4 py-6 space-y-8">
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <i className="fas fa-user-edit text-lg"></i>
                            </div>
                            <div>
                                <ModalTitle>Update Supervisor Profile</ModalTitle>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">Editing: {editingSupervisor?.name}</p>
                            </div>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-8">
                            <FormGroup label="Full Name" error={errorDictionary.name}>
                                <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} iconLeft="fa-user-cog" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm" />
                            </FormGroup>
                            <FormGroup label="WhatsApp / Contact" error={errorDictionary.whatsappNumber}>
                                <TextInput value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-phone-alt" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm" />
                            </FormGroup>
                            <FormGroup label="Affiliated Company" error={errorDictionary.companyId}>
                                <SelectInput value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm mb-2">
                                    <option value="">Update Company...</option>
                                    {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </SelectInput>
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
