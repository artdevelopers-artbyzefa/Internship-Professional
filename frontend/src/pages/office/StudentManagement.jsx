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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student Registry</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage and manually onboard student accounts.</p>
                </div>
                <Button variant="primary" onClick={() => setShowModal(true)}>
                    <i className="fas fa-plus mr-2"></i> Onboard New Student
                </Button>
            </div>

            <DataTable columns={columns} data={students} />

            {showModal && (
                <Modal onClose={() => setShowModal(false)} className="max-w-md">
                    <ModalTitle>Onboard Student</ModalTitle>
                    <ModalSub>Registration closed. Manually add a student to the system.</ModalSub>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                        <FormGroup label="Full Name" error={errorDictionary.name}>
                            <TextInput
                                iconLeft="fa-user"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Enter student's full name"
                            />
                        </FormGroup>

                        <FormGroup label="Registration Number" error={errorDictionary.reg}>
                            <TextInput
                                iconLeft="fa-id-card"
                                value={form.reg}
                                onChange={e => setForm({ ...form, reg: e.target.value })}
                                placeholder="e.g. CIIT/FA21-BCS-001/ATD"
                            />
                        </FormGroup>

                        <FormGroup label="Institutional Email" error={errorDictionary.email}>
                            <TextInput
                                iconLeft="fa-envelope"
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="student@cuiatd.edu.pk"
                            />
                        </FormGroup>

                        <FormGroup label="Current Semester">
                            <SelectInput
                                iconLeft="fa-list-ol"
                                value={form.semester}
                                onChange={e => setForm({ ...form, semester: e.target.value })}
                            >
                                {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </SelectInput>
                        </FormGroup>

                        <div className="pt-4 flex gap-3">
                            <Button variant="outline" block onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" block type="submit" loading={submitting}>
                                Create Account
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
