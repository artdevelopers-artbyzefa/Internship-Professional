import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

export default function SiteSupervisorManagement({ user }) {
    const [companies, setCompanies] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const initialForm = {
        companyId: '',
        name: '',
        email: '',
        whatsappNumber: ''
    };

    const [form, setForm] = useState(initialForm);
    const [errorDictionary, setErrorDictionary] = useState({});

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const companyData = await apiRequest('/office/companies');
            setCompanies(companyData || []);

            // Extract all supervisors from all companies
            const allSupervisors = [];
            companyData?.forEach(company => {
                company.siteSupervisors?.forEach(s => {
                    allSupervisors.push({
                        ...s,
                        companyName: company.name,
                        companyId: company._id
                    });
                });
            });
            setSupervisors(allSupervisors);
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
        else if (!validate.email(form.email)) e.email = 'Invalid institutional/official email';
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
            fetchInitialData(); // Refresh list
        } catch (err) {
            // Handled
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        { key: 'name', label: 'Full Name' },
        { key: 'email', label: 'Official Email' },
        { key: 'whatsappNumber', label: 'WhatsApp', render: (val) => <span className="text-gray-500 font-mono text-xs">{val}</span> },
        { key: 'companyName', label: 'Affiliated Company', render: (val) => <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold text-[10px]">{val}</span> },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
                <button
                    onClick={() => {
                        // Future: Edit supervisor logic
                        showToast.info('Edit functionality planned for Phase 2');
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-primary transition-all shadow-sm"
                >
                    <i className="fas fa-pen-nib text-xs"></i>
                </button>
            )
        }
    ];

    if (loading) return <div className="text-center py-20 px-4"><i className="fas fa-circle-notch fa-spin text-3xl text-primary mb-4 block mx-auto"></i><p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Syncing Supervisor Registry...</p></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Site Supervisor Management</h2>
                        <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">Onboard and manage industrial mentors from institutional partner companies.</p>
                    </div>
                    <Button
                        variant={showAddForm ? "outline" : "primary"}
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="rounded-xl px-6 h-12 shadow-lg shadow-blue-600/10 font-black text-xs uppercase tracking-widest"
                    >
                        {showAddForm ? (
                            <><i className="fas fa-times mr-2 text-[10px]"></i> Close Engine</>
                        ) : (
                            <><i className="fas fa-user-plus mr-2 text-[10px]"></i> Deploy Supervisor</>
                        )}
                    </Button>
                </div>

                {/* Toggleable Add Form */}
                <div className={`transition-all duration-500 ease-in-out ${showAddForm ? 'max-h-[800px] opacity-100 mb-10' : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'}`}>
                    <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 shadow-inner relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <i className="fas fa-user-tie text-[100px] rotate-12"></i>
                        </div>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center">
                                <i className="fas fa-user-check"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-800 tracking-tight">Onboard New Mentor</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">A formal invitation will be dispatched to the provided email.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormGroup label="Professional Full Name" error={errorDictionary.name} className="lg:col-span-2">
                                    <TextInput
                                        required
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. Dr. Salman Ahmed"
                                        className="rounded-xl bg-white border-gray-100"
                                    />
                                </FormGroup>
                                <FormGroup label="Official Company Email" error={errorDictionary.email} className="lg:col-span-2">
                                    <TextInput
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        placeholder="salman@company.com"
                                        className="rounded-xl bg-white border-gray-100"
                                    />
                                </FormGroup>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormGroup label="Affiliated Institutional Partner" error={errorDictionary.companyId}>
                                    <SelectInput
                                        required
                                        value={form.companyId}
                                        onChange={e => setForm({ ...form, companyId: e.target.value })}
                                        className="rounded-xl bg-white border-gray-100 font-bold text-gray-700"
                                    >
                                        <option value="">Select Company Partnership...</option>
                                        {companies.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.regNo || 'MOU PARTNER'})</option>
                                        ))}
                                    </SelectInput>
                                </FormGroup>
                                <FormGroup label="WhatsApp / Contact Number" error={errorDictionary.whatsappNumber}>
                                    <TextInput
                                        required
                                        value={form.whatsappNumber}
                                        onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                                        placeholder="+92 3XX XXXXXXX"
                                        className="rounded-xl bg-white border-gray-100"
                                    />
                                </FormGroup>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowAddForm(false)} className="rounded-xl px-8 h-12 border-gray-200">Discard</Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    loading={submitting}
                                    className="rounded-xl px-12 h-12 bg-gray-900 border-0 shadow-lg shadow-gray-200"
                                >
                                    Authorize & Invite
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="border-t border-gray-50 pt-8">
                    <DataTable columns={columns} data={supervisors} />
                </div>
            </div>
        </div>
    );
}
