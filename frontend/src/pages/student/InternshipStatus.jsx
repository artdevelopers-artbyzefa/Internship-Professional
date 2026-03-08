import React from 'react';

export default function InternshipStatus({ user, activePhase }) {
    const status = user.status || 'verified';
    const facultyStatus = user.internshipRequest?.facultyStatus;
    const assignedFaculty = user.assignedFaculty;

    // Define the institutional progress steps
    const steps = [
        {
            id: 'registration',
            label: 'Initial Registration',
            desc: 'Self-registration and eligibility verification.',
            icon: 'fa-user-check',
            done: true // If they are here, they registered
        },
        {
            id: 'request',
            label: 'Internship Request (AppEx-A)',
            desc: 'Submission of company preference and academic details.',
            icon: 'fa-file-export',
            active: activePhase?.key === 'request_submission',
            done: status === 'Internship Request Submitted' || status === 'Internship Approved' || status.includes('Agreement')
        },
        {
            id: 'faculty',
            label: 'Faculty Supervisor Reservation',
            desc: 'Your chosen faculty supervisor must accept the supervision request.',
            icon: 'fa-chalkboard-user',
            rejected: facultyStatus === 'Rejected',
            active: (status === 'Internship Request Submitted') && facultyStatus === 'Pending',
            done: facultyStatus === 'Accepted'
        },
        {
            id: 'approval',
            label: 'Departmental Approval',
            desc: 'Verification by Internship Office and HOD.',
            icon: 'fa-building-circle-check',
            done: status === 'Internship Approved' || status.includes('Agreement')
        },
        {
            id: 'agreement',
            label: 'Legal Agreement (AppEx-B)',
            desc: 'Final contract between university and service site.',
            icon: 'fa-file-signature',
            done: status === 'Agreement Approved' || status === 'Assigned'
        },
        {
            id: 'placement',
            label: 'Final Placement',
            desc: 'Official assignment to a supervisor.',
            icon: 'fa-briefcase',
            done: status === 'Assigned'
        }
    ];

    const currentStepIdx = steps.findLastIndex(s => s.done);
    const overallProgress = Math.round(((currentStepIdx + 1) / steps.length) * 100);

    const facultyStatusConfig = {
        'Pending': { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'fa-hourglass-half', label: 'Awaiting Response' },
        'Accepted': { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'fa-circle-check', label: 'Supervision Confirmed' },
        'Rejected': { color: 'rose', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700 border-rose-200', icon: 'fa-circle-xmark', label: 'Request Declined' },
    };
    const fConfig = facultyStatusConfig[facultyStatus] || facultyStatusConfig['Pending'];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header Telemetry */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Institutional Telemetry</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">My Internship Status</h2>
                        <p className="text-gray-500 font-medium max-w-md">
                            Tracking your progression through the multi-phase academic internship lifecycle.
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-6">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-20 h-20 -rotate-90">
                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-gray-200" />
                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="6"
                                    className="text-primary transition-all duration-1000"
                                    strokeDasharray={2 * Math.PI * 36}
                                    strokeDashoffset={2 * Math.PI * 36 * (1 - overallProgress / 100)}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-lg font-black text-gray-800">{overallProgress}%</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Overall Goal</p>
                            <p className="text-xl font-black text-gray-800 tracking-tight">Onboarding</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Faculty Supervisor Status Card — shown after request is submitted */}
            {facultyStatus && (
                <div className={`${fConfig.bg} border-2 ${fConfig.border} rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center gap-6`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${fConfig.bg} border-2 ${fConfig.border} ${fConfig.text}`}>
                        <i className={`fas ${fConfig.icon}`}></i>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${fConfig.badge}`}>
                                {fConfig.label}
                            </span>
                        </div>
                        <h3 className={`text-base font-black ${fConfig.text} mb-1`}>Faculty Supervisor Assignment</h3>
                        {facultyStatus === 'Accepted' && assignedFaculty?.name ? (
                            <p className="text-sm font-bold text-gray-600">
                                <i className="fas fa-user-graduate mr-2 opacity-50"></i>{assignedFaculty.name} has confirmed your supervision.
                            </p>
                        ) : facultyStatus === 'Rejected' ? (
                            <p className="text-sm font-bold text-rose-600/80">
                                Your supervision request was declined. Return to the <strong>Internship Assessment</strong> tab to reassign a new supervisor.
                            </p>
                        ) : (
                            <p className="text-sm font-bold text-amber-600/80">
                                Your request has been logged. The faculty supervisor will review and respond shortly.
                            </p>
                        )}
                    </div>
                    {facultyStatus === 'Rejected' && (
                        <a href="/student/internship-assessment">
                            <button className="flex-shrink-0 px-6 py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200">
                                <i className="fas fa-rotate-left mr-2"></i>Reassign
                            </button>
                        </a>
                    )}
                </div>
            )}

            {/* Timeline View */}
            <div className="grid grid-cols-1 gap-4">
                {steps.map((step, idx) => {
                    const isUpcoming = !step.done && !step.active && !step.rejected;
                    const isActive = step.active && !step.done && !step.rejected;
                    const isRejected = step.rejected;

                    return (
                        <div key={step.id} className={`flex items-start gap-6 p-6 rounded-3xl border-2 transition-all relative ${isRejected ? 'bg-rose-50/50 border-rose-200' :
                            step.done ? 'bg-emerald-50/50 border-emerald-100' :
                                isActive ? 'bg-white border-primary shadow-xl shadow-primary/5 ring-4 ring-primary/5' :
                                    'bg-gray-50/30 border-gray-100 opacity-60'
                            }`}>
                            {/* Sequence Line */}
                            {idx < steps.length - 1 && (
                                <div className={`absolute left-[39px] top-20 w-0.5 h-12 ${step.done ? 'bg-emerald-200' : isRejected ? 'bg-rose-200' : 'bg-gray-100'}`}></div>
                            )}

                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 z-10 ${isRejected ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' :
                                step.done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                                    isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' :
                                        'bg-white text-gray-300 border border-gray-100'
                                }`}>
                                <i className={`fas ${isRejected ? 'fa-xmark' : step.done ? 'fa-check' : step.icon}`}></i>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-4 mb-1">
                                    <h3 className={`text-lg font-black tracking-tight ${isRejected ? 'text-rose-900' : step.done ? 'text-emerald-900' : 'text-gray-800'}`}>
                                        {step.label}
                                    </h3>
                                    {isActive && (
                                        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase tracking-widest animate-pulse">
                                            Current Focus
                                        </span>
                                    )}
                                    {isRejected && (
                                        <span className="px-3 py-1 bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-rose-200">
                                            Action Required
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                    {step.desc}
                                </p>

                                {step.done && (
                                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                        <i className="fas fa-circle-check"></i> Milestone Achieved
                                    </div>
                                )}
                                {isRejected && (
                                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                                        <i className="fas fa-triangle-exclamation"></i> Reassignment Required — Return to Internship Assessment
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Support Notice */}
            <div className="bg-gray-900 rounded-[2rem] p-8 text-center text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(60,113,243,1),transparent)]"></div>
                </div>
                <div className="relative z-10">
                    <h4 className="text-xl font-black mb-2 tracking-tight">Need assistance with your status?</h4>
                    <p className="text-gray-400 text-sm font-medium mb-6">Contact the Internship Office if your status hasn't updated after submission.</p>
                    <a href="mailto:internship.office@cui.edu" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-xl text-xs font-black hover:bg-gray-100 transition-all active:scale-95 shadow-xl shadow-black/20">
                        <i className="fas fa-headset"></i> CONTACT SUPPORT
                    </a>
                </div>
            </div>
        </div>
    );
}


