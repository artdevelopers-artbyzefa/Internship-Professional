import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal, { ModalTitle } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

// Inline expandable student list per supervisor row
function SupervisorRow({ sup, onEdit, onDelete }) {
    const [open, setOpen] = useState(false);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    const toggle = async () => {
        if (!open && !fetched) {
            setLoading(true);
            try {
                let params = new URLSearchParams();
                if (sup.email) params.append('email', sup.email);
                if (sup.name) params.append('supervisor', sup.name);

                const data = await apiRequest(`/office/supervisor-students?${params.toString()}`);
                setStudents(data || []);
                setFetched(true);
            } catch { /* handled */ }
            finally { setLoading(false); }
        }
        setOpen(o => !o);
    };

    return (
        <>
            <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs flex-shrink-0">
                            {sup.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800">{sup.name}</span>
                            {sup.whatsappNumber && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                    <i className="fab fa-whatsapp mr-1 text-emerald-500"></i>{sup.whatsappNumber}
                                </span>
                            )}
                        </div>
                    </div>
                </td>
                <td className="px-5 py-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium">{sup.email || 'No email provided'}</span>
                    </div>
                </td>
                <td className="px-5 py-4">
                    <button
                        onClick={toggle}
                        disabled={sup.assignedStudents === 0 || (!sup.email && !sup.companies?.[0]?.name)}
                        className={`h-7 px-3 rounded-lg flex items-center gap-1.5 transition-all font-black text-[10px] ${sup.assignedStudents > 0
                            ? 'bg-primary text-white shadow-sm hover:scale-105 cursor-pointer'
                            : 'bg-gray-100 text-gray-300 cursor-default'}`}
                        title={sup.assignedStudents > 0 ? 'Click to view assigned students' : 'No placements yet'}
                    >
                        <i className={`fas ${open ? 'fa-chevron-up' : 'fa-users-rectangle'} text-[9px]`}></i>
                        {sup.assignedStudents || 0}
                    </button>
                </td>
                <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                        {sup.companies.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold text-[10px] whitespace-nowrap">
                                {c.name}
                            </span>
                        ))}
                    </div>
                </td>
                <td className="px-5 py-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(sup)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                            title="Edit Details"
                        >
                            <i className="fas fa-pen-nib text-xs"></i>
                        </button>
                        <button
                            onClick={() => onDelete(sup)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-danger hover:border-danger transition-all shadow-sm"
                            title="Remove Supervisor"
                        >
                            <i className="fas fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>

            {/* Inline expandable student list */}
            {open && (
                <tr>
                    <td colSpan={5} className="px-5 pb-4 pt-0">
                        <div className="bg-gray-50/70 rounded-2xl border border-gray-100 p-4 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                <i className="fas fa-user-graduate mr-1.5"></i>
                                Assigned Students — {sup.name}
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
                                                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
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

export default function SiteSupervisorManagement({ user }) {
    const [companies, setCompanies] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSupervisor, setEditingSupervisor] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const initialForm = { companyId: '', name: '', email: '', whatsappNumber: '' };
    const [form, setForm] = useState(initialForm);
    const [errorDictionary, setErrorDictionary] = useState({});

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        try {
            const companyData = await apiRequest('/office/companies');
            setCompanies(companyData || []);

            // Group supervisors by email, preserving assignedStudents count from backend
            const supervisorMap = {};
            companyData?.forEach(company => {
                company.siteSupervisors?.forEach(s => {
                    const email = s.email?.toLowerCase().trim() || '';
                    const name = s.name?.trim() || 'Unknown';
                    const key = email || name; // Avoid grouping all empty-email supervisors together

                    if (!supervisorMap[key]) {
                        supervisorMap[key] = {
                            ...s,
                            email, // Ensure email is blank if missing
                            assignedStudents: s.assignedStudents || 0,
                            companies: [{ id: company._id, name: company.name }]
                        };
                    } else {
                        supervisorMap[key].assignedStudents += (s.assignedStudents || 0);
                        if (!supervisorMap[key].companies.find(c => c.id === company._id)) {
                            supervisorMap[key].companies.push({ id: company._id, name: company.name });
                        }
                    }
                });
            });
            setSupervisors(Object.values(supervisorMap));
        } catch (err) {
            console.error(err);
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
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Site Supervisor Management</h2>
                        <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">Onboard and manage industrial mentors from institutional partner companies.</p>
                    </div>
                    <Button
                        variant={showAddForm ? 'outline' : 'primary'}
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="rounded-xl px-6 h-12 shadow-lg shadow-blue-600/10 font-black text-xs uppercase tracking-widest"
                    >
                        {showAddForm
                            ? <><i className="fas fa-times mr-2 text-[10px]"></i> Close</>
                            : <><i className="fas fa-user-plus mr-2 text-[10px]"></i> Deploy Supervisor</>
                        }
                    </Button>
                </div>

                {/* Add Form */}
                <div className={`transition-all duration-500 ease-in-out ${showAddForm ? 'max-h-[600px] opacity-100 mb-10' : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'}`}>
                    <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 shadow-inner">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center">
                                <i className="fas fa-user-check"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-800 tracking-tight">Onboard New Mentor</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">A formal invitation will be dispatched to the provided email.</p>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormGroup label="Professional Full Name" error={errorDictionary.name} className="lg:col-span-2">
                                    <TextInput required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dr. Salman Ahmed" />
                                </FormGroup>
                                <FormGroup label="Official Company Email" error={errorDictionary.email} className="lg:col-span-2">
                                    <TextInput type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="salman@company.com" />
                                </FormGroup>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormGroup label="Affiliated Partner Company" error={errorDictionary.companyId}>
                                    <SelectInput required value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}>
                                        <option value="">Select Company Partnership...</option>
                                        {companies.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </SelectInput>
                                </FormGroup>
                                <FormGroup label="WhatsApp / Contact Number" error={errorDictionary.whatsappNumber}>
                                    <TextInput required value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="+92 3XX XXXXXXX" />
                                </FormGroup>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowAddForm(false)} className="rounded-xl px-8 h-12">Discard</Button>
                                <Button variant="primary" type="submit" loading={submitting} className="rounded-xl px-12 h-12 bg-gray-900 border-0">Authorize & Invite</Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Table */}
                <div className="border-t border-gray-50 pt-8 overflow-x-auto">
                    {supervisors.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <i className="fas fa-user-slash text-4xl mb-4 block"></i>
                            <p className="font-bold">No supervisors registered yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {['Full Name', 'Official Email', 'Interns', 'Affiliated Company', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {supervisors.map((sup, i) => (
                                    <SupervisorRow
                                        key={sup.email || i}
                                        sup={sup}
                                        onEdit={handleEditInit}
                                        onDelete={handleDeleteSupervisor}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                    <i className="fas fa-user-pen text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Edit Supervisor</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Modifying: {editingSupervisor?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-8">
                            <form onSubmit={handleEditSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormGroup label="Full Name" error={errorDictionary.name}>
                                        <TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                    </FormGroup>
                                    <FormGroup label="Email Address (Locked)">
                                        <TextInput type="email" value={form.email} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
                                    </FormGroup>
                                    <FormGroup label="WhatsApp / Contact" error={errorDictionary.whatsappNumber}>
                                        <TextInput value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} />
                                    </FormGroup>
                                    <FormGroup label="Affiliated Company" error={errorDictionary.companyId}>
                                        <SelectInput value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}>
                                            <option value="">Update Company...</option>
                                            {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </SelectInput>
                                    </FormGroup>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="outline" onClick={() => setShowEditModal(false)} className="rounded-xl px-8 h-12">Cancel</Button>
                                    <Button variant="primary" type="submit" loading={submitting} className="rounded-xl px-12 h-12 bg-gray-900 border-0">Update Record</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
