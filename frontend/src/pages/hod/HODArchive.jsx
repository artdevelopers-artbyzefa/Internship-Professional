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

    // ── Cycle Overview / Forensic Multi-Section Report ───────────────────────
    if (selected) {
        const totalTasks = entities?.siteSupervisors?.reduce((acc, ss) => acc + (ss.tasksGraded || 0), 0) || 0;

        return (
            <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                {/* ── HERO COMMAND CENTER ──────────────────────────────────── */}
                <div className="relative overflow-hidden bg-[#0A0C10] rounded-[4rem] border border-white/5 shadow-2xl">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 rounded-full -mr-[400px] -mt-[400px] blur-[150px] opacity-30" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full -ml-[300px] -mb-[300px] blur-[120px] opacity-20" />
                    
                    <div className="relative z-10 p-12 md:p-20">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <span className="px-5 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-primary uppercase tracking-[0.4em] backdrop-blur-md">
                                        Institutional Archive
                                    </span>
                                    {selected.isLive && (
                                        <span className="flex items-center gap-2 px-5 py-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] animate-pulse">
                                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Live Stream
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                                    {selected.cycleName}
                                </h1>
                                <div className="flex flex-wrap items-center gap-8 text-white/40">
                                    <div className="flex items-center gap-3">
                                        <i className="fas fa-fingerprint text-primary" />
                                        <span className="text-xs font-bold uppercase tracking-widest">{selected._id}</span>
                                    </div>
                                    <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                                    <div className="flex items-center gap-3">
                                        <i className="fas fa-calendar-alt" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Archived {new Date(selected.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setSelected(null)} 
                                className="group flex items-center gap-6 px-10 py-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2.5rem] transition-all active:scale-95 translate-y-[-10px]"
                            >
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Exit Report</p>
                                    <p className="text-xs font-bold text-white uppercase italic">Return to Grid</p>
                                </div>
                                <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                    <i className="fas fa-times" />
                                </div>
                            </button>
                        </div>

                        {/* Top-Level Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 pt-20 border-t border-white/5">
                            {[
                                { label: 'Registered Entities', value: (entities?.companies?.length + entities?.faculty?.length + entities?.siteSupervisors?.length) || 0, icon: 'fa-network-wired' },
                                { label: 'Task Throughput', value: totalTasks, icon: 'fa-boltn' },
                                { label: 'Cohort Magnitude', value: selected.students.length, icon: 'fa-user-group' },
                                { label: 'Audit Compliance', value: '100%', icon: 'fa-shield-check' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/5 rounded-3xl p-6 border border-white/10">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">{stat.label}</p>
                                    <div className="flex items-end gap-3 text-white">
                                        <span className="text-2xl font-black">{stat.value}</span>
                                        <i className={`fas ${stat.icon} text-primary/50 text-sm mb-1`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── SECTION 1: PERFORMANCE FORENSICS (STATS) ────────────────── */}
                <section id="stats" className="space-y-8">
                    <div className="flex items-center gap-8">
                        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.6em] whitespace-nowrap">01 // CORE INSTITUTIONAL STATS</h2>
                        <div className="h-px bg-slate-200 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { label: 'Success Ratio', value: `${Math.round((selected.statistics.totalPassed / (selected.statistics.totalParticipated || 1)) * 100)}%`, desc: 'Of total cohort certified', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                            { label: 'Academic Average', value: `${selected.statistics.averagePercentage.toFixed(1)}%`, desc: 'Core performance mean', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                            { label: 'Program Attrition', value: selected.statistics.totalFailed, desc: 'Students not meeting criteria', color: 'text-rose-500', bg: 'bg-rose-50' },
                            { label: 'Active Students', value: selected.statistics.totalStudents, desc: 'Total institutional load', color: 'text-slate-800', bg: 'bg-slate-50' }
                        ].map((k, i) => (
                            <div key={i} className={`${k.bg} rounded-[3.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-100/50 group hover:scale-[1.02] transition-all`}>
                                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm mb-8">
                                    <i className={`fas fa-chart-pie ${k.color}`} />
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{k.label}</p>
                                <p className={`text-5xl font-black ${k.color} tracking-tighter mb-4 italic`}>{k.value}</p>
                                <p className="text-xs font-bold text-gray-400 leading-relaxed">{k.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── SECTION 2: CRITICAL INELIGIBILITY AUDIT ────────────────── */}
                <section id="audit" className="space-y-8">
                    <div className="flex items-center gap-8">
                        <h2 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.6em] whitespace-nowrap">02 // CRITICAL INELIGIBILITY AUDIT</h2>
                        <div className="h-px bg-rose-100 flex-1" />
                    </div>
                    
                    <div className="bg-rose-50/30 rounded-[4rem] p-12 border border-rose-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                            {[
                                { label: 'Low CGPA (< 2.0)', count: selected.statistics.ineligibilityBreakdown?.lowCGPA || 0, icon: 'fa-graduation-cap' },
                                { label: 'Late Registration', count: selected.statistics.ineligibilityBreakdown?.lateRegistration || 0, icon: 'fa-clock-seven' },
                                { label: 'Policy Infractions', count: selected.statistics.ineligibilityBreakdown?.other || 0, icon: 'fa-user-slash' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-10">
                                    <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-3xl text-rose-500 shadow-2xl shadow-rose-500/10 border border-rose-50">
                                        <i className={`fas ${item.icon}`} />
                                    </div>
                                    <div>
                                        <p className="text-5xl font-black text-slate-800 tracking-tighter">{item.count}</p>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{item.label}</p>
                                        <div className="flex items-center gap-2 mt-4">
                                            <span className="w-2 h-2 bg-rose-500 rounded-full" />
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic">Audit Flagged</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 3: PERFORMANCE LEADERSHIP (ELITE/AT-RISK) ───────── */}
                <section id="rankings" className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12">
                    <div className="space-y-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center text-2xl shadow-inner border border-emerald-100/50 font-black">
                                <i className="fas fa-crown" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Institutional Elite</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Top performing cohort (Top 10)</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {topPerformers.map((s, idx) => (
                                <div key={idx} className="group flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-emerald-500 hover:bg-emerald-50/30 hover:scale-[1.02] transition-all shadow-sm">
                                    <div className="flex items-center gap-8">
                                        <span className="text-2xl font-black text-slate-200 group-hover:text-emerald-500/30 transition-colors">#{idx + 1}</span>
                                        <div>
                                            <p className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">{s.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest mt-1">{s.reg}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <span className="text-3xl font-black text-emerald-600">{s.percentage}%</span>
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[9px] font-black uppercase italic">Grade {s.grade}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-10 text-right md:text-left">
                        <div className="flex flex-row-reverse md:flex-row items-center gap-6">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center text-2xl shadow-inner border border-rose-100/50 font-black">
                                <i className="fas fa-triangle-exclamation" />
                            </div>
                            <div className="md:text-left text-right">
                                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">At-Risk Cohort</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Marginalized academic performance (Bottom 5)</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {bottomPerformers.map((s, idx) => (
                                <div key={idx} className="group flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-rose-500 hover:bg-rose-50/30 hover:scale-[1.02] transition-all shadow-sm">
                                    <div className="flex items-center gap-8">
                                        <span className="text-2xl font-black text-slate-200 group-hover:text-rose-500/30 transition-colors">#{idx + 1}</span>
                                        <div>
                                            <p className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">{s.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest mt-1">{s.reg}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <span className="text-3xl font-black text-rose-600">{s.percentage}%</span>
                                        <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase italic">Status: {s.finalStatus}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 4: PROGRAMME TIMELINE ──────────────────────────── */}
                <section id="timeline" className="space-y-12 py-20">
                    <div className="flex items-center gap-8">
                        <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.6em] whitespace-nowrap">03 // PROGRAMME TIMELINE</h2>
                        <div className="h-px bg-indigo-100 flex-1" />
                    </div>

                    <div className="relative pt-10">
                        <div className="absolute left-[50%] top-0 bottom-0 w-1 bg-slate-100 rounded-full hidden md:block" />
                        <div className="space-y-12">
                            {selected.phases?.map((p, i) => (
                                <div key={i} className={`flex flex-col md:flex-row items-center gap-8 relative ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                    <div className="absolute left-[50%] -translate-x-1/2 w-4 h-4 bg-white border-4 border-indigo-500 rounded-full z-10 hidden md:block" />
                                    <div className="w-full md:w-[45%]">
                                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/30 hover:border-indigo-200 transition-all group">
                                            <div className="flex items-center gap-6 mb-6">
                                                <span className="text-4xl font-black text-indigo-100 group-hover:text-indigo-500 transition-colors italic">0{p.order}</span>
                                                <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">{p.label}</h4>
                                            </div>
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">{p.description}</p>
                                            <div className="flex items-center justify-between pt-8 border-t border-slate-50 gap-4">
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Activation</p>
                                                    <p className="text-xs font-black text-indigo-600 italic">{p.startedAt ? new Date(p.startedAt).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Audit Close</p>
                                                    <p className="text-xs font-black text-slate-800 italic">{p.completedAt ? new Date(p.completedAt).toLocaleDateString() : 'Active'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:block w-[10%]" />
                                    <div className="w-full md:w-[45%] h-px md:h-0" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 5: STUDENT PERFORMANCE REGISTER ────────────────── */}
                <section id="students" className="space-y-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.6em] mb-4">04 // STUDENT REGISTER & DOSSIERS</h2>
                            <h3 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter">Individual Performance Records</h3>
                        </div>
                        <div className="relative">
                            <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search by name or reg..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-16 pr-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl w-full md:w-96 text-xs font-bold uppercase tracking-widest transition-all focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/20 overflow-hidden">
                        <DataTable columns={['Student identity', 'Registration No.', 'Affiliated Body', 'Lifecycle Status', 'Academic Grade', 'Forensics']}>
                            {pStudents.map((s, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell><span className="text-sm font-black text-slate-800 uppercase italic">{s.name}</span></TableCell>
                                    <TableCell><span className="font-mono text-[11px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50">{s.reg}</span></TableCell>
                                    <TableCell><span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{s.company}</span></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${s.finalStatus === 'Pass' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${s.finalStatus === 'Pass' ? 'text-emerald-600' : 'text-rose-600'}`}>{s.finalStatus}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><span className="text-xl font-black italic text-slate-800">{s.grade} <span className="text-[10px] font-bold text-slate-400 not-italic ml-1">({s.percentage}%)</span></span></TableCell>
                                    <TableCell>
                                        <button onClick={() => setSelectedStudent(s)} className="group px-6 py-3 bg-slate-900 text-white rounded-2xl flex items-center gap-3 hover:bg-primary transition-all active:scale-95">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Dossier</span>
                                            <i className="fas fa-fingerprint text-white/50 group-hover:text-white" />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </DataTable>
                        <Pagination page={sPage} totalPages={sTotal} setPage={setSPage} />
                    </div>
                </section>

                {/* ── SECTION 6: ENTERPRISE MATRIX ───────────────────────────── */}
                <section id="companies" className="space-y-10 pt-10">
                    <div className="flex items-center gap-8">
                        <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.6em] whitespace-nowrap">05 // ENTERPRISE LEDGER</h2>
                        <div className="h-px bg-amber-100 flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {entities?.companies?.map((c, idx) => {
                            const interns = selected.students.filter(s => s.company === c.name);
                            const avgCompScore = interns.length > 0 ? Math.round(interns.reduce((a, b) => a + b.percentage, 0) / interns.length) : 0;
                            return (
                                <div key={idx} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-100/30 hover:border-amber-500/30 transition-all group">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center text-2xl border border-amber-100/50">
                                            <i className="fas fa-building" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase italic">Quality Index</p>
                                            <p className="text-2xl font-black text-slate-800">{avgCompScore}%</p>
                                        </div>
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">{c.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest mb-8">{c.email || 'NO_CONTACT_VECTOR'}</p>
                                    <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-user-check text-slate-300" />
                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{interns.length} Placements</span>
                                        </div>
                                        <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic">Corporate Partner</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ── SECTION 7: SUPERVISION CORE ────────────────────────────── */}
                <section id="supervisors" className="space-y-12 pt-10">
                    <div className="flex items-center gap-8">
                        <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.6em] whitespace-nowrap">06 // SUPERVISION & VALIDATION MATRIX</h2>
                        <div className="h-px bg-indigo-100 flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Faculty Sub-section */}
                        <div className="space-y-8">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                                <i className="fas fa-user-graduate text-indigo-500" /> Faculty Supervisors
                            </h3>
                            <div className="space-y-4">
                                {entities?.faculty?.map((f, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-500 border border-slate-100">
                                                <i className="fas fa-id-badge" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-slate-800 uppercase italic tracking-tighter leading-none">{f.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Faculty Advisor</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-indigo-600">{selected.students.filter(s => s.faculty.name === f.name).length} Students</p>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Direct Oversight</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Site Supervisors Sub-section */}
                        <div className="space-y-8">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                                <i className="fas fa-id-card-clip text-emerald-500" /> Industrial Supervisors
                            </h3>
                            <div className="space-y-4">
                                {entities?.siteSupervisors?.map((ss, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-slate-100">
                                                <i className="fas fa-briefcase" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-slate-800 uppercase italic tracking-tighter leading-none">{ss.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{ss.company}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-emerald-600">+{ss.tasksGraded} Tasks</p>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Validation Magnitude</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
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
