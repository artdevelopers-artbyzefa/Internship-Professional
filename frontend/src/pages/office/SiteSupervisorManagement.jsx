import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal, { ModalTitle } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';
import DataTable from '../../components/ui/DataTable.jsx';

import { useNavigate } from 'react-router-dom';

export default function SiteSupervisorManagement({ user }) {
    const [companies, setCompanies] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(null);
    const [resetting, setResetting] = useState(null);

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
        // This is now handled inline in the actions render
    };

    const handleEditSubmit = async (sup, formData) => {
        setSubmitting(true);
        try {
            await apiRequest(`/office/edit-site-supervisor/${sup._id || sup.email}`, {
                method: 'POST',
                body: { ...formData, officeId: user?.id || user?._id }
            });
            showToast.success('Updated.');
            fetchInitialData();
            return true;
        } catch { return false; }
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

    const handleResendActivation = async (sup) => {
        setResending(sup.email);
        try {
            await apiRequest('/office/resend-supervisor-activation', {
                method: 'POST',
                body: { email: sup.email, officeId: user?.id || user?._id }
            });
            showToast.success('Activation link resent.');
        } catch { /* handled */ }
        finally { setResending(null); }
    };

    const handleResetPassword = async (sup) => {
        if (!sup.userId) {
            showToast.error('No account linked to this supervisor.');
            return;
        }
        const confirmed = await showAlert.confirm('Reset Password?', `Send a new temporary password to ${sup.name}?`, 'Reset Account');
        if (!confirmed) return;
        setResetting(sup.email);
        try {
            await apiRequest(`/office/reset-supervisor-password/${sup.userId}`, { method: 'POST', body: { officeId: user.id || user._id } });
            showAlert.success('Password Reset', 'New credentials have been sent to their email.');
        } catch { /* handled */ }
        finally { setResetting(null); }
    };

    const columns = [
        {
            key: 'name',
            label: 'Full Name',
            render: (v, sup) => (
                <div className="flex flex-col py-2">
                    <span className="text-sm font-bold text-slate-800 tracking-tight">{sup.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">Site Supervisor</span>
                </div>
            )
        },
        {
            key: 'contact',
            label: 'Contact Details',
            render: (v, sup) => (
                <div className="flex flex-col gap-1.5 py-2">
                    <span className="text-[11px] text-slate-600 font-bold flex items-center gap-2">
                        <i className="fas fa-envelope text-primary/40 text-[9px]"></i>
                        {sup.email || 'No email'}
                    </span>
                    {sup.whatsappNumber && (
                        <span className="text-[10px] text-slate-400 font-black tracking-tight flex items-center gap-2">
                            <i className="fab fa-whatsapp text-emerald-400 text-[10px]"></i>
                            {sup.whatsappNumber}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'interns',
            label: 'Assigned Interns',
            render: (v, sup) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (sup.assignedStudents > 0) {
                            const params = new URLSearchParams();
                            if (sup.email) params.append('email', sup.email);
                            if (sup.name) params.append('name', sup.name);
                            params.append('type', 'site');
                            navigate(`/office/supervisor-management/${sup._id || 'details'}/students?${params.toString()}`, { state: { supervisor: sup } });
                        }
                    }}
                    disabled={sup.assignedStudents === 0}
                    className={`h-9 px-4 rounded-xl flex items-center gap-2.5 transition-all font-black text-[10px] w-max ${sup.assignedStudents > 0
                        ? 'bg-primary text-white shadow-md shadow-primary/10 hover:bg-blue-800'
                        : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-default'}`}
                >
                    <i className="fas fa-external-link-alt text-[9px]"></i>
                    {sup.assignedStudents || 0} Placed
                </button>
            )
        },
        {
            key: 'companies',
            label: 'Affiliated Partners',
            render: (v, sup) => (
                <div className="flex flex-wrap gap-2 py-2">
                    {sup.companies?.map((c, i) => (
                        <span key={i} className="text-slate-600 font-bold text-[10px]">
                            {c.name}{i < sup.companies.length - 1 ? ',' : ''}
                        </span>
                    ))}
                </div>
            )
        },
        {
            key: 'status',
            label: 'Account Status',
            render: (v, sup) => {
                const status = sup.status || 'Not Registered';
                let style = 'bg-rose-50 text-rose-600 border border-rose-100';
                if (status === 'Active') style = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                if (status === 'Pending Activation') style = 'bg-amber-50 text-amber-600 border border-amber-100';
                
                return (
                    <div className="py-2">
                        <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold ${style}`}>
                            {status}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'text-right',
            render: (v, sup) => {
                const [isOpen, setIsOpen] = useState(false);
                const [innerEditing, setInnerEditing] = useState(false);
                const [innerForm, setInnerForm] = useState({ name: sup.name, email: sup.email, whatsappNumber: sup.whatsappNumber, companyId: sup.companies[0]?.id || '' });

                const handleInnerSubmit = async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    try {
                        await apiRequest(`/office/edit-site-supervisor/${sup._id || sup.email}`, {
                            method: 'POST',
                            body: { ...innerForm, officeId: user?.id || user?._id }
                        });
                        showToast.success('Updated.');
                        setIsOpen(false);
                        setInnerEditing(false);
                        fetchInitialData();
                    } catch { /* handled */ }
                    finally { setSubmitting(false); }
                };

                return (
                    <div className="relative flex justify-end" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => { setIsOpen(!isOpen); setInnerEditing(false); }}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-400 hover:text-primary transition-all cursor-pointer"
                        >
                            <i className={`fas ${isOpen ? 'fa-times' : 'fa-ellipsis-v'} text-xs`}></i>
                        </button>

                        {isOpen && (
                            <div className={`absolute right-0 top-11 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] animate-in fade-in zoom-in-95 duration-200 overflow-hidden ${innerEditing ? 'w-80 p-6' : 'w-48 py-2'}`}>
                                {!innerEditing ? (
                                    <>
                                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                            <p className="text-[10px] font-bold text-slate-400">Actions</p>
                                        </div>
                                        <button onClick={() => setInnerEditing(true)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors border-0 bg-white cursor-pointer">
                                            <i className="fas fa-edit w-4"></i> Edit Profile
                                        </button>
                                        {sup.status === 'Active' && (
                                            <button onClick={() => { setIsOpen(false); handleResetPassword(sup); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-amber-600 hover:bg-amber-50 transition-colors border-0 bg-white cursor-pointer">
                                                <i className="fas fa-key w-4"></i> Reset Password
                                            </button>
                                        )}
                                        {sup.status === 'Pending Activation' && (
                                            <button onClick={() => { setIsOpen(false); handleResendActivation(sup); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-primary hover:bg-blue-50 transition-colors border-0 bg-white cursor-pointer">
                                                <i className="fas fa-paper-plane w-4"></i> Resend Email
                                            </button>
                                        )}
                                        <button onClick={() => { setIsOpen(false); handleDeleteSupervisor(sup); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors border-0 bg-white cursor-pointer">
                                            <i className="fas fa-trash-alt w-4"></i> Remove
                                        </button>
                                    </>
                                ) : (
                                    <form onSubmit={handleInnerSubmit} className="space-y-4">
                                        <p className="text-[10px] font-bold text-slate-400 mb-4">Edit Profile</p>
                                        <input 
                                            value={innerForm.name} 
                                            onChange={e => setInnerForm({...innerForm, name: e.target.value})}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                            placeholder="Name"
                                        />
                                        <input 
                                            value={innerForm.whatsappNumber} 
                                            onChange={e => setInnerForm({...innerForm, whatsappNumber: e.target.value})}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                            placeholder="WhatsApp"
                                        />
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setInnerEditing(false)} className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer">Cancel</button>
                                            <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold border-0 cursor-pointer">{submitting ? '...' : 'Save'}</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
            {/* Professional Header */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-3xl"></div>
                <div className="space-y-4 z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
                            <i className="fas fa-building-user text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight text-lowercase capitalize">Mentor Network</h2>
                            <p className="text-xs text-slate-400 font-bold mt-1">Industry Partnerships Manager</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto z-10">
                    <div className="relative w-full sm:w-80 group">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm group-focus-within:text-primary transition-colors"></i>
                        <input
                            type="text"
                            placeholder="Search supervisors..."
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/5 focus:bg-white outline-none transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-xs transition-all w-full lg:w-auto ${showAddForm ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-primary text-white hover:bg-blue-800 shadow-xl shadow-primary/20'}`}
                    >
                        <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus-circle'} text-xs`}></i>
                        {showAddForm ? 'Cancel Onboarding' : 'Register Supervisor'}
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:p-10 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <i className="fas fa-id-badge text-lg"></i>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Credentials Registration</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <FormGroup label="Professional Name" error={errorDictionary.name}>
                                <TextInput required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} iconLeft="fa-user-tie" placeholder="e.g. Dr. Salman Ahmed" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
                            </FormGroup>
                            <FormGroup label="WhatsApp Contact" error={errorDictionary.whatsappNumber}>
                                <TextInput required value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-phone" placeholder="+92 3XX XXXXXXX" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
                            </FormGroup>
                            <FormGroup label="Corporate Email" error={errorDictionary.email}>
                                <TextInput type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} iconLeft="fa-envelope" placeholder="salman@company.com" className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0" />
                            </FormGroup>
                            <FormGroup label="Primary Partnership" error={errorDictionary.companyId}>
                                <SelectInput required value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0">
                                    <option value="">Select Company Partnership...</option>
                                    {companies.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </SelectInput>
                            </FormGroup>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit" loading={submitting} className="px-12 py-4 rounded-2xl font-bold bg-primary text-white hover:bg-blue-800 transition-all text-xs shadow-xl shadow-primary/30">
                                <i className="fas fa-check-circle mr-2"></i>
                                {submitting ? 'Verifying...' : 'Authorize New Mentor'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Registry Table */}
            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="min-h-[500px]">
                    {supervisors.length === 0 && !loading ? (
                        <div className="py-48 text-center flex flex-col items-center justify-center gap-6">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 text-slate-200 shadow-inner">
                                <i className="fas fa-user-slash text-4xl"></i>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-slate-400 font-bold text-xs">No Mentors Identified</h4>
                                <p className="text-[10px] text-slate-300 font-bold">Try a different search or onboard a new institutional partner</p>
                            </div>
                        </div>
                    ) : (
                        <DataTable 
                            columns={columns} 
                            data={supervisors} 
                            loading={loading}
                        />
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-8 bg-slate-50/30 flex items-center justify-between border-t border-slate-50">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400">Navigation Status</span>
                            <span className="text-xs font-bold text-slate-900 mt-1">Registry Page {page} of {totalPages}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="h-11 px-6 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
                            >
                                <i className="fas fa-arrow-left mr-2"></i> Previous
                            </button>
                            <button
                                disabled={page === totalPages || loading}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="h-11 px-6 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
                            >
                                Next <i className="fas fa-arrow-right ml-2"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
