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

export default function HODArchive() {
    const [archives, setArchives] = useState([]);
    const [selected, setSelected] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');

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
        return selected.students.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.reg.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [selected, searchTerm]);

    const topPerformers = useMemo(() => {
        return [...(selected?.students || [])].sort((a, b) => b.percentage - a.percentage).slice(0, 10);
    }, [selected]);

    const bottomPerformers = useMemo(() => {
        return [...(selected?.students || [])].sort((a, b) => a.percentage - b.percentage).slice(0, 5);
    }, [selected]);

    const { paginated: pStudents, page: sPage, setPage: setSPage, totalPages: sTotal } = usePagination(studentList, 15);

    if (loading) return <div className="py-32 text-center"><i className="fas fa-circle-notch fa-spin text-primary text-4xl"></i><p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hydrating institutional data...</p></div>;

    // ── Individual Student Dossier View ─────────────────────────────────────
    if (selectedStudent) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center text-2xl shadow-inner border border-indigo-100">
                            <i className="fas fa-graduation-cap" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight italic uppercase">{selectedStudent.name}</h2>
                            <p className="text-xs text-gray-400 font-bold mt-1">
                                Reg: <span className="font-mono text-indigo-500">{selectedStudent.reg}</span> · {selectedStudent.company}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95">
                        <i className="fas fa-arrow-left mr-3" /> Back to cycle overview
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="rounded-[3rem] p-8 border-0 shadow-2xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-3">
                                <i className="fas fa-tasks text-indigo-500" /> Academic evaluation record
                            </h3>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black border border-indigo-100">Audit Grade: {selectedStudent.grade}</span>
                        </div>
                        {selectedStudent.marks?.length > 0 ? (
                            <div className="space-y-5">
                                {selectedStudent.marks.map((m, i) => (
                                    <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border border-gray-100 group hover:border-indigo-200 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="text-sm font-black text-gray-700 italic">{m.title}</h4>
                                            <span className="text-xs font-black text-indigo-600 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">{m.marks} / {m.totalMarks}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Faculty Score</p>
                                                <p className="text-lg font-black text-slate-800">{m.facultyMarks || 0}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Site Score</p>
                                                <p className="text-lg font-black text-slate-800">{m.siteSupervisorMarks || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="py-20 text-center"><i className="fas fa-ghost text-gray-100 text-4xl mb-3" /><p className="text-gray-400 text-[10px] font-bold uppercase">No evaluation records generated.</p></div>}
                    </Card>

                    <Card className="rounded-[3rem] p-8 border-0 shadow-2xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-3">
                                <i className="fas fa-clipboard-check text-emerald-500" /> Formal Industrial evaluations
                            </h3>
                        </div>
                        {selectedStudent.evaluations?.length > 0 ? (
                            <div className="space-y-5">
                                {selectedStudent.evaluations.map((e, i) => (
                                    <div key={i} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm border-l-8 border-l-emerald-500 group">
                                        <div className="flex justify-between items-center mb-5">
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-tighter">{e.title}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(e.submittedAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium italic">"{e.feedback}"</p>
                                        <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{e.evaluatorRole}</p>
                                                <p className="text-xs font-bold text-gray-700">{e.evaluatorName}</p>
                                            </div>
                                            <span className="text-2xl font-black text-emerald-600">{e.score}/10</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="py-20 text-center"><i className="fas fa-clipboard-question text-gray-100 text-4xl mb-3" /><p className="text-gray-400 text-[10px] font-bold uppercase">No evaluations documented.</p></div>}
                    </Card>
                </div>
            </div>
        );
    }

    // ── Cycle Overview / Tabbed Registers ───────────────────────────────────
    if (selected) {
        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                {/* Header Context */}
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-slate-200/30 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-2">
                             <h2 className="text-3xl font-black text-gray-800 tracking-tighter italic uppercase">{selected.cycleName}</h2>
                             {selected.isLive && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-[9px] font-black text-rose-500 italic uppercase tracking-widest animate-pulse shadow-sm shadow-rose-100">
                                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Live Academic Stream
                                </span>
                             )}
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            <i className="fas fa-fingerprint text-slate-300" /> Cycle ID: {selected._id} · Archived {new Date(selected.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <button onClick={() => { setSelected(null); setActiveTab('overview'); }} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                            <i className="fas fa-times-circle mr-2" /> Exit Archive
                        </button>
                    </div>
                </div>

                {/* Tabbed Navigation */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/20 overflow-hidden min-h-[600px] flex flex-col">
                    <div className="bg-slate-50/50 border-b border-gray-100 flex items-center px-4 overflow-x-auto no-scrollbar">
                        <Tab active={activeTab === 'overview'} label="Performance Forensics" icon="fa-magnifying-glass-chart" onClick={() => setActiveTab('overview')} />
                        <Tab active={activeTab === 'timeline'} label="Programme Timeline" icon="fa-clock-rotate-left" onClick={() => setActiveTab('timeline')} />
                        <Tab active={activeTab === 'students'} label="Student Register" icon="fa-user-graduate" onClick={() => setActiveTab('students')} count={selected.students.length} />
                        {entities && (
                            <>
                                <Tab active={activeTab === 'faculty'} label="Faculty Matrix" icon="fa-chalkboard-user" onClick={() => setActiveTab('faculty')} count={entities.faculty?.length} />
                                <Tab active={activeTab === 'supervisors'} label="Supervisor Indices" icon="fa-user-tie" onClick={() => setActiveTab('supervisors')} count={entities.siteSupervisors?.length} />
                                <Tab active={activeTab === 'companies'} label="Company Ledger" icon="fa-building" onClick={() => setActiveTab('companies')} count={entities.companies?.length} />
                            </>
                        )}
                    </div>

                    <div className="p-8 flex-1">
                        {/* ── OVERVIEW TAB ──────────────────────────────────── */}
                        {activeTab === 'overview' && (
                            <div className="space-y-12 animate-in fade-in zoom-in duration-300">
                                {/* Section 1: KPI Statistics */}
                                <section>
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                        <div className="h-px bg-gray-200 flex-1" /> CORE INSTITUTIONAL STATS <div className="h-px bg-gray-200 flex-1" />
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Total Cohort', val: selected.statistics.totalStudents, col: 'text-slate-800', bg: 'bg-white', icon: 'fa-users' },
                                            { label: 'Pass Ratio', val: `${Math.round((selected.statistics.totalPassed / (selected.statistics.totalParticipated || 1)) * 100)}%`, col: 'text-emerald-600', bg: 'bg-emerald-50/20', icon: 'fa-check-double' },
                                            { label: 'Underliers', val: selected.statistics.totalFailed, col: 'text-rose-600', bg: 'bg-rose-50/20', icon: 'fa-triangle-exclamation' },
                                            { label: 'Academic Avg.', val: `${selected.statistics.averagePercentage.toFixed(1)}%`, col: 'text-indigo-600', bg: 'bg-indigo-50/20', icon: 'fa-chart-line' },
                                        ].map((k, i) => (
                                            <div key={i} className={`${k.bg} p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:scale-105`}>
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${k.col} bg-white shadow-lg mb-4 border border-gray-50`}>
                                                    <i className={`fas ${k.icon}`} />
                                                </div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{k.label}</p>
                                                <p className={`text-4xl font-black ${k.col}`}>{k.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Section 2: Ineligibility Forensics */}
                                <section>
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                        <div className="h-px bg-gray-200 flex-1" /> CRITICAL INELIGIBILITY AUDIT <div className="h-px bg-gray-200 flex-1" />
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { label: 'Low CGPA (< 2.0)', count: selected.statistics.ineligibilityBreakdown?.lowCGPA || 0, icon: 'fa-graduation-cap', col: 'text-rose-500', bg: 'bg-rose-50/30' },
                                            { label: 'Late Registration', count: selected.statistics.ineligibilityBreakdown?.lateRegistration || 0, icon: 'fa-clock', col: 'text-amber-500', bg: 'bg-amber-50/30' },
                                            { label: 'Other / Withdrawn', count: selected.statistics.ineligibilityBreakdown?.other || 0, icon: 'fa-circle-xmark', col: 'text-slate-500', bg: 'bg-slate-50/30' },
                                        ].map((item, i) => (
                                            <div key={i} className={`${item.bg} p-8 rounded-[2.5rem] border border-gray-100 flex items-center justify-between`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl ${item.col} bg-white flex items-center justify-center text-xl shadow-sm border border-gray-100`}>
                                                        <i className={`fas ${item.icon}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-black text-slate-800">{item.count}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.label}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${item.col} bg-white border border-gray-100 shadow-sm`}>
                                                    Audit Verified
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Section 3: Performance Leadership */}
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic flex items-center gap-3">
                                            <i className="fas fa-crown" /> INSTITUTIONAL ELITE (TOP 10)
                                        </h3>
                                        <div className="space-y-3">
                                            {topPerformers.map((s, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-5 bg-emerald-50/10 border border-emerald-100/30 rounded-2xl group hover:bg-emerald-50 transition-all">
                                                    <div className="flex items-center gap-5">
                                                        <span className="text-xl font-black text-emerald-200 italic group-hover:text-emerald-500 transition-colors">#{idx + 1}</span>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-800 uppercase italic tracking-tighter">{s.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 font-mono tracking-widest">{s.reg}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-emerald-600">{s.percentage}%</p>
                                                        <p className="text-[9px] font-black text-emerald-400 uppercase italic">Grade {s.grade}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest italic flex items-center gap-3">
                                            <i className="fas fa-triangle-exclamation" /> AT-RISK COHORT (BOTTOM 5)
                                        </h3>
                                        <div className="space-y-3">
                                            {bottomPerformers.map((s, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-5 bg-rose-50/10 border border-rose-100/30 rounded-2xl group hover:bg-rose-50 transition-all">
                                                    <div className="flex items-center gap-5">
                                                        <span className="text-xl font-black text-rose-200 italic group-hover:text-rose-500 transition-colors">#{idx + 1}</span>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-800 uppercase italic tracking-tighter">{s.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 font-mono tracking-widest">{s.reg}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-rose-600">{s.percentage}%</p>
                                                        <p className="text-[9px] font-black text-rose-400 uppercase italic">Status: {s.finalStatus}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ── TIMELINE TAB ──────────────────────────────────── */}
                        {activeTab === 'timeline' && (
                            <div className="animate-in slide-in-from-right-4 duration-300 space-y-12">
                                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
                                    <i className="fas fa-history" /> COHORT PROGRESSION TIMELINE
                                </h3>
                                <div className="space-y-10 relative pl-12 before:content-[''] before:absolute before:left-6 before:top-0 before:bottom-0 before:w-1 before:bg-indigo-50 before:rounded-full">
                                    {selected.phases?.map((p, i) => (
                                        <div key={i} className="relative">
                                            <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full border-4 border-white bg-indigo-500 shadow-sm z-10" />
                                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:border-indigo-200 group">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-16 h-16 bg-slate-50 text-indigo-500 rounded-3xl flex items-center justify-center text-2xl font-black border border-slate-100 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                            {p.order}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">{p.label || `Phase ${p.order}`}</h4>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{p.description || 'Institutional progression stage'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ACTIVATION DATE</p>
                                                            <p className="text-sm font-black text-indigo-600">{p.startedAt ? new Date(p.startedAt).toLocaleDateString() : 'DRAFT'}</p>
                                                        </div>
                                                        <div className="w-px h-10 bg-gray-100 mx-2" />
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ARCHIVAL LOCK</p>
                                                            <p className="text-sm font-black text-slate-800">{p.completedAt ? new Date(p.completedAt).toLocaleDateString() : 'IN PROGRESS'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── STUDENTS TAB ──────────────────────────────────── */}
                        {activeTab === 'students' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="relative group">
                                        <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <input 
                                            type="text"
                                            placeholder="Search performance register by name or reg..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-14 pr-8 py-4.5 bg-slate-50 border border-gray-100 rounded-[2rem] text-[11px] font-bold w-96 transition-all focus:bg-white focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none uppercase"
                                        />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Audit Ledger: {studentList.length} Entries</p>
                                </div>
                                <DataTable columns={['Student identity', 'Registration No.', 'Affiliated company', 'Institutional status', 'Audit Grade', 'Actions']}>
                                    {pStudents.map((s, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell><strong>{s.name}</strong></TableCell>
                                            <TableCell muted><span className="font-mono text-[11px] font-black tracking-tight">{s.reg}</span></TableCell>
                                            <TableCell><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter italic">{s.company}</span></TableCell>
                                            <TableCell>
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black border ${
                                                    s.finalStatus === 'Pass' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 
                                                    s.finalStatus === 'Fail' ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm' : 
                                                    'bg-slate-50 text-slate-500 border-slate-100 font-bold'
                                                }`}>
                                                    {s.finalStatus.toUpperCase()}
                                                </span>
                                            </TableCell>
                                            <TableCell><span className={`font-black text-base ${s.percentage >= 50 ? 'text-emerald-500 italic' : 'text-rose-500'}`}>{s.grade}</span></TableCell>
                                            <TableCell>
                                                <button onClick={() => setSelectedStudent(s)} className="p-4 text-indigo-600 hover:bg-slate-900 hover:text-white rounded-2xl transition-all border border-transparent shadow-sm cursor-pointer flex items-center gap-3 active:scale-95">
                                                    <i className="fas fa-fingerprint text-base" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Access Dossier</span>
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </DataTable>
                                <Pagination page={sPage} totalPages={sTotal} setPage={setSPage} />
                            </div>
                        )}

                        {/* ── FACULTY TAB ───────────────────────────────────── */}
                        {activeTab === 'faculty' && entities && (
                             <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10 text-center flex items-center gap-6">
                                    <div className="h-px bg-gray-100 flex-1" />
                                    FACULTY SUPERVISOR WORKLOAD MATRIX
                                    <div className="h-px bg-gray-100 flex-1" />
                                </h3>
                                <DataTable columns={['Faculty Member', 'Institutional Email', 'Supervision Load', 'Academic Output Avg']}>
                                    {entities.faculty.map((f, idx) => {
                                        const supervised = selected.students.filter(s => s.faculty.name === f.name);
                                        const avgPct = supervised.length > 0 
                                            ? Math.round(supervised.reduce((a, b) => a + b.percentage, 0) / supervised.length) 
                                            : 0;
                                        return (
                                            <TableRow key={idx}>
                                                <TableCell><strong>{f.name}</strong></TableCell>
                                                <TableCell muted><span className="font-mono text-[11px] text-indigo-400 font-bold">{f.email}</span></TableCell>
                                                <TableCell>
                                                    <div className="bg-indigo-50/50 px-4 py-1.5 rounded-xl border border-indigo-100/50 flex items-center gap-3 w-fit">
                                                        <i className="fas fa-users-viewfinder text-indigo-400" />
                                                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter">
                                                            {supervised.length} MAPPED STUDENTS
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px] shadow-inner border border-gray-50">
                                                            <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${avgPct}%` }} />
                                                        </div>
                                                        <span className="text-sm font-black text-indigo-600 italic">{avgPct}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </DataTable>
                             </div>
                        )}

                        {/* ── SUPERVISORS TAB ────────────────────────────────── */}
                        {activeTab === 'supervisors' && entities && (
                             <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10 text-center flex items-center gap-6">
                                    <div className="h-px bg-gray-100 flex-1" />
                                    INDUSTRIAL SUPERVISOR PERFORMANCE FORENSICS
                                    <div className="h-px bg-gray-100 flex-1" />
                                </h3>
                                <DataTable columns={['Site Supervisor', 'Corporate Partner', 'Internship Impact', 'Grading Velocity', 'Institutional Standings']}>
                                    {entities.siteSupervisors.map((ss, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell><strong>{ss.name}</strong></TableCell>
                                            <TableCell><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">{ss.company || 'N/A'}</span></TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                     <span className="text-sm font-black text-slate-800">{ss.internCount} Active Interns</span>
                                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Placement Capacity</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                     <span className="text-sm font-black text-emerald-600 italic">+{ss.tasksGraded} Tasks Validated</span>
                                                     <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Grading Velocity</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-4 py-2 rounded-2xl text-[9px] font-black border italic uppercase tracking-widest shadow-sm ${
                                                    ss.performanceStatus === 'Exemplary' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                    ss.performanceStatus === 'Standard' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {ss.performanceStatus} Partner
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </DataTable>
                             </div>
                        )}

                        {/* ── COMPANIES TAB ──────────────────────────────────── */}
                        {activeTab === 'companies' && entities && (
                             <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10 text-center flex items-center gap-6">
                                    <div className="h-px bg-gray-100 flex-1" />
                                    CORPORATE PARTNERSHIP IMPACT LEDGER
                                    <div className="h-px bg-gray-100 flex-1" />
                                </h3>
                                <DataTable columns={['Industry Partner', 'Contact Vector', 'Graduation Pipeline', 'Institutional Quality Score']}>
                                    {entities.companies.map((c, idx) => {
                                        const interns = selected.students.filter(s => s.company === c.name);
                                        const avgScore = interns.length > 0 ? Math.round(interns.reduce((a, b) => a + b.percentage, 0) / interns.length) : 0;
                                        return (
                                            <TableRow key={idx}>
                                                <TableCell><strong className="text-slate-800 text-base italic">{c.name}</strong></TableCell>
                                                <TableCell muted><span className="font-mono text-[11px] font-bold text-slate-400">{c.email || 'N/A'}</span></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                         <i className="fas fa-user-plus text-indigo-400" />
                                                         <span className="text-sm font-black text-slate-700 tracking-tighter">{interns.length} PLACEMENTS</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-5 py-2 rounded-2xl text-[9px] font-black border italic uppercase tracking-[0.2em] shadow-inner ${
                                                        avgScore >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                    }`}>
                                                        {avgScore >= 80 ? 'Blue-Chip Partner' : 'Certified Placement'}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </DataTable>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl shadow-slate-200/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full -mr-[250px] -mt-[250px] blur-[120px] opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex items-center gap-10">
                        <div className="w-24 h-24 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl shadow-slate-900/40 border-4 border-white">
                            <i className="fas fa-building-shield" />
                        </div>
                        <div>
                            <h2 className="text-5xl font-black text-gray-800 tracking-tighter italic flex items-center gap-6 uppercase">
                                Performance Archives
                            </h2>
                            <p className="text-xs text-gray-400 font-bold mt-4 uppercase tracking-[0.5em] flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                Institutional memory & Audit compliance control
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {archives.length > 0 ? (
                    archives.map(arc => (
                        <div 
                            key={arc._id} 
                            onClick={() => { setSelected(arc); setActiveTab('overview'); }} 
                            className={`bg-white p-10 rounded-[3.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden hover:scale-[1.02] active:scale-95
                                ${arc.isLive 
                                    ? 'border-rose-100 bg-white shadow-[0_40px_100px_rgba(244,63,94,0.1)]' 
                                    : 'border-slate-50 shadow-xl shadow-slate-100 hover:border-primary/30 hover:shadow-2xl'}`}
                        >
                            <div className="flex items-center justify-between mb-10">
                                <div className={`w-20 h-20 rounded-[2rem] transition-all flex items-center justify-center text-3xl shadow-2xl
                                    ${arc.isLive ? 'bg-rose-50 text-rose-500 animate-pulse border border-rose-100' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white border border-slate-100 shadow-inner'}`}>
                                    <i className={`fas ${arc.isLive ? 'fa-satellite-dish' : 'fa-box-archive'}`} />
                                </div>
                                <div className="text-right">
                                    {arc.isLive ? (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="px-4 py-1.5 bg-rose-50 border border-rose-100 rounded-2xl text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse shadow-sm shadow-rose-100">
                                                Live Academic Snap
                                            </span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-tighter">Real-time Stream</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[10px] font-black text-slate-300 group-hover:text-primary transition-colors flex items-center gap-3 uppercase tracking-[0.3em]">View Archive <i className="fas fa-arrow-right-long text-[8px]" /></span>
                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest italic bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">Fidelity Verified</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h4 className="text-2xl font-black text-gray-800 mb-2 tracking-tighter italic uppercase group-hover:text-primary transition-colors">{arc.cycleName}</h4>
                            <p className="text-[11px] text-gray-400 font-bold mb-10 tracking-[0.2em] uppercase italic">
                                {arc.isLive ? 'CURRENT PROGRAMME CYCLE' : `ACADEMIC SESSION · ${arc.year}`}
                            </p>

                            <div className="grid grid-cols-2 gap-8 pt-10 border-t-2 border-slate-50/50">
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Cohort Size</p>
                                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{arc.statistics.totalStudents}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Success Rate</p>
                                    <p className={`text-3xl font-black tracking-tighter ${arc.isLive ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {Math.round((arc.statistics.totalPassed / (arc.statistics.totalParticipated || 1)) * 100)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-60 bg-white rounded-[5rem] border-4 border-dashed border-slate-50 text-center flex flex-col items-center justify-center group hover:border-slate-100 transition-all">
                        <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center text-slate-200 text-5xl mb-10 shadow-inner group-hover:scale-110 transition-transform">
                            <i className="fas fa-folder-open" />
                        </div>
                        <p className="text-slate-300 font-black text-lg uppercase tracking-[0.6em] italic">Deep storage empty</p>
                    </div>
                )}
            </div>
        </div>
    );
}
