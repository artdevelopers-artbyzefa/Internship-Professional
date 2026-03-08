import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import { showToast, showAlert } from '../../utils/notifications.jsx';

const STATUS_CONFIG = {
    pending: { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-300' },
    active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    completed: { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
};

function formatDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleString('en-PK', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export default function PhaseManagement({ user }) {
    const [phases, setPhases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null); // ID of loading action
    const [editNotes, setEditNotes] = useState({}); // { [id]: string }
    const [expanded, setExpanded] = useState(null);

    useEffect(() => { fetchPhases(); }, []);

    const fetchPhases = async () => {
        try {
            const data = await apiRequest('/phases');
            setPhases(data);
            // Pre-fill notes
            const notes = {};
            data.forEach(p => { notes[p._id] = p.notes || ''; });
            setEditNotes(notes);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (phaseId, action) => {
        const phase = phases.find(p => p._id === phaseId);
        let confirmMsg = '';

        if (action === 'start') confirmMsg = `Start Phase: "${phase.label}"?\n\nAny currently active phase will be automatically completed.`;
        if (action === 'complete') confirmMsg = `Mark "${phase.label}" as completed?`;
        if (action === 'reset') confirmMsg = `Reset "${phase.label}" back to Pending?\n\nThis will erase its start/completion dates.`;

        const confirmed = await showAlert.confirm(
            action === 'start' ? 'Activate Phase' :
                action === 'complete' ? 'Complete Phase' : 'Reset Phase',
            confirmMsg,
            action === 'start' ? 'Yes, Start Phase' :
                action === 'complete' ? 'Yes, Complete' : 'Yes, Reset'
        );
        if (!confirmed) return;

        setActionId(phaseId + action);
        try {
            const res = await apiRequest(`/phases/${phaseId}/${action}`, {
                method: 'POST',
                body: { officeId: user.id || user._id }
            });
            showToast.success(res.message);
            fetchPhases();
        } catch (err) {
            // handled by apiRequest
        } finally {
            setActionId(null);
        }
    };

    const handleSaveNotes = async (phaseId) => {
        try {
            await apiRequest(`/phases/${phaseId}/notes`, {
                method: 'PATCH',
                body: { notes: editNotes[phaseId] }
            });
            showToast.success('Notes saved.');
        } catch (err) {
            // handled
        }
    };

    const activePhase = phases.find(p => p.status === 'active');
    const completedCount = phases.filter(p => p.status === 'completed').length;
    const progress = phases.length ? Math.round((completedCount / phases.length) * 100) : 0;

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i>
        </div>
    );

    return (
        <div className="space-y-8">

            {/* ── Header & Progress ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Program Phase Control</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            Manage and advance through the {phases.length} official phases of the internship cycle.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 tracking-widest">OVERALL PROGRESS</p>
                            <p className="text-3xl font-black text-primary">{progress}%</p>
                        </div>
                        <div className="w-20 h-20 relative flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="#1e40af" strokeWidth="3"
                                    strokeDasharray={`${progress}, 100`}
                                    className="transition-all duration-700" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-primary">{completedCount}/{phases.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Phase Banner */}
                {activePhase && (
                    <div className="mt-6 flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <i className={`fas ${activePhase.icon} text-lg`}></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-black text-emerald-600 tracking-widest">CURRENTLY ACTIVE PHASE</p>
                            <p className="font-black text-emerald-900">{activePhase.label}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs text-emerald-700 font-bold">Live</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Phase Timeline ────────────────────────────────────── */}
            <div className="space-y-3">
                {phases.map((phase, idx) => {
                    const cfg = STATUS_CONFIG[phase.status];
                    const isExpanded = expanded === phase._id;
                    const isFirst = idx === 0;
                    const prevDone = idx === 0 || phases[idx - 1]?.status === 'completed';
                    const canStart = phase.status === 'pending' && prevDone;
                    const isLoading = (s) => actionId === phase._id + s;

                    return (
                        <div key={phase._id}
                            className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden ${phase.status === 'active' ? 'border-emerald-200 shadow-lg shadow-emerald-50' :
                                    phase.status === 'completed' ? 'border-blue-100' : 'border-gray-100'
                                }`}
                        >
                            {/* ── Phase Header Row ── */}
                            <div
                                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => setExpanded(isExpanded ? null : phase._id)}
                            >
                                {/* Step Number / Status Icon */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg transition-all ${phase.status === 'completed' ? 'bg-blue-600 text-white' :
                                        phase.status === 'active' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                                            'bg-gray-100 text-gray-400'
                                    }`}>
                                    {phase.status === 'completed'
                                        ? <i className="fas fa-check text-sm"></i>
                                        : phase.status === 'active'
                                            ? <i className={`fas ${phase.icon} text-sm`}></i>
                                            : <span className="text-sm">{phase.order}</span>
                                    }
                                </div>

                                {/* Label + Description */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className={`font-black text-sm ${phase.status === 'active' ? 'text-emerald-800' :
                                                phase.status === 'completed' ? 'text-blue-800' : 'text-gray-600'
                                            }`}>{phase.label}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                            {cfg.label}
                                        </span>
                                        {phase.status === 'active' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Live
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{phase.description}</p>
                                </div>

                                {/* Date info */}
                                <div className="hidden md:flex flex-col items-end text-[10px] text-gray-400 font-medium pr-2">
                                    {phase.startedAt && <span><i className="fas fa-play mr-1 text-emerald-400"></i>{formatDate(phase.startedAt)}</span>}
                                    {phase.completedAt && <span><i className="fas fa-stop mr-1 text-blue-400"></i>{formatDate(phase.completedAt)}</span>}
                                </div>

                                {/* Expand chevron */}
                                <i className={`fas fa-chevron-down text-gray-300 text-xs transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                            </div>

                            {/* ── Expanded Detail Panel ── */}
                            {isExpanded && (
                                <div className="border-t border-gray-50 p-6 bg-gray-50/30 space-y-6 animate-in slide-in-from-top-2 duration-200">

                                    {/* Timestamps */}
                                    {(phase.startedAt || phase.completedAt) && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {phase.startedAt && (
                                                <div className="bg-white rounded-xl p-4 border border-emerald-100">
                                                    <p className="text-[10px] font-black text-emerald-500 tracking-widest mb-1">STARTED</p>
                                                    <p className="text-sm font-bold text-gray-700">{formatDate(phase.startedAt)}</p>
                                                    {phase.startedBy && <p className="text-xs text-gray-400 mt-0.5">by {phase.startedBy.name}</p>}
                                                </div>
                                            )}
                                            {phase.completedAt && (
                                                <div className="bg-white rounded-xl p-4 border border-blue-100">
                                                    <p className="text-[10px] font-black text-blue-500 tracking-widest mb-1">COMPLETED</p>
                                                    <p className="text-sm font-bold text-gray-700">{formatDate(phase.completedAt)}</p>
                                                    {phase.completedBy && <p className="text-xs text-gray-400 mt-0.5">by {phase.completedBy.name}</p>}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <label className="text-xs font-black text-gray-400 tracking-widest block mb-2">
                                            <i className="fas fa-sticky-note mr-2"></i>PHASE NOTES
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={editNotes[phase._id] || ''}
                                            onChange={e => setEditNotes(prev => ({ ...prev, [phase._id]: e.target.value }))}
                                            placeholder="Add internal notes about this phase (optional)..."
                                            className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                                        />
                                        <button
                                            onClick={() => handleSaveNotes(phase._id)}
                                            className="mt-1 text-xs font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer"
                                        >
                                            <i className="fas fa-save mr-1"></i>Save Notes
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                                        {canStart && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                loading={isLoading('start')}
                                                onClick={() => handleAction(phase._id, 'start')}
                                            >
                                                <i className="fas fa-play mr-2"></i>
                                                Activate This Phase
                                            </Button>
                                        )}
                                        {phase.status === 'pending' && !prevDone && (
                                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                                                <i className="fas fa-lock"></i>
                                                Complete Phase {phase.order - 1} first to unlock
                                            </div>
                                        )}
                                        {phase.status === 'active' && (
                                            <>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    loading={isLoading('complete')}
                                                    onClick={() => handleAction(phase._id, 'complete')}
                                                >
                                                    <i className="fas fa-check mr-2"></i>
                                                    Mark as Completed
                                                </Button>
                                                {idx + 1 < phases.length && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        loading={isLoading('start')}
                                                        onClick={() => handleAction(phases[idx + 1]._id, 'start')}
                                                    >
                                                        <i className="fas fa-forward-step mr-2"></i>
                                                        Complete & Advance to Next
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        {(phase.status === 'active' || phase.status === 'completed') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                loading={isLoading('reset')}
                                                onClick={() => handleAction(phase._id, 'reset')}
                                                className="text-red-500 border-red-200 hover:bg-red-50"
                                            >
                                                <i className="fas fa-rotate-left mr-2"></i>
                                                Reset Phase
                                            </Button>
                                        )}
                                        {phase.status === 'completed' && (
                                            <span className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl font-bold">
                                                <i className="fas fa-circle-check"></i>
                                                Phase completed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Footer Legend ─────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-6 px-2 text-xs text-gray-400 font-medium">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <span key={key} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`}></span>
                        {cfg.label}
                    </span>
                ))}
                <span className="ml-auto italic">Click any phase row to expand controls</span>
            </div>
        </div>
    );
}
