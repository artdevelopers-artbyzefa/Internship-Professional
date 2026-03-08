import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';

const CHECK_ICONS = {
    semester: 'fa-graduation-cap',
    verified: 'fa-envelope-circle-check',
    cgpa: 'fa-chart-line',
    registration: 'fa-id-card',
    profile: 'fa-user-pen',
};

export default function Phase1EligibilityBanner({ user }) {
    const [loading, setLoading] = useState(true);
    const [eligibility, setEligibility] = useState(null);
    const [activePhase, setActivePhase] = useState(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [phaseData, eligData] = await Promise.all([
                apiRequest('/phases/current'),
                apiRequest(`/student/eligibility/${user.id || user._id}`)
            ]);
            setActivePhase(phaseData);
            setEligibility(eligData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Only show during Phase 1
    if (loading) return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-3">
            <i className="fas fa-circle-notch fa-spin text-primary"></i>
            <span className="text-sm text-gray-400">Checking internship eligibility...</span>
        </div>
    );

    // No phase active yet — show neutral "not started" banner
    if (!activePhase) return (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200 flex-shrink-0">
                <i className="fas fa-hourglass-start text-gray-400"></i>
            </div>
            <div>
                <p className="font-black text-gray-500 text-sm">Internship Cycle Not Yet Initiated</p>
                <p className="text-xs text-gray-400 mt-1">The Internship Office has not started any phase yet. You will be notified when Phase 1 (Student Registration) begins.</p>
            </div>
        </div>
    );

    // Conditional Visibility logic:
    // 1. If global phase is "registration", always show the banner (advisory mode)
    // 2. If global phase is NOT "registration", only show if student is INELIGIBLE (blocked mode)
    const isGlobalPhase1 = activePhase?.key === 'registration';
    const isBlocked = !isGlobalPhase1 && eligibility && !eligibility.eligible;

    if (!isGlobalPhase1 && !isBlocked) return null;

    if (!eligibility) return null;

    const { eligible, checks } = eligibility;
    const hardFails = checks.filter(c => !c.passed && !c.warning);
    const warnings = checks.filter(c => !c.passed && c.warning);
    const allPassed = checks.filter(c => c.passed);

    return (
        <div className={`rounded-2xl border-2 overflow-hidden transition-all ${eligible
            ? 'border-emerald-200 shadow-lg shadow-emerald-50'
            : 'border-red-200 shadow-lg shadow-red-50'
            }`}>
            {/* ── Header ── */}
            <div className={`p-6 flex items-start gap-4 ${eligible ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                {/* Phase badge */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-black ${eligible ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-red-400 text-white shadow-lg shadow-red-200'
                    }`}>
                    <i className={`fas ${eligible ? 'fa-circle-check' : 'fa-triangle-exclamation'} text-lg`}></i>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border ${eligible
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                            }`}>
                            {isGlobalPhase1 ? 'PHASE 1 — STUDENT REGISTRATION' : 'VERIFICATION FAILED — SESSION LOCKED'}
                        </span>
                        {isGlobalPhase1 ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                Currently Active
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                <i className="fas fa-lock"></i>
                                Enrollment Closed
                            </span>
                        )}
                    </div>

                    <h3 className={`text-lg font-black ${eligible ? 'text-emerald-900' : 'text-red-900'}`}>
                        {isGlobalPhase1
                            ? (eligible ? '✅ You Are Eligible for This Internship Cycle' : '❌ You Are Not Eligible for This Internship Cycle')
                            : '❌ Internship Participation Denied'
                        }
                    </h3>
                    <p className={`text-sm mt-1 ${eligible ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isGlobalPhase1
                            ? (eligible
                                ? `All mandatory criteria are satisfied, ${user.name?.split(' ')[0]}. You may proceed when Phase 2 begins.`
                                : `${hardFails.length} mandatory requirement(s) are not met. You cannot participate in this internship cycle.`)
                            : `This internship cycle has moved past Phase 1. Since you did not meet the eligibility requirements, your portal access is restricted.`
                        }
                    </p>
                </div>

                <button
                    onClick={() => setExpanded(v => !v)}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center text-gray-500 hover:bg-white transition-all cursor-pointer border-0"
                >
                    <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}></i>
                </button>
            </div>

            {/* ── Eligibility Criteria ── */}
            {expanded && (
                <div className="bg-white border-t border-gray-100 p-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-[10px] font-black text-gray-400 tracking-widest mb-4">ELIGIBILITY CHECKLIST</p>

                    {checks.map(check => (
                        <div key={check.key}
                            className={`flex items-start gap-3 p-4 rounded-xl border ${!check.passed && !check.warning ? 'bg-red-50 border-red-100' :
                                !check.passed && check.warning ? 'bg-amber-50 border-amber-100' :
                                    'bg-green-50 border-green-100'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${!check.passed && !check.warning ? 'bg-red-100 text-red-500' :
                                !check.passed && check.warning ? 'bg-amber-100 text-amber-600' :
                                    'bg-green-100 text-green-600'
                                }`}>
                                <i className={`fas ${CHECK_ICONS[check.key] || 'fa-circle'}`}></i>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className={`text-xs font-black ${!check.passed && !check.warning ? 'text-red-700' :
                                        !check.passed && check.warning ? 'text-amber-700' :
                                            'text-green-700'
                                        }`}>{check.label}</p>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${!check.passed && !check.warning ? 'bg-red-100 text-red-600' :
                                        !check.passed && check.warning ? 'bg-amber-100 text-amber-600' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {!check.passed && !check.warning ? 'FAILED' :
                                            !check.passed && check.warning ? 'WARNING' : 'PASSED'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">{check.detail}</p>
                            </div>
                        </div>
                    ))}

                    {/* Summary counts */}
                    <div className="flex gap-4 pt-4 border-t border-gray-50">
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                            <i className="fas fa-check-circle"></i> {allPassed.length} Passed
                        </span>
                        {warnings.length > 0 && (
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                <i className="fas fa-triangle-exclamation"></i> {warnings.length} Warning
                            </span>
                        )}
                        {hardFails.length > 0 && (
                            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                <i className="fas fa-times-circle"></i> {hardFails.length} Failed
                            </span>
                        )}
                        {eligible && (
                            <span className="ml-auto text-xs text-emerald-600 font-bold italic">
                                <i className="fas fa-circle-info mr-1"></i>
                                Wait for Phase 2 to begin to submit your request.
                            </span>
                        )}
                        {!eligible && (
                            <span className="ml-auto text-xs text-red-500 font-bold italic">
                                Contact the Internship Office for clarification.
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── Collapsed preview row ── */}
            {!expanded && (
                <div className="bg-white border-t border-gray-100 px-6 py-3 flex items-center gap-6">
                    <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                        <i className="fas fa-check-circle"></i> {allPassed.length} criteria passed
                    </span>
                    {hardFails.length > 0 && (
                        <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                            <i className="fas fa-times-circle"></i> {hardFails.length} failed
                        </span>
                    )}
                    {warnings.length > 0 && (
                        <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                            <i className="fas fa-triangle-exclamation"></i> {warnings.length} warning
                        </span>
                    )}
                    <button
                        onClick={() => setExpanded(true)}
                        className="ml-auto text-xs font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer"
                    >
                        View full checklist <i className="fas fa-arrow-right ml-1"></i>
                    </button>
                </div>
            )}
        </div>
    );
}
