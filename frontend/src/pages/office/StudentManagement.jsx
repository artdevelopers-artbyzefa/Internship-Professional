import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

export default function StudentManagement({ user }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [errorDictionary, setErrorDictionary] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const initialForm = {
        name: '',
        reg: '',
        email: '',
        semester: '7'
    };
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            // NOTE: We'll reuse an existing route or create a generic list route if needed
            // For now, let's assume we want to see all students who are unverified or just overall student registry
            const data = await apiRequest('/auth/student-list');
            setStudents(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const e = {};
        if (!validate.required(form.name)) e.name = 'Full name is required';
        if (!validate.required(form.reg)) e.reg = 'Registration number is required';

        if (!validate.required(form.email)) e.email = 'Email is required';
        else if (!validate.institutionalEmail(form.email)) e.email = 'Must be @cuiatd.edu.pk';

        setErrorDictionary(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await apiRequest('/office/onboard-student', {
                method: 'POST',
                body: { ...form, officeId: user.id || user._id }
            });
            showToast.success('Student onboarded and activation email sent.');
            setShowModal(false);
            setForm(initialForm);
            fetchStudents();
        } catch (err) {
            // Handled by apiRequest
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        { key: 'reg', label: 'Registration #' },
        { key: 'name', label: 'Full Name' },
        { key: 'email', label: 'Institutional Email' },
        { key: 'semester', label: 'Semester' },
        {
            key: 'status',
            label: 'Status',
            render: (val) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${val === 'unverified' ? 'bg-amber-50 text-amber-600' :
                    val === 'verified' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                    {val === 'unverified' ? 'Pending Activation' : val.charAt(0).toUpperCase() + val.slice(1)}
                </span>
            )
        }
    ];

    if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 overflow-hidden transition-all duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight">Student Registry</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">Institutional records for active and pending student accounts.</p>
                    </div>
                    <Button
                        variant={showModal ? "outline" : "primary"}
                        onClick={() => setShowModal(!showModal)}
                        className="rounded-2xl px-8 h-12 shadow-lg shadow-primary/10 transition-all font-black text-xs uppercase tracking-widest"
                    >
                        {showModal ? (
                            <><i className="fas fa-times mr-2 animate-bounce"></i> Close Form</>
                        ) : (
                            <><i className="fas fa-user-plus mr-2"></i> Onboard Student</>
                        )}
                    </Button>
                </div>

                {/* Toggleable Onboarding Form */}
                <div className={`transition-all duration-700 ease-in-out ${showModal ? 'max-h-[800px] opacity-100 mb-12' : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'}`}>
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-[32px] p-8 border border-gray-100 shadow-inner">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <i className="fas fa-id-card-clip text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-800 tracking-tight">Manual Onboarding</h3>
                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Enrollment verified via Internship Office</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                            <FormGroup label="Full Name" error={errorDictionary.name} className="lg:col-span-1">
                                <TextInput
                                    iconLeft="fa-user"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Enter full name"
                                    className="rounded-xl border-gray-100 bg-white"
                                />
                            </FormGroup>

                            <FormGroup label="Registration Number" error={errorDictionary.reg}>
                                <TextInput
                                    iconLeft="fa-fingerprint"
                                    value={form.reg}
                                    onChange={e => setForm({ ...form, reg: e.target.value })}
                                    placeholder="FA21-BCS-001"
                                    className="rounded-xl border-gray-100 bg-white"
                                />
                            </FormGroup>

                            <FormGroup label="Institutional Email" error={errorDictionary.email}>
                                <TextInput
                                    iconLeft="fa-envelope"
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="name@cuiatd.edu.pk"
                                    className="rounded-xl border-gray-100 bg-white"
                                />
                            </FormGroup>

                            <FormGroup label="Semester">
                                <div className="flex gap-2">
                                    <SelectInput
                                        iconLeft="fa-layer-group"
                                        value={form.semester}
                                        onChange={e => setForm({ ...form, semester: e.target.value })}
                                        className="rounded-xl border-gray-100 bg-white flex-1"
                                    >
                                        {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                    </SelectInput>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        loading={submitting}
                                        className="rounded-xl px-6 bg-gray-900 border-0 shadow-lg"
                                    >
                                        Enroll
                                    </Button>
                                </div>
                            </FormGroup>
                        </form>
                    </div>
                </div>

                <div className="border-t border-gray-50 pt-8">
                    <DataTable columns={columns} data={students} />
                </div>
            </div>
        </div>
    );
}

