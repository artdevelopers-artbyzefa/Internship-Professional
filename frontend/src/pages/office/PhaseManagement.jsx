import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import { showToast, showAlert } from '../../utils/notifications.jsx';

// ────────────────────────────────────────────────────────────────────────────
// Status config
// ────────────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
    pending: { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-300' },
    active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    completed: { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
};

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toInputValue(d) {
    if (!d) return '';
    const dt = new Date(d);
    const pktMs = dt.getTime() + (5 * 60 * 60 * 1000);
    return new Date(pktMs).toISOString().slice(0, 16);
}
function useCountdown(targetDate) {
    const calc = useCallback(() => {
        if (!targetDate) return null;
        const diff = new Date(targetDate) - new Date();
        if (diff <= 0) return { expired: true, days: 0, hours: 0, mins: 0, secs: 0 };
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        return { expired: false, days, hours, mins, secs };
    }, [targetDate]);

    const [remaining, setRemaining] = useState(calc);
    useEffect(() => {
        const t = setInterval(() => setRemaining(calc()), 1000);
        return () => clearInterval(t);
    }, [calc]);
    return remaining;
}

// ── Countdown display ──────────────────────────────────────────────────────
function Countdown({ targetDate, label, colour = 'indigo' }) {
    const r = useCountdown(targetDate);
    if (!r) return null;

    const cols = {
        indigo: { card: 'bg-indigo-50 border-indigo-100 text-indigo-700', num: 'bg-white border-indigo-100 text-indigo-800', lbl: 'text-indigo-400' },
        amber: { card: 'bg-amber-50  border-amber-100  text-amber-700', num: 'bg-white border-amber-100  text-amber-800', lbl: 'text-amber-400' },
        rose: { card: 'bg-rose-50   border-rose-100   text-rose-600', num: 'bg-white border-rose-100   text-rose-700', lbl: 'text-rose-300' },
    };
    const c = cols[colour] || cols.indigo;

    if (r.expired) return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${c.card}`}>
            <i className="fas fa-check-circle text-sm" /> {label} — <span className="italic font-normal">time reached</span>
        </div>
    );

    return (
        <div className={`p-3 rounded-xl border ${c.card}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${c.lbl}`}>{label}</p>
            <div className="flex items-center gap-1.5">
                {[{ v: r.days, u: 'd' }, { v: r.hours, u: 'h' }, { v: r.mins, u: 'm' }, { v: r.secs, u: 's' }].map(({ v, u }) => (
                    <div key={u} className="flex flex-col items-center">
                        <span className={`w-10 h-9 rounded-lg border flex items-center justify-center font-black text-sm tabular-nums ${c.num}`}>{String(v).padStart(2, '0')}</span>
                        <span className={`text-[9px] font-bold mt-0.5 ${c.lbl}`}>{u}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────
export default function PhaseManagement({ user }) {
    const [phases, setPhases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [editNotes, setEditNotes] = useState({});
    const [schedEdit, setSchedEdit] = useState({});   // { [phaseId]: { scheduledStartAt, scheduledEndAt, durationDays } }
    const [expanded, setExpanded] = useState(null);

    useEffect(() => { fetchPhases(); }, []);

    const fetchPhases = async () => {
        try {
            const data = await apiRequest('/phases');
            setPhases(data);
            const notes = {}, sched = {};
            data.forEach(p => {
                notes[p._id] = p.notes || '';
                sched[p._id] = {
                    scheduledStartAt: toInputValue(p.scheduledStartAt),
                    scheduledEndAt: toInputValue(p.scheduledEndAt),
                    durationDays: p.durationDays || ''
                };
            });
            setEditNotes(notes);
            setSchedEdit(sched);
        } catch (err) {
            // Error handled by apiRequest
        }
        finally { setLoading(false); }
    };

    const handleAction = async (phaseId, action) => {
        const phase = phases.find(p => p._id === phaseId);
        let scheduledEndAt = null;

        if (action === 'start') {
            if (phase.order === 5) {
                // Phase 5 (Archive & Close) starts immediately — no deadline needed
                const confirmed = await showAlert.confirm(
                    'Activate Phase 5 — Archive & Close',
                    `⚠️ This is the final phase. It will immediately archive all student data, generate the permanent record, and reset the internship cycle.\n\nThis action cannot be undone. Proceed?`,
                    'Yes, Archive & Close'
                );
                if (!confirmed) return;
                // No scheduledEndAt — runs immediately
            } else {
                const date = await showAlert.datePrompt(
                    `Activate ${phase.label}`,
                    `Set an expected deadline for this phase (optional). Leave blank if not sure, but it's recommended for student timers.`
                );
                // If they cancelled the prompt, don't proceed
                if (date === undefined) return;
                scheduledEndAt = date ? `${date}:00+05:00` : null;
            }
        } else {
            const confirmed = await showAlert.confirm(
                'Complete Phase',
                `Mark "${phase.label}" as completed?`,
                'Yes, Complete'
            );
            if (!confirmed) return;
        }

        setActionId(phaseId + action);
        try {
            const res = await apiRequest(`/phases/${phaseId}/${action}`, { 
                method: 'POST', 
                body: { 
                    officeId: user.id || user._id,
                    scheduledEndAt
                } 
            });
            showToast.success(res.message);
            fetchPhases();
        } catch { } finally { setActionId(null); }
    };

    const handleSaveNotes = async (phaseId) => {
        try {
            await apiRequest(`/phases/${phaseId}/notes`, { method: 'PATCH', body: { notes: editNotes[phaseId] } });
            showToast.success('Notes saved successfully.');
        } catch { }
    };

    const handleSaveSchedule = async (phaseId) => {
        const s = schedEdit[phaseId] || {};
        setActionId(phaseId + 'sched');
        try {
            await apiRequest(`/phases/${phaseId}/schedule`, {
                method: 'PATCH',
                body: {
                    // Append +05:00 so the backend explicitly parses it as Pakistan Standard Time
                    scheduledStartAt: s.scheduledStartAt ? `${s.scheduledStartAt}:00+05:00` : null,
                    scheduledEndAt: s.scheduledEndAt ? `${s.scheduledEndAt}:00+05:00` : null,
                    durationDays: s.durationDays || null,
                    officeId: user.id || user._id
                }
            });
            showToast.success('Phase schedule updated.');
            fetchPhases();
        } catch { } finally { setActionId(null); }
    };

    const activePhase = phases.find(p => p.status === 'active');
    const progressCount = phases.filter(p => p.status !== 'pending').length;
    const progress = phases.length ? Math.round((progressCount / phases.length) * 100) : 0;
    const nextUpPhase = phases.find((p, i) =>
        p.status === 'pending' && (i === 0 || phases[i - 1]?.status !== 'pending')
    );
    const isActLoading = (tag) => actionId === tag;

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">

            {/* ── Header & Overall Progress ──────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Programme Phase Control</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            Manage and progress through the {phases.length} official phases of the internship programme.
                            Phases can be activated manually or scheduled to start automatically.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Overall Progress</p>
                            <p className="text-3xl font-black text-primary">{progress}%</p>
                        </div>
                        <div className="relative w-20 h-20 flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="#1e40af" strokeWidth="3"
                                    strokeDasharray={`${progress}, 100`}
                                    className="transition-all duration-700" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-primary">{progressCount}/{phases.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Phase Banner */}
                {activePhase && (
                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <i className={`fas ${activePhase.icon} text-lg`} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-emerald-600 tracking-widest uppercase">Currently Active</p>
                            <p className="font-black text-emerald-900">{activePhase.label}</p>
                            {activePhase.startedAt && (
                                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                    Started {fmtDate(activePhase.startedAt)}
                                    {activePhase.startedBy?.name && ` · by ${activePhase.startedBy.name}`}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {activePhase.scheduledEndAt && (
                                <Countdown targetDate={activePhase.scheduledEndAt} label="Ends in" colour="amber" />
                            )}
                            <span className="flex items-center gap-2 self-center">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                                </span>
                                <span className="text-xs text-emerald-700 font-bold">Live</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Next Phase Prompt ──────────────────────────────────────── */}
            {nextUpPhase && (
                <div className="bg-white rounded-2xl border-2 border-secondary shadow-lg shadow-secondary/5 p-5 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-secondary/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center text-2xl shadow-inner border border-secondary/20 flex-shrink-0">
                                <i className={`fas ${nextUpPhase.icon}`} />
                            </div>
                            <div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-secondary uppercase tracking-widest mb-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                                    Next Phase to Activate
                                    <span className="ml-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">Phase {nextUpPhase.order}</span>
                                </span>
                                <h2 className="text-xl font-black text-gray-800">{nextUpPhase.label}</h2>
                                <p className="text-sm text-gray-500 mt-1">{nextUpPhase.description}</p>
                                {nextUpPhase.scheduledStartAt && (
                                    <div className="mt-3">
                                        <Countdown targetDate={nextUpPhase.scheduledStartAt} label="Scheduled to start in" colour="indigo" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full md:w-auto px-8 py-5 text-sm font-black h-auto shadow-lg shadow-secondary/20 flex-shrink-0"
                            loading={isActLoading(nextUpPhase._id + 'start')}
                            onClick={() => handleAction(nextUpPhase._id, 'start')}
                        >
                            <i className="fas fa-play mr-2" />
                            Activate Phase {nextUpPhase.order}
                        </Button>
                    </div>
                    {activePhase && (
                        <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                            <i className="fas fa-info-circle text-amber-500 text-sm" />
                            <p className="text-xs font-bold text-amber-700">
                                Activating this phase will automatically complete the current <span className="font-black">"{activePhase.label}"</span>.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Phase Timeline ─────────────────────────────────────────── */}
            <div className="space-y-3">
                {phases.map((phase, idx) => {
                    const cfg = STATUS_CFG[phase.status];
                    const isEx = expanded === phase._id;
                    const prevDone = idx === 0 || phases[idx - 1]?.status !== 'pending';
                    const canStart = phase.status === 'pending' && prevDone;
                    const s = schedEdit[phase._id] || {};

                    return (
                        <div key={phase._id} className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden
                            ${phase.status === 'active' ? 'border-emerald-200 shadow-md shadow-emerald-50'
                                : phase.status === 'completed' ? 'border-blue-100' : 'border-gray-100'}`}>

                            {/* Row header */}
                            <div
                                className="flex items-center gap-3 md:gap-4 p-4 md:p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => setExpanded(isEx ? null : phase._id)}
                            >
                                {/* Step icon */}
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-base transition-all
                                    ${phase.status === 'completed' ? 'bg-blue-600 text-white'
                                        : phase.status === 'active' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                            : 'bg-gray-100 text-gray-400'}`}>
                                    {phase.status === 'completed'
                                        ? <i className="fas fa-check text-sm" />
                                        : phase.status === 'active'
                                            ? <i className={`fas ${phase.icon} text-sm`} />
                                            : <span className="text-sm">{phase.order}</span>}
                                </div>

                                {/* Label */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className={`font-black text-sm truncate
                                            ${phase.status === 'active' ? 'text-emerald-800'
                                                : phase.status === 'completed' ? 'text-blue-800' : 'text-gray-600'}`}>
                                            {phase.label}
                                        </h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} whitespace-nowrap`}>
                                            {cfg.label}
                                        </span>
                                        {phase.status === 'active' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5 truncate hidden sm:block">{phase.description}</p>
                                </div>

                                {/* Dates — desktop */}
                                <div className="hidden lg:flex flex-col items-end text-[10px] text-gray-400 font-medium gap-0.5 pr-2">
                                    {phase.startedAt && <span><i className="fas fa-play mr-1 text-emerald-400" />{fmtDate(phase.startedAt)}</span>}
                                    {phase.completedAt && <span><i className="fas fa-flag-checkered mr-1 text-blue-400" />{fmtDate(phase.completedAt)}</span>}
                                    {phase.scheduledStartAt && !phase.startedAt && (
                                        <span className="text-indigo-400"><i className="fas fa-clock mr-1" />Scheduled: {fmtDate(phase.scheduledStartAt)}</span>
                                    )}
                                </div>

                                <i className={`fas fa-chevron-down text-gray-300 text-xs transition-transform duration-300 flex-shrink-0 ${isEx ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Expanded detail */}
                            {isEx && (
                                <div className="border-t border-gray-50 p-5 md:p-6 bg-gray-50/30 space-y-6 animate-in slide-in-from-top-2 duration-200">

                                    {/* Timestamps */}
                                    {(phase.startedAt || phase.completedAt) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {phase.startedAt && (
                                                <div className="bg-white rounded-xl p-4 border border-emerald-100">
                                                    <p className="text-[10px] font-black text-emerald-500 tracking-widest mb-1">DATE ACTIVATED</p>
                                                    <p className="text-sm font-bold text-gray-700">{fmtDate(phase.startedAt)}</p>
                                                    {phase.startedBy?.name && <p className="text-xs text-gray-400 mt-0.5">by {phase.startedBy.name}</p>}
                                                </div>
                                            )}
                                            {phase.completedAt && (
                                                <div className="bg-white rounded-xl p-4 border border-blue-100">
                                                    <p className="text-[10px] font-black text-blue-500 tracking-widest mb-1">DATE COMPLETED</p>
                                                    <p className="text-sm font-bold text-gray-700">{fmtDate(phase.completedAt)}</p>
                                                    {phase.completedBy?.name && <p className="text-xs text-gray-400 mt-0.5">by {phase.completedBy.name}</p>}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── Schedule Section ── */}
                                    {phase.status !== 'completed' && (
                                        <div className="bg-white border border-indigo-100 rounded-2xl p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <i className="fas fa-calendar-alt text-indigo-500 text-sm" />
                                                <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Phase Schedule (Optional)</h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                                        Scheduled Start Date &amp; Time (PKT)
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        value={s.scheduledStartAt || ''}
                                                        onChange={e => setSchedEdit(p => ({ ...p, [phase._id]: { ...s, scheduledStartAt: e.target.value } }))}
                                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-gray-50 transition-all"
                                                    />
                                                    <p className="text-[9px] text-gray-400 mt-1">The system will automatically activate this phase at the scheduled time.</p>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                                        Scheduled End Date &amp; Time (PKT)
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        value={s.scheduledEndAt || ''}
                                                        onChange={e => setSchedEdit(p => ({ ...p, [phase._id]: { ...s, scheduledEndAt: e.target.value } }))}
                                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-gray-50 transition-all"
                                                    />
                                                    <p className="text-[9px] text-gray-400 mt-1">The phase will be automatically completed at this time.</p>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                                        Expected Duration (Days)
                                                    </label>
                                                    <input
                                                        type="number" min="1"
                                                        value={s.durationDays || ''}
                                                        onChange={e => setSchedEdit(p => ({ ...p, [phase._id]: { ...s, durationDays: e.target.value } }))}
                                                        placeholder="e.g. 14"
                                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-gray-50 transition-all"
                                                    />
                                                    <p className="text-[9px] text-gray-400 mt-1">For reference and calendar display only.</p>
                                                </div>
                                            </div>

                                            {/* Live countdowns */}
                                            {(s.scheduledStartAt || s.scheduledEndAt || phase.scheduledStartAt || phase.scheduledEndAt) && (
                                                <div className="flex flex-wrap gap-3 mt-4">
                                                    {(s.scheduledStartAt || phase.scheduledStartAt) && phase.status === 'pending' && (
                                                        <Countdown targetDate={s.scheduledStartAt || phase.scheduledStartAt} label="Starts in" colour="indigo" />
                                                    )}
                                                    {(s.scheduledEndAt || phase.scheduledEndAt) && (
                                                        <Countdown targetDate={s.scheduledEndAt || phase.scheduledEndAt} label="Ends in" colour="amber" />
                                                    )}
                                                </div>
                                            )}

                                            <div className="mt-4 flex justify-end items-center gap-4">
                                                <p className="text-[10px] font-bold text-indigo-400 italic">
                                                    <i className="fas fa-info-circle mr-1" /> This will override any existing auto-schedule.
                                                </p>
                                                <Button size="sm" variant="primary" className="font-bold text-xs"
                                                    loading={isActLoading(phase._id + 'sched')}
                                                    onClick={() => handleSaveSchedule(phase._id)}>
                                                    <i className="fas fa-calendar-plus mr-2" />Save &amp; Override Schedule
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <label className="text-xs font-black text-gray-400 tracking-widest block mb-2">
                                            <i className="fas fa-sticky-note mr-2" />INTERNAL NOTES
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={editNotes[phase._id] || ''}
                                            onChange={e => setEditNotes(p => ({ ...p, [phase._id]: e.target.value }))}
                                            placeholder="Add internal notes about this phase (optional)…"
                                            className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                                        />
                                        <button
                                            onClick={() => handleSaveNotes(phase._id)}
                                            className="mt-1 text-xs font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer">
                                            <i className="fas fa-save mr-1" />Save Notes
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                                        {canStart && (
                                            <Button variant="primary" size="sm"
                                                loading={isActLoading(phase._id + 'start')}
                                                onClick={() => handleAction(phase._id, 'start')}>
                                                <i className="fas fa-play mr-2" />Activate This Phase
                                            </Button>
                                        )}
                                        {phase.status === 'pending' && !prevDone && (
                                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                                                <i className="fas fa-lock" />
                                                Complete the previous phase before activating this one.
                                            </div>
                                        )}
                                        {phase.status === 'active' && (
                                            <>
                                                <Button variant="success" size="sm"
                                                    loading={isActLoading(phase._id + 'complete')}
                                                    onClick={() => handleAction(phase._id, 'complete')}>
                                                    <i className="fas fa-check mr-2" />Mark as Completed
                                                </Button>
                                                {idx + 1 < phases.length && (
                                                    <Button variant="primary" size="sm"
                                                        loading={isActLoading(phases[idx + 1]._id + 'start')}
                                                        onClick={() => handleAction(phases[idx + 1]._id, 'start')}>
                                                        <i className="fas fa-forward-step mr-2" />Complete &amp; Advance
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        {phase.status === 'completed' && (
                                            <span className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl font-bold">
                                                <i className="fas fa-circle-check" />Phase completed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 px-2 text-xs text-gray-400 font-medium">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                    <span key={key} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </span>
                ))}
                <span className="ml-auto italic hidden sm:block">Select any phase row to expand details and controls</span>
            </div>
        </div>
    );
}
