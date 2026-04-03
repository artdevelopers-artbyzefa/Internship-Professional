import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../components/ui/Card.jsx';
import { apiRequest } from '../../utils/api.js';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';

// ── Tab Component ──────────────────────────────────────────────────────────
function Tab({ active, label, icon, onClick, count }) {
    return (
        <button 
            onClick={onClick}
            className={`px-6 py-4 flex items-center gap-2.5 transition-all relative border-b-2 font-black text-[10px] uppercase tracking-widest
                ${active 
                    ? 'text-primary border-primary bg-primary/5' 
                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'}`}
        >
            <i className={`fas ${icon} ${active ? 'text-primary' : 'text-gray-300'}`} />
            {label}
            {count != null && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

// ── Table Pagination Hook ──────────────────────────────────────────────────
function usePagination(data, pageSize = 10) {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(data.length / pageSize);
    const paginated = data.slice(page * pageSize, (page + 1) * pageSize);
    return { paginated, page, setPage, totalPages, total: data.length };
}

function Pagination({ page, totalPages, setPage }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-50 bg-white">
            <button 
                disabled={page === 0} 
                onClick={() => setPage(p => p - 1)}
                className="p-2 text-primary disabled:text-gray-300 hover:bg-primary/5 rounded-lg transition-all"
            >
                <i className="fas fa-chevron-left" />
            </button>
            <span className="text-[10px] font-black text-gray-400 uppercase">Page {page + 1} of {totalPages}</span>
            <button 
                disabled={page >= totalPages - 1} 
                onClick={() => setPage(p => p + 1)}
                className="p-2 text-primary disabled:text-gray-300 hover:bg-primary/5 rounded-lg transition-all"
            >
                <i className="fas fa-chevron-right" />
            </button>
        </div>
    );
}

const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not Started';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });
};

function SupervisorCard({ name, role, icon, colorClass, badgeText, badgeColor, subText, interns }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden transition-all">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center ${colorClass} border border-gray-100 text-sm`}>
                        <i className={`fas ${icon}`} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800 leading-none">{name}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-medium">{role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className={`text-xs font-bold ${badgeColor}`}>{badgeText}</p>
                        {subText && <p className="text-[8px] font-black text-gray-300 uppercase leading-none mt-1 tracking-tight">{subText}</p>}
                    </div>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-300 text-[10px] transition-transform`} />
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 bg-gray-50/30 border-t border-gray-50 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    {interns.length > 0 ? interns.map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100/50">
                            <div>
                                <p className="text-xs font-bold text-gray-800 truncate">{s.name}</p>
                                <p className="text-[9px] font-bold text-primary uppercase tracking-tight">{s.reg}</p>
                            </div>
                            <div className="text-[9px] font-bold px-2 py-0.5 bg-gray-50 text-gray-400 rounded uppercase">
                                {s.grade || 'N/A'}
                            </div>
                        </div>
                    )) : (
                        <p className="text-[10px] text-gray-400 text-center py-2 italic font-medium uppercase tracking-widest">No assigned records found.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function HODArchive() {
    const [archives, setArchives] = useState([]);
    const [selected, setSelected] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);

    useEffect(() => {
        apiRequest('/office/archives')
            .then(data => setArchives(data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // ── Derived Snapshot Data ───────────────────────────────────────────────
    const entities = useMemo(() => {
        if (!selected || !selected.rawSnapshot?.entities) return null;
        return selected.rawSnapshot.entities;
    }, [selected]);

    const studentList = useMemo(() => {
        if (!selected) return [];
        return selected.students
            .filter(s => 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                s.reg.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    }, [selected, searchTerm]);

    const snapshotPhases = useMemo(() => {
        if (!selected) return [];
        return selected.phases || selected.rawSnapshot?.phases || [];
    }, [selected]);

    const topPerformers = useMemo(() => {
        return [...(selected?.students || [])].sort((a, b) => b.percentage - a.percentage).slice(0, 10);
    }, [selected]);

    const bottomPerformers = useMemo(() => {
        if (!selected) return [];
        return selected.students
            .filter(s => ['D', 'F'].includes(s.grade))
            .sort((a, b) => a.percentage - b.percentage);
    }, [selected]);

    const handleExportPDF = async () => {
        if (selected.pdfUrl) {
            window.open(selected.pdfUrl, '_blank');
            return;
        }
        setExportingPDF(true);
        try {
            const payload = {
                archiveId: selected._id === 'live-snapshot-id' ? null : selected._id,
                stats: {
                    total: selected.statistics?.totalStudents || 0,
                    participating: selected.statistics?.totalParticipated || 0,
                    physical: selected.statistics?.totalPhysical || 0,
                    freelance: selected.statistics?.totalFreelance || 0,
                    ineligible: selected.statistics?.totalIneligible || 0,
                    passed: selected.statistics?.totalPassed || 0,
                    failed: selected.statistics?.totalFailed || 0,
                    avgPct: selected.statistics?.averagePercentage || 0,
                    avgGrade: 'N/A'
                },
                charts: {}, // Images not supported yet for background archival
                tables: {
                    faculty: (entities?.faculty || []).map(f => [f.name, f.students?.length || 0, 'N/A', 'N/A']),
                    students: selected.students.map(s => [
                        s.reg, s.name, s.phone || 'N/A', s.email || 'N/A',
                        s.faculty?.name || 'N/A', s.siteSupervisor?.name || 'N/A',
                        s.company || 'N/A', s.mode || 'N/A', s.avgMarks, s.percentage, s.grade, s.finalStatus
                    ])
                }
            };
            const res = await apiRequest('/reports/hod-full-report', { method: 'POST', body: payload });
            if (res.url) {
                window.open(res.url, '_blank');
                if (selected._id !== 'live-snapshot-id') {
                    setSelected(prev => ({ ...prev, pdfUrl: res.url }));
                    setArchives(prev => prev.map(a => a._id === selected._id ? { ...a, pdfUrl: res.url } : a));
                }
            }
        } catch (err) { } 
        finally { setExportingPDF(false); }
    };

    const handleExportExcel = async () => {
        if (selected.excelUrl) {
            window.open(selected.excelUrl, '_blank');
            return;
        }
        setExportingExcel(true);
        const isLive = selected._id === 'live-snapshot-id';
        try {
            const res = await apiRequest('/reports/hod-excel-report', { 
                method: 'POST', 
                body: { archiveId: isLive ? null : selected._id },
                responseType: isLive ? 'blob' : 'json'
            });
            
            if (!isLive && res.url) {
                window.open(res.url, '_blank');
                setSelected(prev => ({ ...prev, excelUrl: res.url }));
                setArchives(prev => prev.map(a => a._id === selected._id ? { ...a, excelUrl: res.url } : a));
            } else if (isLive) {
                // If it's a direct browser download (for live snapshot)
                const url = window.URL.createObjectURL(res);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Institutional_Audit_${selected.cycleName}.xlsx`;
                a.click();
            }
        } catch (err) { }
        finally { setExportingExcel(false); }
    };

    const { paginated: pStudents, page: sPage, setPage: setSPage, totalPages: sTotal } = usePagination(studentList, 15);

    useEffect(() => {
        setSPage(0);
    }, [searchTerm, selected]);

    if (loading) return <div className="py-32 text-center"><i className="fas fa-circle-notch fa-spin text-primary text-4xl"></i><p className="mt-4 text-xs font-medium text-gray-400">Loading archive data...</p></div>;

    // ── Individual Student Dossier View ─────────────────────────────────────
    if (selectedStudent) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-primary/5 text-primary rounded-xl flex items-center justify-center text-xl border border-primary/10">
                            <i className="fas fa-user-graduate" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Registration: <span className="font-semibold text-primary">{selectedStudent.reg}</span> · {selectedStudent.company}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-black transition-all shadow-lg shadow-gray-900/10">
                        <i className="fas fa-chevron-left mr-2" /> Back to Overview
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="rounded-2xl p-6 border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-3">
                                <i className="fas fa-award text-primary" /> Academic Evaluation Record
                            </h3>
                            <span className="px-3 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-bold border border-primary/10">Grade: {selectedStudent.grade}</span>
                        </div>
                        {selectedStudent.marks?.length > 0 ? (
                            <div className="space-y-4">
                                {selectedStudent.marks.map((m, i) => (
                                    <div key={i} className="p-5 bg-gray-50/50 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="text-sm font-bold text-gray-800">{m.title}</h4>
                                            <span className="text-xs font-bold text-primary bg-white px-2 py-1 rounded-lg border border-gray-100">{m.marks} / {m.totalMarks}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Faculty Score</p>
                                                <p className="text-base font-bold text-gray-900">{m.facultyMarks || 0}</p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Supervisor Score</p>
                                                <p className="text-base font-bold text-gray-900">{m.siteSupervisorMarks || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="py-20 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">No evaluation records found.</div>}
                    </Card>

                    <Card className="rounded-2xl p-6 border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-3">
                                <i className="fas fa-comment-dots text-emerald-500" /> Industrial Feedback
                            </h3>
                        </div>
                        {selectedStudent.evaluations?.length > 0 ? (
                            <div className="space-y-4">
                                {selectedStudent.evaluations.map((e, i) => (
                                    <div key={i} className="p-5 bg-white rounded-xl border border-gray-100 border-l-4 border-l-emerald-500">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">{e.title}</span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase">{new Date(e.submittedAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed mb-4 italic font-medium">"{e.feedback}"</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div>
                                                <p className="text-[9px] font-bold text-primary uppercase">{e.evaluatorRole}</p>
                                                <p className="text-xs font-bold text-gray-700">{e.evaluatorName}</p>
                                            </div>
                                            <span className="text-xl font-bold text-emerald-600">{e.score}/10</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="py-20 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">No evaluations documented.</div>}
                    </Card>
                </div>
            </div>
        );
    }

    // ── Cycle Overview / Forensic Multi-Section Report ───────────────────────
    if (selected) {
        const totalTasks = entities?.siteSupervisors?.reduce((acc, ss) => acc + (ss.tasksGraded || 0), 0) || 0;

        return (
            <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                {/* ── HERO COMMAND CENTER ──────────────────────────────────── */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8 pb-8 border-b border-gray-50">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selected.isLive ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-500'}`}>
                                    {selected.isLive ? 'Active Programme' : 'Archived Cycle'}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">Record ID: {selected._id.slice(-8).toUpperCase()}</span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{selected.cycleName}</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                <i className="far fa-calendar-alt mr-2" />
                                Compiled on {new Date(selected.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExportPDF}
                                disabled={exportingPDF}
                                className="flex items-center gap-3 px-6 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-rose-100 transition-all disabled:opacity-50"
                            >
                                {exportingPDF ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-file-pdf" />}
                                PDF Report
                            </button>
                            <button
                                onClick={handleExportExcel}
                                disabled={exportingExcel}
                                className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-100 transition-all disabled:opacity-50"
                            >
                                {exportingExcel ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-file-excel" />}
                                Excel Export
                            </button>
                            <button 
                                onClick={() => setSelected(null)} 
                                className="w-12 h-12 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-gray-600 transition-all"
                            >
                                <i className="fas fa-times text-lg" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Placements', value: selected.students.length, icon: 'fa-users', color: 'text-primary' },
                            { label: 'Avg Performance', value: `${selected.statistics.averagePercentage.toFixed(1)}%`, icon: 'fa-chart-line', color: 'text-indigo-500' },
                            { label: 'Success Rate', value: `${Math.round((selected.statistics.totalPassed / (selected.statistics.totalParticipated || 1)) * 100)}%`, icon: 'fa-check-circle', color: 'text-emerald-500' },
                            { label: 'Completion', value: '100%', icon: 'fa-shield-halved', color: 'text-slate-400' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-50">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-bold text-gray-900">{stat.value}</span>
                                    <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-100 ${stat.color} text-xs shadow-sm`}>
                                        <i className={`fas ${stat.icon}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── SECTION 1: PERFORMANCE FORENSICS (STATS) ────────────────── */}
                <section id="stats" className="space-y-8">
                    <div className="flex items-center gap-6">
                        <h2 className="text-xs font-bold text-gray-400 tracking-widest whitespace-nowrap">Performance Overview</h2>
                        <div className="h-px bg-gray-100 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Success Ratio', value: `${Math.round((selected.statistics.totalPassed / (selected.statistics.totalParticipated || 1)) * 100)}%`, desc: 'Certified placements', color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                            { label: 'Academic Avg', value: `${selected.statistics.averagePercentage.toFixed(1)}%`, desc: 'Average grade score', color: 'text-primary', bg: 'bg-primary/5' },
                            { label: 'Performance Review', value: selected.statistics.totalFailed, desc: 'Below required threshold', color: 'text-rose-600', bg: 'bg-rose-50/50' },
                            { label: 'Academic Load', value: selected.statistics.totalStudents, desc: 'Total students in cycle', color: 'text-gray-700', bg: 'bg-gray-50/50' }
                        ].map((k, i) => (
                            <div key={i} className={`${k.bg} rounded-2xl p-6 border border-gray-100 shadow-sm transition-all`}>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{k.label}</p>
                                <p className={`text-3xl font-bold ${k.color} tracking-tight mb-2`}>{k.value}</p>
                                <p className="text-xs text-gray-500 font-medium">{k.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── SECTION 2: CRITICAL INELIGIBILITY AUDIT ────────────────── */}
                <section id="audit" className="space-y-8">
                    <div className="flex items-center gap-6">
                        <h2 className="text-xs font-bold text-rose-500  tracking-widest whitespace-nowrap"> Ineligible Students</h2>
                        <div className="h-px bg-rose-100 flex-1" />
                    </div>
                    
                    <div className="bg-rose-50/30 rounded-3xl p-8 border border-rose-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { label: 'Low CGPA (< 2.0)', count: selected.statistics.ineligibilityBreakdown?.lowCGPA || 0, icon: 'fa-graduation-cap' },
                                { label: 'Late Registration', count: selected.statistics.ineligibilityBreakdown?.lateRegistration || 0, icon: 'fa-clock' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-lg text-rose-500 shadow-sm border border-rose-100">
                                        <i className={`fas ${item.icon}`} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 leading-none">{item.count}</p>
                                        <p className="text-[10px] font-bold text-gray-400  tracking-wider mt-1">{item.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 3: PERFORMANCE LEADERSHIP (ELITE/AT-RISK) ───────── */}
                <section id="rankings" className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl border border-emerald-100">
                                <i className="fas fa-trophy" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Top Performing Students</h3>
                                <p className="text-xs text-gray-400 font-medium">Highest academic marks this cycle</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {topPerformers.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all shadow-none">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-gray-300">#{idx + 1}</span>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{s.name}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">{s.reg}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-base font-bold text-emerald-600">{s.percentage}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-xl border border-rose-100">
                                <i className="fas fa-exclamation-triangle" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Performance Review Required</h3>
                                <p className="text-xs text-gray-400 font-medium">All students with Grade D or F</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {bottomPerformers.length > 0 ? (
                                bottomPerformers.map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all shadow-none">
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-300">#{idx + 1}</span>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{s.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{s.reg}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base font-bold text-rose-600">{s.percentage}%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center bg-white border border-dashed border-gray-100 rounded-xl">
                                    <p className="text-xs text-gray-400 font-medium">No students in this category.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 4: PROGRAMME TIMELINE ──────────────────────────── */}
                <section id="timeline" className="space-y-10 py-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-xs font-bold text-primary  tracking-widest mb-1"> Programme Phases</h2>
                            <h3 className="text-xl font-bold text-gray-900">Cycle Timeline Detail</h3>
                        </div>
                        <div className="bg-primary/5 border border-primary/10 px-5 py-3 rounded-xl flex items-center gap-4">
                            <i className="fas fa-clock text-primary" />
                            <div>
                                <p className="text-[9px] font-bold text-primary uppercase leading-none mb-1">Cycle Initialized On</p>
                                <p className="text-sm font-bold text-gray-900 leading-none">
                                    {formatDateTime(snapshotPhases.find(p => p.order === 1)?.startedAt || selected.createdAt)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative pt-10">
                        <div className="absolute left-[50%] top-0 bottom-0 w-1 bg-gray-50 rounded-full hidden md:block" />
                        <div className="space-y-12">
                            {snapshotPhases.length > 0 ? (
                                snapshotPhases.map((p, i) => (
                                    <div key={i} className={`flex flex-col md:flex-row items-center gap-8 relative ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                        <div className="absolute left-[50%] -translate-x-1/2 w-4 h-4 bg-white border-4 border-primary rounded-full z-10 hidden md:block" />
                                        <div className="w-full md:w-[45%]">
                                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:border-primary/20 transition-all group">
                                                <div className="flex items-center gap-5 mb-5">
                                                    <span className="text-3xl font-bold text-gray-100 group-hover:text-primary transition-colors">0{p.order}</span>
                                                    <h4 className="text-lg font-bold text-gray-800 leading-none uppercase tracking-tight">{p.label}</h4>
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-8">{p.description}</p>
                                                <div className="flex flex-col gap-4 pt-6 border-t border-gray-50">
                                                    <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-lg border border-gray-50">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Started At</span>
                                                        <span className="text-xs font-bold text-gray-800">{formatDateTime(p.startedAt)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-lg border border-gray-50">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Completed At</span>
                                                        <span className={`text-xs font-bold ${p.completedAt ? 'text-emerald-600' : 'text-primary animate-pulse'}`}>
                                                            {p.completedAt ? formatDateTime(p.completedAt) : 'Currently Active'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hidden md:block w-[10%]" />
                                        <div className="w-full md:w-[45%] h-px md:h-0" />
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center bg-white border border-dashed border-gray-100 rounded-3xl">
                                    <p className="text-sm font-bold text-gray-400">Phase details not found in this archive.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 5: STUDENT PERFORMANCE REGISTER ────────────────── */}
                <section id="students" className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Registered Students </h2>
                            <h3 className="text-xl font-bold text-gray-900">Individual Performance Records</h3>
                        </div>
                        <div className="relative">
                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-xl w-full md:w-80 text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <DataTable columns={['Student Name', 'Registration No.', 'Company', 'Status', 'Grade', 'Actions']}>
                            {pStudents.map((s, idx) => (
                                <TableRow key={idx} className="hover:bg-gray-50/50">
                                    <TableCell><span className="text-sm font-bold text-gray-800">{s.name}</span></TableCell>
                                    <TableCell><span className="font-mono text-xs font-semibold text-primary">{s.reg}</span></TableCell>
                                    <TableCell><span className="text-xs text-gray-500 font-medium">{s.company}</span></TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${s.finalStatus === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {s.finalStatus}
                                        </span>
                                    </TableCell>
                                    <TableCell><span className="text-sm font-bold text-gray-800">{s.grade} <span className="text-[10px] text-gray-400 font-normal">({s.percentage}%)</span></span></TableCell>
                                    <TableCell>
                                        <button onClick={() => setSelectedStudent(s)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary transition-all">
                                            View Report
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </DataTable>
                        <Pagination page={sPage} totalPages={sTotal} setPage={setSPage} />
                    </div>
                </section>

                {/* ── SECTION 6: ENTERPRISE MATRIX ───────────────────────────── */}
                <section id="companies" className="space-y-8 pt-8">
                    <div className="flex items-center gap-6">
                        <h2 className="text-xs font-bold text-amber-500  tracking-widest whitespace-nowrap">Company Records</h2>
                        <div className="h-px bg-amber-100 flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {entities?.companies?.filter(c => c.status !== 'Inactive').map((c, idx) => {
                            const interns = selected.students.filter(s => s.company === c.name);
                            return (
                                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-amber-200 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center text-lg border border-amber-100">
                                            <i className="fas fa-building" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 truncate">{c.name}</h4>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 tracking-widest">Active Interns</span>
                                        <span className="text-base font-bold text-gray-900">{interns.length}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ── SECTION 7: SUPERVISION CORE ────────────────────────────── */}
                <section id="supervisors" className="space-y-10 pt-10">
                    <div className="flex items-center gap-6">
                        <h2 className="text-xs font-bold text-primary  tracking-widest whitespace-nowrap"> Supervision Overview</h2>
                        <div className="h-px bg-gray-100 flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Faculty Sub-section */}
                        <div className="space-y-8">
                            <h3 className="text-sm font-bold text-gray-400 flex items-center gap-4">
                                <i className="fas fa-user-graduate text-primary" /> Faculty Supervisors
                            </h3>
                            <div className="space-y-4">
                                {entities?.faculty?.filter(f => f.status !== 'Inactive').map((f, idx) => {
                                    const assigned = selected.students.filter(s => s.faculty.name === f.name);
                                    if (assigned.length === 0) return null; // Only show if they have assignments
                                    return (
                                        <SupervisorCard 
                                            key={idx}
                                            name={f.name}
                                            role="Faculty Advisor"
                                            icon="fa-user-tie"
                                            colorClass="text-primary"
                                            badgeText={`${assigned.length} Student${assigned.length !== 1 ? 's' : ''}`}
                                            badgeColor="text-primary"
                                            interns={assigned}
                                        />
                                    );
                                }).filter(Boolean)}
                            </div>
                        </div>

                        {/* Site Supervisors Sub-section */}
                        <div className="space-y-8">
                            <h3 className="text-sm font-bold text-gray-400 flex items-center gap-4">
                                <i className="fas fa-id-card-clip text-emerald-500" /> Industrial Supervisors
                            </h3>
                            <div className="space-y-4">
                                {entities?.siteSupervisors?.filter(ss => ss.status !== 'Inactive').map((ss, idx) => {
                                    const siteInterns = selected.students.filter(s => s.siteSupervisor?.email === ss.email);
                                    if (siteInterns.length === 0) return null; // Only show if they have assignments
                                    return (
                                        <SupervisorCard 
                                            key={idx}
                                            name={ss.name}
                                            role={ss.company}
                                            icon="fa-briefcase"
                                            colorClass="text-emerald-500"
                                            badgeText={`${ss.tasksGraded} Tasks`}
                                            badgeColor="text-emerald-600"
                                            subText={`${siteInterns.length} Interns`}
                                            interns={siteInterns}
                                        />
                                    );
                                }).filter(Boolean)}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">HOD Oversight Dashboard</h2>
                    <p className="text-sm text-gray-500 mt-1">Final approval and quality assurance of internship evaluations (CS Dept).</p>
                </div>
                
                <div className="flex items-center gap-4 bg-gray-50/50 p-2 pr-6 rounded-2xl border border-gray-100">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-gray-100">
                        <i className="fas fa-database text-lg" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Institutional Memory</p>
                        <p className="text-sm font-bold text-gray-900 leading-none">{archives.filter(a => !a.isLive).length} Archived Cycles</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {archives.length > 0 ? (
                    archives.map(arc => (
                        <div 
                            key={arc._id} 
                            onClick={() => { setSelected(arc); setActiveTab('overview'); }} 
                            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${arc.isLive ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400'}`}>
                                    <i className={`fas ${arc.isLive ? 'fa-signal' : 'fa-archive'}`} />
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${arc.isLive ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-500'}`}>
                                    {arc.isLive ? 'Active Cycle' : 'Archived'}
                                </span>
                            </div>

                            <h4 className="text-lg font-bold text-gray-900 mb-1">{arc.cycleName}</h4>
                            <p className="text-xs text-gray-400 mb-6">{arc.year ? `Academic Year ${arc.year}` : 'Current Programme'}</p>

                            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Students</p>
                                    <p className="text-base font-bold text-gray-900">{arc.statistics.totalStudents}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Success Rate</p>
                                    <p className="text-base font-bold text-emerald-600">
                                        {Math.round((arc.statistics.totalPassed / (arc.statistics.totalParticipated || 1)) * 100)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-40 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 text-center flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-gray-200 text-3xl mb-6 border border-gray-100">
                            <i className="fas fa-folder-open" />
                        </div>
                        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No archived cycles found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
