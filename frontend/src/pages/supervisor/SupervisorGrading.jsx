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

export default function SupervisorGrading({ user }) {
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [gradeForm, setGradeForm] = useState({ marks: '', remarks: '', criteria: {} });
    const [gradeData, setGradeData] = useState([]);
    const location = useLocation();

    useEffect(() => {
        fetchAssignments();
        apiRequest('/supervisor/student-grades').then(d => setGradeData(d || [])).catch(() => { });
    }, []);

    const handleDownload = (url, name = 'Submission') => {
        if (!url) return;
        const cleanName = `${name.replace(/[^a-z0-9]/gi, '_')}`;
        const proxyUrl = `${import.meta.env.VITE_API_URL}/auth/download-proxy?url=${encodeURIComponent(url)}&filename=${cleanName}.pdf`;
        window.location.assign(proxyUrl);
    };




    const fetchAssignments = async () => {

        try {
            const data = await apiRequest('/supervisor/assignments');
            setAssignments(data);

            // Handle query param
            const params = new URLSearchParams(location.search);
            const aid = params.get('assignmentId');
            if (aid) {
                const found = data.find(a => a._id === aid);
                if (found) {
                    setSelectedAssignment(found);
                    fetchSubmissions(found._id);
                }
            }
        } catch (err) { } finally { setLoading(false); }
    };

    const fetchSubmissions = async (assignmentId) => {
        setLoading(true);
        try {
            const data = await apiRequest(`/supervisor/submissions/${assignmentId}`);
            setSubmissions(data);
        } catch (err) { } finally { setLoading(false); }
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
                criteria: sub.marks?.siteSupervisorCriteria || {} // Load saved criteria breakdown
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
            showToast.success('Grade recorded successfully.');
            setExpandedId(null);
            fetchSubmissions(selectedAssignment._id); // Refresh
        } catch (err) { }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Faculty Grade Summary ─────────────────────────────────── */}
            {gradeData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-50 flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center"><i className="fas fa-graduation-cap text-sm" /></div>
                        <h3 className="font-black text-gray-800 tracking-tight">Intern Faculty Grades</h3>
                        <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full border border-indigo-100">Assigned by Faculty Supervisor</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/60">
                                    {['Student', 'Reg. No.', 'Weeks', 'Average /10', '%', 'Grade', 'Status'].map(h => (
                                        <th key={h} className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {gradeData.map((r, i) => {
                                    const gc = r.grade && r.grade !== 'N/A' ? gradeColor(r.grade) : null;
                                    return (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-4 font-bold text-gray-800 text-sm">{r.student.name}</td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-gray-400 font-mono">{r.student.reg}</td>
                                            <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black border border-indigo-100">{r.assignmentsCount}</span></td>
                                            <td className="px-6 py-4 font-black text-gray-800 text-sm">{r.averageMarks || '—'}</td>
                                            <td className="px-6 py-4"><span className={`text-sm font-black ${r.percentage >= 75 ? 'text-emerald-600' : r.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.percentage !== null ? `${r.percentage}%` : '—'}</span></td>
                                            <td className="px-6 py-4">{gc ? <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black tracking-widest border ${gc.bg} ${gc.text} ${gc.border}`}>{r.grade}</span> : <span className="text-gray-300 font-bold text-xs">—</span>}</td>
                                            <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${r.status === 'Pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : r.status === 'Fail' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}><i className={`fas text-[8px] ${r.status === 'Pass' ? 'fa-check' : r.status === 'Fail' ? 'fa-times' : 'fa-clock'}`} />{r.status || 'Pending'}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Industrial Evaluation Centre</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Select an industrial task to review and grade intern submissions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700 text-sm outline-none focus:ring-4 focus:ring-primary/5 min-w-[250px]"
                        onChange={(e) => {
                            const assignment = assignments.find(a => a._id === e.target.value);
                            if (assignment) handleSelectAssignment(assignment);
                        }}
                        value={selectedAssignment?._id || ''}
                    >
                        <option value="" disabled>— Select Assessment Module —</option>
                        {assignments.map(a => (
                            <option key={a._id} value={a._id}>{a.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && !assignments.length ? (
                <div className="p-20 text-center flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Synchronizing Registry...</p>
                </div>
            ) : !selectedAssignment ? (
                <div className="bg-white p-20 rounded-2xl border-2 border-dashed border-gray-100 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto">
                        <i className="fas fa-layer-group text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">No Assessment Selected</h3>
                    <p className="text-sm text-gray-500">Pick a Technical Task from the dropdown above to manage evaluations.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center text-lg">
                                <i className="fas fa-file-invoice"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">{selectedAssignment.title}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                                    Module Weightage: {selectedAssignment.totalMarks} Points
                                </p>
                            </div>
                        </div>
                        <div className="px-4 py-2 bg-gray-50 rounded-xl text-center">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Submissions</p>
                            <p className="text-lg font-black text-gray-800 leading-none">{submissions.length}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Intern Information</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Submission Document</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Site Grade</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Faculty Verified</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {submissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-10 text-center text-gray-400 font-medium italic">No submissions received yet for this module.</td>
                                    </tr>
                                ) : (
                                    submissions.map(sub => (
                                        <React.Fragment key={sub._id}>
                                            <tr className={`hover:bg-gray-50/30 transition-colors ${expandedId === sub._id ? 'bg-gray-50/50' : ''}`}>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-400 text-xs shadow-inner uppercase overflow-hidden">
                                                            {sub.user?.profilePicture ? <img src={sub.user.profilePicture} className="w-full h-full object-cover" /> : sub.user?.name[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800 leading-none mb-1">{sub.user?.name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{sub.user?.reg}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <button
                                                        onClick={() => handleDownload(sub.fileUrl, `${sub.user?.name}_${selectedAssignment.title}`)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-white text-gray-600 hover:text-primary rounded-lg border border-gray-100 transition-all text-xs font-bold shadow-sm cursor-pointer"
                                                    >
                                                        <i className="fas fa-file-pdf"></i> View File
                                                    </button>
                                                </td>
                                                <td className="px-8 py-5">
                                                    {sub.marks?.isSiteSupervisorGraded ? (
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 leading-none">{sub.marks.siteSupervisorMarks} / {selectedAssignment.totalMarks}</p>
                                                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Assigned</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-gray-300 italic">Unmarked</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black border ${sub.marks?.isFacultyGraded ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                                                        {sub.marks?.isFacultyGraded ? 'VERIFIED' : 'PENDING'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => handleOpenGrade(sub)}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer shadow-lg shadow-gray-200 ${expandedId === sub._id ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white hover:bg-black'}`}
                                                    >
                                                        {expandedId === sub._id ? (
                                                            <><i className="fas fa-times mr-2"></i> Cancel</>
                                                        ) : (
                                                            sub.marks?.isSiteSupervisorGraded ? 'Update Marks' : 'Evaluate Work'
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Inline Grading Dropdown (Expander) */}
                                            {expandedId === sub._id && (
                                                <tr className="bg-gray-50/50 animate-in slide-in-from-top-2 duration-300">
                                                    <td colSpan="5" className="p-0 border-b border-gray-100">
                                                        <div className="p-8 bg-white border-x border-gray-100 m-2 rounded-2xl shadow-sm space-y-8">
                                                            <div className="flex flex-col md:flex-row gap-8">
                                                                <div className="flex-1 space-y-6">
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-4">
                                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assessment Criteria Breakdown</label>
                                                                            <span className="text-lg font-black text-primary">{gradeForm.marks || 0} / {selectedAssignment.totalMarks}</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                            {GRADING_CRITERIA.map(c => {
                                                                                const isChecked = gradeForm.criteria && gradeForm.criteria[c.id];
                                                                                const weightValue = Math.round((c.weight / 100) * selectedAssignment.totalMarks);
                                                                                return (
                                                                                    <div
                                                                                        key={c.id}
                                                                                        onClick={() => handleCriteriaToggle(c.id)}
                                                                                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${isChecked
                                                                                            ? 'bg-primary/5 border-primary shadow-sm'
                                                                                            : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                                                                    >
                                                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isChecked ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                                                                                            <i className={`fas ${c.icon}`}></i>
                                                                                        </div>
                                                                                        <div className="flex-1">
                                                                                            <p className={`text-xs font-bold ${isChecked ? 'text-primary' : 'text-gray-700'}`}>{c.label}</p>
                                                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Weightage: {c.weight}% ({weightValue} Pts)</p>
                                                                                        </div>
                                                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-primary border-primary' : 'border-gray-100'}`}>
                                                                                            {isChecked && <i className="fas fa-check text-[10px] text-white"></i>}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Technical Feedback & Remarks</label>
                                                                        <textarea
                                                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-700 text-sm h-32 resize-none outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                                            placeholder="Ex: Good technical understanding, but needs to improve documentation..."
                                                                            value={gradeForm.remarks}
                                                                            onChange={e => setGradeForm({ ...gradeForm, remarks: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="md:w-64 flex flex-col justify-end">
                                                                    <button
                                                                        onClick={() => handleGradeSubmit(sub.user._id, sub._id)}
                                                                        disabled={gradeForm.marks === ''}
                                                                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-0 shadow-xl flex items-center justify-center gap-2 cursor-pointer ${gradeForm.marks === '' ? 'bg-gray-100 text-gray-400 shadow-none' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'}`}
                                                                    >
                                                                        <i className="fas fa-save"></i> Save Evaluation
                                                                    </button>
                                                                    <p className="text-[9px] text-gray-400 text-center mt-4 font-bold uppercase tracking-tight">Final score will be verified by faculty</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
