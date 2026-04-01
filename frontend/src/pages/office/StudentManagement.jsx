import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';
import { validate } from '../../utils/validation.js';
import { showToast } from '../../utils/notifications.jsx';

const ITEMS_PER_PAGE = 10;

export default function StudentManagement({ user }) {
    const [students, setStudents] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [errorDictionary, setErrorDictionary] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [resendingId, setResendingId] = useState(null);

    const initialForm = { name: '', reg: '', email: '', semester: '7', fatherName: '', whatsappNumber: '', section: '', cgpa: '' };
    const [form, setForm] = useState(initialForm);

    // Debounced fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudents();
        }, search ? 500 : 0); // debounce search
        return () => clearTimeout(timer);
    }, [page, search]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const data = await apiRequest(`/office/all-students?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(search)}`);
            if (data && data.students) {
                setStudents(data.students);
                setTotal(data.total);
                setTotalPages(data.pages);
            }
        } catch (err) {
            console.error('[FETCH_REGISTRY_ERROR]', err);
            showToast.error('Failed to load student records.');
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
        
        if (form.cgpa && (parseFloat(form.cgpa) < 0 || parseFloat(form.cgpa) > 4.0)) {
            e.cgpa = 'CGPA must be between 0.0 and 4.0';
        }
        
        setErrorDictionary(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return; // double-submit protection
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const res = await apiRequest('/office/onboard-student', {
                method: 'POST',
                body: { ...form, officeId: user.id || user._id }
            });
            showToast.success(res.message || 'Student profile created.');
            setShowForm(false);
            setForm(initialForm);
            setPage(1); 
            fetchStudents();
        } catch (err) {
            // Error is handled by apiRequest (toast)
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendLink = async (studentId) => {
        setResendingId(studentId);
        try {
            await apiRequest('/office/resend-student-activation', {
                method: 'POST',
                body: { studentId, officeId: user.id || user._id }
            });
            showToast.success('Activation link resent to student.');
        } catch (err) {
            // toast handled
        } finally {
            setResendingId(null);
        }
    };

    const columns = [
        { key: 'reg', label: 'Registration #' },
        { key: 'name', label: 'Full Name' },
        { key: 'email', label: 'Institutional Email' },
        { key: 'semester', label: 'Sem', render: v => v ? `Sem ${v}` : '—' },
        {
            key: 'status',
            label: 'Registry Status',
            render: (val, row) => {
                const map = {
                    'unverified': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Activation' },
                    'verified': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Verified' },
                };
                const cfg = map[val] || { bg: 'bg-blue-100', text: 'text-blue-700', label: val };
                
                return (
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                        </span>
                        {val === 'unverified' && (
                            <button
                                onClick={() => handleResendLink(row._id || row.id)}
                                disabled={resendingId === (row._id || row.id)}
                                className="text-[10px] font-black text-primary hover:underline disabled:opacity-50"
                                title="Resend Activation Link"
                            >
                                {resendingId === (row._id || row.id) ? 'Sending...' : 'Resend link'}
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[24px] md:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Student Registry</h2>
                        <p className="text-xs md:text-sm text-gray-400 font-medium mt-1">Institutional records for all active and pending student accounts.</p>
                    </div>
                    <Button
                        variant={showForm ? 'outline' : 'primary'}
                        onClick={() => setShowForm(!showForm)}
                        className="rounded-2xl px-5 md:px-6 h-10 md:h-12 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/10 flex-shrink-0 w-full sm:w-auto"
                    >
                        {showForm ? <><i className="fas fa-xmark mr-2"></i>Close</> : <><i className="fas fa-user-plus mr-2"></i>Onboard Student</>}
                    </Button>
                </div>

                {/* Onboarding Form */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showForm ? 'max-h-[1200px] opacity-100 mb-8 pt-2' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <div className="bg-slate-50 rounded-[20px] md:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-100 shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 md:mb-8">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                                <i className="fas fa-id-card-clip text-lg md:text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-base md:text-lg font-black text-gray-800">Manual Registration</h3>
                                <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest text-primary">Pre-filling eligibility data for internship cycle</p>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Row 1: Core Identity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormGroup label="Full Name" error={errorDictionary.name}>
                                    <TextInput iconLeft="fa-user" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Student's Legal Name" />
                                </FormGroup>
                                <FormGroup label="Registration Number" error={errorDictionary.reg}>
                                    <TextInput iconLeft="fa-fingerprint" value={form.reg} onChange={e => setForm({ ...form, reg: e.target.value })} placeholder="FA21-BCS-001" />
                                </FormGroup>
                                <FormGroup label="Institutional Email" error={errorDictionary.email}>
                                    <TextInput iconLeft="fa-envelope" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@cuiatd.edu.pk" />
                                </FormGroup>
                                <FormGroup label="Current Semester">
                                    <SelectInput iconLeft="fa-layer-group" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
                                        {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                    </SelectInput>
                                </FormGroup>
                            </div>

                            {/* Row 2: Eligibility & Contact */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormGroup label="Father's Name">
                                    <TextInput iconLeft="fa-user-tie" value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} placeholder="Parent/Guardian Name" />
                                </FormGroup>
                                <FormGroup label="WhatsApp Number">
                                    <TextInput iconLeft="fa-phone" value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="03XXXXXXXXX" />
                                </FormGroup>
                                <FormGroup label="Section (A/B/C/D)">
                                    <TextInput iconLeft="fa-users-rectangle" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" />
                                </FormGroup>
                                <FormGroup label="Current CGPA" error={errorDictionary.cgpa}>
                                    <TextInput iconLeft="fa-chart-line" type="number" step="0.01" value={form.cgpa} onChange={e => setForm({ ...form, cgpa: e.target.value })} placeholder="e.g. 3.25" />
                                </FormGroup>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-200/50">
                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    loading={submitting} 
                                    className="rounded-2xl px-12 bg-gray-900 hover:bg-black border-0 shadow-xl shadow-black/10 h-14 font-black"
                                >
                                    Complete Enrollment
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Search + count */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-primary flex-shrink-0">
                             <i className="fas fa-users text-xs"></i>
                        </div>
                        <div className="text-xs md:text-sm font-bold text-gray-400">
                             Total Records: <span className="text-gray-900">{total}</span>
                             {search && <span className="ml-0 sm:ml-2 mt-1 sm:mt-0 font-medium text-blue-500 hover:underline cursor-pointer block sm:inline" onClick={() => setSearch('')}>(Clear Filter)</span>}
                        </div>
                    </div>
                    <div className="relative group w-full lg:w-96">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs transition-colors group-focus-within:text-primary"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Find by name, registration, or email..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="min-h-[400px]">
                    {loading ? (
                         <div className="py-24 text-center">
                            <i className="fas fa-circle-notch fa-spin text-3xl text-primary opacity-20 mb-4"></i>
                            <p className="text-xs font-black text-gray-300  tracking-widest">Retrieving Records...</p>
                         </div>
                    ) : students.length === 0 ? (
                        <div className="py-24 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                            <i className="fas fa-folder-open text-gray-200 text-5xl mb-4"></i>
                            <p className="text-sm font-black text-gray-400 ">No students found in registry</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={students} hover striped={false} />
                    )}
                </div>

                {/* Pagination */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 md:pt-8 mt-6 md:mt-8 border-t border-gray-50">
                    <p className="text-[10px] md:text-xs text-gray-400 font-bold tracking-wider text-center md:text-left">
                        Page <span className="text-gray-900">{page}</span> of {Math.max(1, totalPages)} • Showing {students.length} of {total} records
                    </p>
                    <div className="flex gap-1 flex-wrap justify-center sm:gap-1.5">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                            className="w-10 h-10 rounded-xl border border-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-all cursor-pointer"
                        >
                            <i className="fas fa-chevron-left text-xs"></i>
                        </button>
                        
                        {/* Simple pagination numbers */}
                        {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === Math.max(1, totalPages) || Math.abs(p - page) <= 1)
                            .map((p, i, arr) => (
                                <React.Fragment key={p}>
                                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-gray-300 self-center">...</span>}
                                    <button
                                        onClick={() => setPage(p)}
                                        disabled={loading}
                                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all cursor-pointer ${p === page ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' : 'border border-gray-100 text-gray-400 hover:border-primary hover:text-primary bg-white disabled:opacity-50'}`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))
                        }

                        <button
                            onClick={() => setPage(p => Math.min(Math.max(1, totalPages), p + 1))}
                            disabled={page >= Math.max(1, totalPages) || loading}
                            className="w-10 h-10 rounded-xl border border-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-all cursor-pointer"
                        >
                            <i className="fas fa-chevron-right text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
