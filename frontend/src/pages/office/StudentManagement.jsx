import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast } from '../../utils/notifications.jsx';

const ITEMS_PER_PAGE = 10;

export default function StudentManagement({ user }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [errorDictionary, setErrorDictionary] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const initialForm = { name: '', reg: '', email: '', semester: '7' };
    const [form, setForm] = useState(initialForm);

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        try {
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
            setShowForm(false);
            setForm(initialForm);
            fetchStudents();
        } catch (err) {
            // handled by apiRequest
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return students;
        const q = search.toLowerCase();
        return students.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.reg?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            String(s.semester).includes(q)
        );
    }, [students, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const columns = [
        { key: 'reg', label: 'Registration #' },
        { key: 'name', label: 'Full Name' },
        { key: 'email', label: 'Institutional Email' },
        { key: 'semester', label: 'Sem', render: v => v ? `Sem ${v}` : '—' },
        {
            key: 'status',
            label: 'Status',
            render: (val) => {
                const map = {
                    'unverified': { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Pending Activation' },
                    'verified': { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Verified' },
                };
                const cfg = map[val] || { bg: 'bg-blue-50', text: 'text-blue-600', label: val };
                return (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                    </span>
                );
            }
        }
    ];

    if (loading) return <div className="py-16 text-center"><i className="fas fa-circle-notch fa-spin text-2xl text-primary opacity-50"></i></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student Registry</h2>
                        <p className="text-sm text-gray-400 font-medium mt-1">Institutional records for all active and pending student accounts.</p>
                    </div>
                    <Button
                        variant={showForm ? 'outline' : 'primary'}
                        onClick={() => setShowForm(!showForm)}
                        className="rounded-xl px-6 h-11 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/10 flex-shrink-0"
                    >
                        {showForm ? <><i className="fas fa-xmark mr-2"></i>Close</> : <><i className="fas fa-user-plus mr-2"></i>Onboard Student</>}
                    </Button>
                </div>

                {/* Onboarding Form */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showForm ? 'max-h-[400px] opacity-100 mb-8' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center">
                                <i className="fas fa-id-card-clip"></i>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-800">Manual Onboarding</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Enrollment verified via Internship Office</p>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <FormGroup label="Full Name" error={errorDictionary.name}>
                                <TextInput iconLeft="fa-user" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                            </FormGroup>
                            <FormGroup label="Registration Number" error={errorDictionary.reg}>
                                <TextInput iconLeft="fa-fingerprint" value={form.reg} onChange={e => setForm({ ...form, reg: e.target.value })} placeholder="FA21-BCS-001" />
                            </FormGroup>
                            <FormGroup label="Institutional Email" error={errorDictionary.email}>
                                <TextInput iconLeft="fa-envelope" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@cuiatd.edu.pk" />
                            </FormGroup>
                            <FormGroup label="Semester">
                                <div className="flex gap-2">
                                    <SelectInput iconLeft="fa-layer-group" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className="flex-1">
                                        {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                    </SelectInput>
                                    <Button variant="primary" type="submit" loading={submitting} className="rounded-xl px-5 bg-gray-900 border-0">Enroll</Button>
                                </div>
                            </FormGroup>
                        </form>
                    </div>
                </div>

                {/* Search + count */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                        <i className="fas fa-users text-primary/40"></i>
                        <span><strong className="text-gray-700">{filtered.length}</strong> student{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search by name, reg, or email..."
                            className="pl-9 pr-4 py-2.5 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 w-72"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="border-t border-gray-50 pt-6">
                    {paginated.length === 0 ? (
                        <div className="py-12 text-center text-gray-300">
                            <i className="fas fa-inbox text-3xl mb-3 block"></i>
                            <p className="text-sm font-semibold">No students found</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={paginated} />
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 mt-4 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-medium">
                            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 rounded-lg border border-gray-100 text-gray-400 text-xs font-bold hover:bg-gray-50 disabled:opacity-30 transition-colors"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-xs font-black transition-colors ${p === page ? 'bg-primary text-white' : 'border border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="w-8 h-8 rounded-lg border border-gray-100 text-gray-400 text-xs font-bold hover:bg-gray-50 disabled:opacity-30 transition-colors"
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
