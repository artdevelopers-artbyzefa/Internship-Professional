import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

export default function SiteSupervisorManagement({ user }) {
    const [companies, setCompanies] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStudentsModal, setShowStudentsModal] = useState(false);
    const [selectedSupervisorForStudents, setSelectedSupervisorForStudents] = useState(null);
    const [studentsList, setStudentsList] = useState([]);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [editingSupervisor, setEditingSupervisor] = useState(null);
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

    const handleEditInit = (sup) => {
        setEditingSupervisor(sup);
        setForm({
            companyId: sup.companyId || '',
            name: sup.name,
            email: sup.email,
            whatsappNumber: sup.whatsappNumber
        });
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
        } catch (err) {
            // Handled
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewStudents = async (companyName, supervisorName) => {
        setSelectedSupervisorForStudents({ company: companyName, name: supervisorName });
        setShowStudentsModal(true);
        setFetchingStudents(true);
        try {
            const data = await apiRequest(`/office/supervisor-students?company=${encodeURIComponent(companyName)}&supervisor=${encodeURIComponent(supervisorName)}`);
            setStudentsList(data || []);
        } catch (err) {
            // handled
        } finally {
            setFetchingStudents(false);
        }
    };

    const handleDeleteSupervisor = async (sup) => {
        const confirmed = await showAlert.confirm(
            'Remove Supervisor?',
            `Are you sure you want to remove ${sup.name} from the registry? This will also unlink them from ${sup.companyName}.`,
            'Yes, Remove'
        );
        if (!confirmed) return;

        try {
            await apiRequest('/office/remove-site-supervisor', {
                method: 'POST',
                body: {
                    email: sup.email,
                    companyId: sup.companyId,
                    officeId: user?.id || user?._id
                }
            });
            showToast.success('Supervisor removed successfully.');
            fetchInitialData();
        } catch (err) {
            // Handled
        }
    };

    const columns = [
        { key: 'name', label: 'Full Name' },
        { key: 'email', label: 'Official Email' },
        {
            key: 'assignedStudents',
            label: 'Interns',
            render: (val, row) => (
                <button
                    onClick={() => handleViewStudents(row.companyName, row.name)}
                    className={`h-7 px-2 rounded-lg flex items-center gap-1.5 transition-all font-black text-[10px] ${val > 0 ? 'bg-primary text-white shadow-sm hover:scale-105' : 'bg-gray-100 text-gray-300'}`}
                    title={val > 0 ? `View ${val} assigned students` : "No placements yet"}
                >
                    <i className="fas fa-users-rectangle"></i>
                    {val || 0}
                </button>
            )
        },
        { key: 'companyName', label: 'Affiliated Company', render: (val) => <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold text-[10px]">{val}</span> },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEditInit(row)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                        title="Edit Details"
                    >
                        <i className="fas fa-pen-nib text-xs"></i>
                    </button>
                    <button
                        onClick={() => handleDeleteSupervisor(row)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-danger hover:border-danger transition-all shadow-sm"
                        title="Remove Supervisor"
                    >
                        <i className="fas fa-trash-can text-xs"></i>
                    </button>
                </div>
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
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Modifying records for {editingSupervisor?.name}</p>
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
                                        <TextInput
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="rounded-xl"
                                        />
                                    </FormGroup>
                                    <FormGroup label="Email Address (Login ID)" error={errorDictionary.email}>
                                        <TextInput
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            disabled={true} // Usually email/ID shouldn't change easily to avoid auth breaks
                                            className="rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
                                        />
                                    </FormGroup>
                                    <FormGroup label="WhatsApp / Contact" error={errorDictionary.whatsappNumber}>
                                        <TextInput
                                            value={form.whatsappNumber}
                                            onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                                            className="rounded-xl"
                                        />
                                    </FormGroup>
                                    <FormGroup label="Affiliated Company" error={errorDictionary.companyId}>
                                        <SelectInput
                                            value={form.companyId}
                                            onChange={e => setForm({ ...form, companyId: e.target.value })}
                                            className="rounded-xl font-bold"
                                        >
                                            <option value="">Update Company...</option>
                                            {companies.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </SelectInput>
                                    </FormGroup>
                                </div>

                                <div className="flex justify-end gap-3 pt-6">
                                    <Button variant="outline" onClick={() => setShowEditModal(false)} className="rounded-xl px-8 h-12">Cancel</Button>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        loading={submitting}
                                        className="rounded-xl px-12 h-12 bg-gray-900 border-0"
                                    >
                                        Update Record
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

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
                            <div className="space-y-3">
                                {studentsList.map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md hover:shadow-gray-200/50 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary border border-gray-100 shadow-sm group-hover:scale-110 transition-transform">
                                                <i className="fas fa-user-graduate"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-800">{s.name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">{s.reg} · Semester {s.semester}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <p className="text-[10px] font-black text-gray-400 mb-1 group-hover:text-primary transition-colors">{s.email}</p>
                                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 tracking-wider">
                                                Industry Intern
                                            </span>
                                        </div>
                                    </div>
                                ))}
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
