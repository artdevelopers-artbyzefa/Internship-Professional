import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';
import { gradeFromPct, gradeColor } from '../../utils/helpers.js';

const GRADING_CRITERIA = [
    { id: 'perf', label: 'Work Performance', weight: 40, icon: 'fa-chart-line' },
    { id: 'ai', label: 'AI Tool Usage', weight: 20, icon: 'fa-robot' },
    { id: 'tech', label: 'Technical Proficiency', weight: 20, icon: 'fa-microchip' },
    { id: 'doc', label: 'Documentation & Reporting', weight: 10, icon: 'fa-book' },
    { id: 'time', label: 'Timeliness & Proactiveness', weight: 10, icon: 'fa-clock' }
];

const SkeletonCard = () => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 animate-pulse space-y-3">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
            <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-100 rounded"></div>
                <div className="h-3 w-20 bg-slate-50 rounded"></div>
            </div>
        </div>
        <div className="flex justify-between">
            <div className="h-4 w-16 bg-slate-100 rounded"></div>
            <div className="h-4 w-16 bg-slate-100 rounded"></div>
        </div>
    </div>
);

export default function SupervisorGrading({ user, activePhase }) {
    const isPhase4 = activePhase?.order >= 4;
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [gradeForm, setGradeForm] = useState({ marks: '', remarks: '', criteria: {} });
    const [gradeData, setGradeData] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const location = useLocation();

    useEffect(() => {
        fetchAssignments();
    }, []);

    useEffect(() => {
        apiRequest(`/supervisor/student-grades?page=${page}&limit=5`).then(res => {
            setGradeData(res.data || []);
            setTotalPages(res.pages || 1);
        }).catch((err) => { /* Error handled by apiRequest */ });
    }, [page]);

    const handleDownload = async (url, name = 'Submission') => {
        if (!url) return;
        try {
            const cleanName = `${name.replace(/[^a-z0-9]/gi, '_')}`;
            const blob = await apiRequest(`/auth/download-proxy?url=${encodeURIComponent(url)}&filename=${cleanName}.pdf`, {
                responseType: 'blob'
            });

            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${cleanName}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            // Error handled by apiRequest
        }
    };

    const fetchAssignments = async () => {
        try {
            const data = await apiRequest('/supervisor/assignments');
            setAssignments(data);

            const params = new URLSearchParams(location.search);
            const aid = params.get('assignmentId');
            if (aid) {
                const found = data.find(a => a._id === aid);
                if (found) {
                    setSelectedAssignment(found);
                    fetchSubmissions(found._id);
                }
            }
        } catch (err) {
            // Error managed by apiRequest
        } finally { setLoading(false); }
    };

    const fetchSubmissions = async (assignmentId) => {
        setLoading(true);
        try {
            const data = await apiRequest(`/supervisor/submissions/${assignmentId}`);
            setSubmissions(data);
        } catch (err) {
            // Error managed by apiRequest
        } finally { setLoading(false); }
    };

    const handleSelectAssignment = (assignment) => {
        setSelectedAssignment(assignment);
        fetchSubmissions(assignment._id);
    };

    const handleOpenGrade = (sub) => {
        if (expandedId === sub._id) {
            setExpandedId(null);
        } else {
            setExpandedId(sub._id);
            setGradeForm({
                marks: sub.marks?.siteSupervisorMarks || '',
                remarks: sub.marks?.siteSupervisorRemarks || '',
                criteria: sub.marks?.siteSupervisorCriteria || {}
            });
        }
    };

    const handleCriteriaToggle = (id) => {
        const newCriteria = { ...gradeForm.criteria, [id]: !gradeForm.criteria[id] };
        const totalWeight = GRADING_CRITERIA.reduce((acc, curr) => acc + (newCriteria[curr.id] ? curr.weight : 0), 0);
        const calculatedMarks = Math.round((totalWeight / 100) * selectedAssignment.totalMarks);

        setGradeForm({
            ...gradeForm,
            criteria: newCriteria,
            marks: calculatedMarks
        });
    };

    const handleGradeSubmit = async (studentId, submissionId) => {
        try {
            await apiRequest('/supervisor/grade', {
                method: 'POST',
                body: {
                    studentId,
                    assignmentId: selectedAssignment._id,
                    marks: gradeForm.marks,
                    remarks: gradeForm.remarks,
                    criteria: gradeForm.criteria
                }
            });
            showToast.success('Grade recorded.');
            setExpandedId(null);
            fetchSubmissions(selectedAssignment._id);
        } catch (err) { /* Error handled by apiRequest */ }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 px-2 sm:px-6">
            {gradeData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center"><i className="fas fa-graduation-cap text-sm" /></div>
                            <h3 className="font-black text-slate-800 tracking-tight">{isPhase4 ? 'Final Evaluation Summary' : 'Intern Faculty Grades'}</h3>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full border border-indigo-100 w-fit">{isPhase4 ? 'Acquired Metrics' : 'Assigned by Faculty'}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/60">
                                    {['Student', 'Reg. No.', 'Weeks', 'Avg /10', '%', 'Grade', 'Status'].map((h, i) => (
                                        <th key={h} className={`px-2 sm:px-6 py-3 text-[9px] sm:text-[11px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-tighter sm:whitespace-nowrap ${i > 1 ? 'text-center' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {gradeData.map((r, i) => {
                                    const gc = r.grade && r.grade !== 'N/A' ? gradeColor(r.grade) : null;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="px-2 sm:px-6 py-3 sm:py-4 font-black text-slate-800 text-[10px] sm:text-sm whitespace-nowrap">{r.student.name}</td>
                                            <td className="px-2 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 font-mono whitespace-nowrap">{r.student.reg}</td>
                                            <td className="px-2 sm:px-6 py-3 sm:py-4 text-center"><span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-indigo-50 text-indigo-600 rounded-full text-[8px] sm:text-[10px] font-black border border-indigo-100">{r.assignmentsCount}</span></td>
                                            <td className="px-2 sm:px-6 py-3 sm:py-4 font-black text-slate-800 text-[10px] sm:text-sm text-center">{r.averageMarks || '—'}</td>
                                            <td className="px-2 sm:px-6 py-3 sm:py-4 text-center"><span className={`text-[10px] sm:text-sm font-black ${r.percentage >= 75 ? 'text-emerald-600' : r.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.percentage !== null ? `${r.percentage}%` : '—'}</span></td>
                                            <td className="px-2 sm:px-6 py-3 sm:py-4 text-center">{gc ? <span className={`inline-block px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded lg text-[8px] sm:text-[11px] font-black border ${gc.bg} ${gc.text} ${gc.border}`}>{r.grade}</span> : <span className="text-slate-300 font-black text-[10px]">—</span>}</td>
                                            <td className="px-2 sm:px-6 py-3 sm:py-4 text-center"><span className={`inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded lg text-[8px] sm:text-[10px] font-black border ${r.status === 'Pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : r.status === 'Fail' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{r.status || 'Pnd'}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination for Summary Table */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between gap-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                Page <span className="text-slate-900">{page}</span> of {totalPages}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:border-primary hover:text-primary disabled:opacity-20 transition-all bg-white cursor-pointer"
                                >
                                    <i className="fas fa-chevron-left text-[10px]" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:border-primary hover:text-primary disabled:opacity-20 transition-all bg-white cursor-pointer"
                                >
                                    <i className="fas fa-chevron-right text-[10px]" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!isPhase4 && (
                <>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="text-center sm:text-left">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">  Evaluation Centre</h2>
                        </div>
                        <select
                            className="w-full lg:w-[300px] p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:ring-4 focus:ring-primary/5"
                            onChange={(e) => {
                                const assignment = assignments.find(a => a._id === e.target.value);
                                if (assignment) handleSelectAssignment(assignment);
                            }}
                            value={selectedAssignment?._id || ''}
                        >
                            <option value="" disabled>Select Assessment Module</option>
                            {assignments.map(a => (
                                <option key={a._id} value={a._id}>{a.title}</option>
                            ))}
                        </select>
                    </div>

                    {!selectedAssignment ? (
                        <div className="bg-white p-12 sm:p-20 rounded-2xl border-2 border-dashed border-slate-100 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto">
                                <i className="fas fa-layer-group text-2xl"></i>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No Assessment Selected</h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto">Pick a Technical Task to manage evaluations.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center text-lg">
                                        <i className="fas fa-file-invoice"></i>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm sm:text-base">{selectedAssignment.title}</h4>
                                        <p className="text-[11px] font-bold text-slate-400 mt-1">
                                            Module Weight: {selectedAssignment.totalMarks} Points
                                        </p>
                                    </div>
                                </div>
                                <div className="px-4 py-2 bg-slate-50 rounded-xl text-center sm:text-right">
                                    <p className="text-[10px] font-bold text-slate-400 mb-1">Total Submissions</p>
                                    <p className="text-lg font-black text-slate-800">{submissions.length}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="md:hidden">
                                    {loading ? (
                                        <div className="p-4 space-y-4">
                                            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                                        </div>
                                    ) : submissions.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 italic text-sm">No submissions yet.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {submissions.map(sub => {
                                                const isExpanded = expandedId === sub._id;
                                                return (
                                                    <div key={sub._id} className="bg-white">
                                                        <div className={`p-4 flex items-center justify-between gap-4 cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                                                            onClick={() => handleOpenGrade(sub)}>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs overflow-hidden">
                                                                    {sub.user?.profilePicture ? <img src={sub.user.profilePicture} className="w-full h-full object-cover" /> : sub.user?.name[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800 leading-tight">{sub.user?.name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{sub.user?.reg}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${sub.marks?.isSiteSupervisorGraded ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                                                                    {sub.marks?.isSiteSupervisorGraded ? 'Graded' : 'Pending'}
                                                                </span>
                                                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] text-slate-300`}></i>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="p-4 bg-slate-50/30 border-t border-slate-100">
                                                                <div className="flex gap-2 mb-4">
                                                                    <button onClick={() => handleDownload(sub.fileUrl, sub.user?.name)}
                                                                        className="flex-1 py-2 bg-primary text-white rounded-xl text-[10px] font-black border-0 cursor-pointer">
                                                                        View Document
                                                                    </button>
                                                                </div>
                                                                <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100">
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        {GRADING_CRITERIA.map(c => {
                                                                            const isChecked = gradeForm.criteria && gradeForm.criteria[c.id];
                                                                            return (
                                                                                <div key={c.id} onClick={() => handleCriteriaToggle(c.id)}
                                                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isChecked ? 'bg-primary/5 border-primary' : 'bg-slate-50/50 border-slate-100'}`}>
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isChecked ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                                                            <i className={`fas ${c.icon} text-[10px]`}></i>
                                                                                        </div>
                                                                                        <span className="text-[11px] font-bold text-slate-700">{c.label}</span>
                                                                                    </div>
                                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isChecked ? 'bg-primary border-primary text-white' : 'border-slate-200'}`}>
                                                                                        {isChecked && <i className="fas fa-check text-[8px]"></i>}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <textarea className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium h-24 resize-none"
                                                                        placeholder="Feedback..." value={gradeForm.remarks} onChange={e => setGradeForm({ ...gradeForm, remarks: e.target.value })} />
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <div className="text-center">
                                                                            <p className="text-[9px] font-bold text-slate-400">Final Score</p>
                                                                            <p className="text-lg font-black text-primary">{gradeForm.marks || 0}</p>
                                                                        </div>
                                                                        <button onClick={() => handleGradeSubmit(sub.user._id, sub._id)} disabled={gradeForm.marks === ''}
                                                                            className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-black border-0 disabled:opacity-40">
                                                                            Save Evaluation
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                {['Intern Information', 'Submission', 'Site Grade', 'Faculty', 'Actions'].map((h, i) => (
                                                    <th key={h} className={`px-2 sm:px-6 py-4 text-[9px] sm:text-[11px] font-bold text-slate-400 border-b border-slate-100 ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {submissions.map(sub => (
                                                <React.Fragment key={sub._id}>
                                                    <tr className={`hover:bg-slate-50/30 transition-colors ${expandedId === sub._id ? 'bg-slate-50' : ''}`}>
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs overflow-hidden">
                                                                    {sub.user?.profilePicture ? <img src={sub.user.profilePicture} className="w-full h-full object-cover" /> : sub.user?.name[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800 leading-none mb-1">{sub.user?.name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 leading-none">{sub.user?.reg}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <button onClick={() => handleDownload(sub.fileUrl, sub.user?.name)}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl border-0 transition-all text-[11px] font-bold cursor-pointer">
                                                                <i className="fas fa-file-pdf"></i> View File
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {sub.marks?.isSiteSupervisorGraded ? (
                                                                <p className="text-sm font-black text-slate-900">{sub.marks.siteSupervisorMarks} / {selectedAssignment.totalMarks}</p>
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-slate-300 italic">Pending</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${sub.marks?.isFacultyGraded ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                                                                {sub.marks?.isFacultyGraded ? 'Verified' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <button onClick={() => handleOpenGrade(sub)}
                                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border-0 cursor-pointer ${expandedId === sub._id ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}>
                                                                {expandedId === sub._id ? 'Cancel' : 'Evaluate'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {expandedId === sub._id && (
                                                        <tr>
                                                            <td colSpan="5" className="p-0 border-b border-slate-100">
                                                                <div className="p-8 bg-white border-x border-slate-100 m-2 rounded-2xl shadow-sm space-y-6">
                                                                    <div className="flex flex-col lg:flex-row gap-8">
                                                                        <div className="flex-1 space-y-6">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <label className="text-[11px] font-bold text-slate-400">Criteria Breakdown</label>
                                                                                <span className="text-lg font-black text-primary">{gradeForm.marks || 0} / {selectedAssignment.totalMarks}</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                {GRADING_CRITERIA.map(c => {
                                                                                    const isChecked = gradeForm.criteria && gradeForm.criteria[c.id];
                                                                                    return (
                                                                                        <div key={c.id} onClick={() => handleCriteriaToggle(c.id)}
                                                                                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${isChecked ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isChecked ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                                                                <i className={`fas ${c.icon}`}></i>
                                                                                            </div>
                                                                                            <div className="flex-1">
                                                                                                <p className={`text-[11px] font-bold ${isChecked ? 'text-primary' : 'text-slate-700'}`}>{c.label}</p>
                                                                                                <p className="text-[10px] font-bold text-slate-400">{c.weight}% Weight</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm h-32 resize-none"
                                                                                placeholder="Remarks..." value={gradeForm.remarks} onChange={e => setGradeForm({ ...gradeForm, remarks: e.target.value })} />
                                                                        </div>
                                                                        <div className="lg:w-64 flex flex-col justify-end">
                                                                            <button onClick={() => handleGradeSubmit(sub.user._id, sub._id)} disabled={gradeForm.marks === ''}
                                                                                className="w-full py-4 rounded-2xl font-black text-xs bg-primary text-white border-0 transition-all disabled:opacity-40">
                                                                                Save Evaluation
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
