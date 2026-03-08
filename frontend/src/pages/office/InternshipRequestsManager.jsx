import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';
import { FormGroup, TextareaInput } from '../../components/ui/FormInput.jsx';

const ITEMS_PER_PAGE = 10;

const statusConfig = {
    'Internship Request Submitted': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review' },
    'Internship Approved': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
    'Internship Rejected': { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejected' },
};

const facultyConfig = {
    'Pending': { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Faculty Pending' },
    'Accepted': { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Faculty Accepted' },
    'Rejected': { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Faculty Rejected' },
};

function Badge({ cfg, label }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} border-current/20`}>
            {label || cfg.label}
        </span>
    );
}

function DetailRow({ label, value }) {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            <span className="text-sm font-semibold text-gray-800">{value}</span>
        </div>
    );
}

function StudentDrawer({ student, onClose, onDecide, deciding }) {
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectBox, setShowRejectBox] = useState(false);
    const req = student.internshipRequest;
    const fStatus = req?.facultyStatus;
    const fCfg = facultyConfig[fStatus] || facultyConfig['Pending'];
    const sCfg = statusConfig[student.status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: student.status };

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="w-full max-w-xl bg-white shadow-2xl overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-0.5">Internship Request Details</p>
                        <h3 className="text-lg font-black text-gray-800">{student.name}</h3>
                        <p className="text-xs text-gray-400 font-medium">{student.reg}</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                        <i className="fas fa-xmark"></i>
                    </button>
                </div>

                <div className="px-8 py-6 flex-1 space-y-6">
                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2">
                        <Badge cfg={sCfg} />
                        <Badge cfg={fCfg} />
                    </div>

                    {/* Student Info */}
                    <div className="bg-gray-50 rounded-2xl p-5 grid grid-cols-2 gap-4">
                        <DetailRow label="Email" value={student.email} />
                        <DetailRow label="Semester" value={student.semester ? `Semester ${student.semester}` : null} />
                        <DetailRow label="Section" value={student.section} />
                        <DetailRow label="CGPA" value={student.cgpa} />
                    </div>

                    {/* Placement Details */}
                    {req && (
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Placement Details</h4>
                            <div className="grid grid-cols-2 gap-4 bg-white border border-gray-100 rounded-2xl p-5">
                                <DetailRow label="Type" value={req.type === 'Self' ? 'Self Arranged' : req.type} />
                                <DetailRow label="Mode" value={req.mode} />
                                <DetailRow label="Duration" value={req.duration} />
                                <DetailRow label="Start Date" value={req.startDate ? new Date(req.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
                                <DetailRow label="End Date" value={req.endDate ? new Date(req.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
                                <DetailRow label="Submitted" value={req.submittedAt ? new Date(req.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
                                {req.companyName && <div className="col-span-2"><DetailRow label="Organization" value={req.companyName} /></div>}
                                {req.description && <div className="col-span-2"><DetailRow label="Description" value={req.description} /></div>}
                            </div>
                        </div>
                    )}

                    {/* Site Supervisor */}
                    {(req?.siteSupervisorName || req?.siteSupervisorEmail) && (
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Site Supervisor</h4>
                            <div className="grid grid-cols-2 gap-4 bg-white border border-gray-100 rounded-2xl p-5">
                                <DetailRow label="Name" value={req.siteSupervisorName} />
                                <DetailRow label="Email" value={req.siteSupervisorEmail} />
                                <DetailRow label="Phone" value={req.siteSupervisorPhone} />
                            </div>
                        </div>
                    )}

                    {/* Faculty Supervisor */}
                    {req && (
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Faculty Supervisor</h4>
                            <div className={`rounded-2xl p-5 border ${fCfg.bg} border-current/10`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <Badge cfg={fCfg} label={fStatus} />
                                </div>
                                {req.facultyType === 'Identify New' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <DetailRow label="Proposed Name" value={req.newFacultyDetails?.name} />
                                        <DetailRow label="Proposed Email" value={req.newFacultyDetails?.email} />
                                        <DetailRow label="Department" value={req.newFacultyDetails?.department} />
                                    </div>
                                ) : (
                                    <DetailRow label="Selection" value="Registered Faculty (by ID)" />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Rejection Reason if already rejected */}
                    {student.status === 'Internship Rejected' && req?.rejectionReason && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Rejection Reason</p>
                            <p className="text-sm font-medium text-rose-700">{req.rejectionReason}</p>
                        </div>
                    )}
                </div>

                {/* Action Footer — only for pending */}
                {student.status === 'Internship Request Submitted' && (
                    <div className="px-8 py-6 border-t border-gray-100 sticky bottom-0 bg-white space-y-4">
                        {showRejectBox ? (
                            <div className="space-y-3">
                                <FormGroup label="Rejection Reason">
                                    <TextareaInput
                                        rows={3}
                                        placeholder="Provide reason for rejection..."
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                    />
                                </FormGroup>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowRejectBox(false)}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-xs font-black uppercase tracking-widest hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={!rejectReason.trim() || deciding}
                                        onClick={() => onDecide(student._id, 'reject', rejectReason)}
                                        className="flex-1 py-3 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-widest hover:bg-rose-600 disabled:opacity-50 transition-colors"
                                    >
                                        {deciding ? <i className="fas fa-circle-notch fa-spin"></i> : 'Confirm Reject'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowRejectBox(true)}
                                    className="flex-1 py-3 rounded-xl border-2 border-rose-200 text-rose-500 text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
                                >
                                    <i className="fas fa-xmark mr-2"></i> Reject
                                </button>
                                <button
                                    disabled={deciding}
                                    onClick={() => onDecide(student._id, 'approve')}
                                    className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200"
                                >
                                    {deciding ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-check mr-2"></i> Approve</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function InternshipRequestsManager({ user }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all | pending | approved | rejected
    const [page, setPage] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [deciding, setDeciding] = useState(false);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            // Fetch all students who have submitted
            const data = await apiRequest('/office/pending-requests');
            // Also fetch approved and rejected for full picture
            const [approved, rejected] = await Promise.all([
                apiRequest('/office/approved-students').catch(() => []),
                apiRequest('/auth/student-list').then(all => (all || []).filter(s => s.status === 'Internship Rejected')).catch(() => [])
            ]);
            const combined = [...(data || []), ...(approved || []), ...(rejected || [])];
            // Deduplicate by _id
            const map = new Map();
            combined.forEach(s => map.set(s._id, s));
            setStudents(Array.from(map.values()));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDecide = async (studentId, decision, comment) => {
        try {
            setDeciding(true);
            await apiRequest('/office/decide-request', {
                method: 'POST',
                body: { studentId, decision, comment }
            });
            showToast.success(`Request ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`);
            setSelectedStudent(null);
            fetchRequests();
        } catch (err) {
            // handled by apiRequest
        } finally {
            setDeciding(false);
        }
    };

    const filtered = useMemo(() => {
        let list = students;
        if (filter === 'pending') list = list.filter(s => s.status === 'Internship Request Submitted');
        if (filter === 'approved') list = list.filter(s => s.status === 'Internship Approved');
        if (filter === 'rejected') list = list.filter(s => s.status === 'Internship Rejected');
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.name?.toLowerCase().includes(q) ||
                s.reg?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q) ||
                s.internshipRequest?.companyName?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [students, filter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const counts = {
        all: students.length,
        pending: students.filter(s => s.status === 'Internship Request Submitted').length,
        approved: students.filter(s => s.status === 'Internship Approved').length,
        rejected: students.filter(s => s.status === 'Internship Rejected').length,
    };

    const tabs = [
        { key: 'all', label: 'All', count: counts.all },
        { key: 'pending', label: 'Pending', count: counts.pending },
        { key: 'approved', label: 'Approved', count: counts.approved },
        { key: 'rejected', label: 'Rejected', count: counts.rejected },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phase 2 — Internship Office</p>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Internship Requests</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">Review and action all student AppEx-A submissions for this cycle.</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="text-xs font-black text-amber-700">{counts.pending} Pending</span>
                    </div>
                    <button onClick={fetchRequests} className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                        <i className="fas fa-rotate-right text-sm"></i>
                    </button>
                </div>
            </div>

            {/* Filter Tabs + Search */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => { setFilter(t.key); setPage(1); }}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filter === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {t.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${filter === t.key ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                    {t.count}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search name, reg, company..."
                            className="pl-9 pr-4 py-2.5 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 w-64"
                        />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="py-16 text-center"><i className="fas fa-circle-notch fa-spin text-2xl text-primary opacity-50"></i></div>
                ) : paginated.length === 0 ? (
                    <div className="py-16 text-center text-gray-300">
                        <i className="fas fa-inbox text-4xl mb-3 block"></i>
                        <p className="text-sm font-semibold">No requests found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    {['Student', 'Reg #', 'Company', 'Type', 'Mode', 'Faculty', 'Status', ''].map(h => (
                                        <th key={h} className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest pb-3 pr-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginated.map(s => {
                                    const req = s.internshipRequest;
                                    const sCfg = statusConfig[s.status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: s.status };
                                    const fCfg = facultyConfig[req?.facultyStatus] || facultyConfig['Pending'];
                                    return (
                                        <tr key={s._id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 pr-4 font-bold text-gray-800 whitespace-nowrap">{s.name}</td>
                                            <td className="py-4 pr-4 text-gray-400 font-mono text-xs whitespace-nowrap">{s.reg}</td>
                                            <td className="py-4 pr-4 text-gray-600 font-medium max-w-[140px] truncate">{req?.companyName || <span className="text-gray-300 italic">N/A</span>}</td>
                                            <td className="py-4 pr-4 text-gray-500 font-medium whitespace-nowrap">{req?.type === 'Self' ? 'Self' : req?.type || '—'}</td>
                                            <td className="py-4 pr-4 text-gray-500 font-medium whitespace-nowrap">{req?.mode || '—'}</td>
                                            <td className="py-4 pr-4">
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full ${fCfg.bg} ${fCfg.text}`}>
                                                    {req?.facultyStatus || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4">
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${sCfg.bg} ${sCfg.text}`}>
                                                    {sCfg.label}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <button
                                                    onClick={() => setSelectedStudent(s)}
                                                    className="px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-black text-gray-500 hover:bg-gray-50 hover:border-primary/20 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    View <i className="fas fa-arrow-right ml-1 text-[8px]"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

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

            {/* Detail Drawer */}
            {selectedStudent && (
                <StudentDrawer
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onDecide={handleDecide}
                    deciding={deciding}
                />
            )}
        </div>
    );
}
