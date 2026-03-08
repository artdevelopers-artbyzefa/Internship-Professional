import React from 'react';
import { Link } from 'react-router-dom';

export default function InternshipStatus({ user }) {
    const status = user.status || 'verified';
    const req = user.internshipRequest;
    const isSubmitted = !!req?.submittedAt;
    const isOfficiallyAssigned = status === 'Assigned' || (user.assignedCompany && user.assignedFaculty && user.assignedCompanySupervisor);
    const isComplete = isOfficiallyAssigned || status === 'Assigned';

    // Collect all chronological events that have ACTUALLY happened
    const events = [];

    // 1. Always registered
    if (!isComplete) {
        events.push({
            id: 'registration',
            title: 'Initial Registration',
            desc: 'Account verified and profile activated.',
            icon: 'fa-user-check',
            color: 'emerald',
            date: user.createdAt
        });

        // 2. Request Submitted
        if (isSubmitted) {
            events.push({
                id: 'request_submitted',
                title: 'Internship Request (AppEx-A) Submitted',
                desc: `Requested placement details logged in the system.`,
                icon: 'fa-file-export',
                color: 'emerald',
                date: req.submittedAt
            });
        }

        // 3. Faculty Action
        if (req?.facultyStatus === 'Accepted') {
            events.push({
                id: 'faculty_accepted',
                title: 'Faculty Supervisor Confirmed',
                desc: user.assignedFaculty?.name ? `Your faculty supervisor is ${user.assignedFaculty.name}.` : 'Supervision accepted by chosen faculty.',
                icon: 'fa-chalkboard-user',
                color: 'emerald'
            });
        } else if (req?.facultyStatus === 'Rejected') {
            events.push({
                id: 'faculty_rejected',
                title: 'Faculty Request Declined',
                desc: 'Your chosen faculty supervisor could not accommodate the request.',
                icon: 'fa-user-slash',
                color: 'rose',
                action: '/student/internship-assessment',
                actionLabel: 'Reassign Supervisor',
                isError: true
            });
        }

        // 4. Site Supervisor
        if (user.assignedCompanySupervisor) {
            events.push({
                id: 'site_supervisor',
                title: 'Site Supervisor Assigned',
                desc: `Site supervisor is set to ${user.assignedCompanySupervisor}.`,
                icon: 'fa-user-tie',
                color: 'emerald'
            });
        }

        // 5. Company Assigned
        if (user.assignedCompany) {
            events.push({
                id: 'company',
                title: 'Company Assigned',
                desc: `Your placement organization is ${user.assignedCompany}.`,
                icon: 'fa-building',
                color: 'emerald'
            });
        }

        // 6. Departmental Action (AppEx-A)
        if (status === 'Internship Approved' || status.includes('Agreement') || status === 'Assigned') {
            events.push({
                id: 'office_approved',
                title: 'AppEx-A Approved',
                desc: 'Your request has been verified by the Internship Office.',
                icon: 'fa-building-circle-check',
                color: 'emerald'
            });
        } else if (status === 'Internship Rejected') {
            events.push({
                id: 'office_rejected',
                title: 'Request Rejected',
                desc: req?.rejectionReason || 'Your request was rejected by the Internship Office.',
                icon: 'fa-ban',
                color: 'rose',
                action: '/student/internship-assessment',
                actionLabel: 'Update Request',
                isError: true
            });
        }
    }

    // 7. Placement Confirmed (Final State)
    if (isComplete) {
        events.push({
            id: 'final_placement',
            title: 'Internship Officially Assigned',
            desc: 'Your placement is confirmed. Please wait for the next phase to begin.',
            icon: 'fa-check-double',
            color: 'primary'
        });
    }

    // Determine what the overall telemetry ring should look like
    let progress = 15;
    if (isSubmitted) progress = 40;
    if (user.assignedCompany || user.assignedCompanySupervisor || req?.facultyStatus === 'Accepted') progress = 70;
    if (status === 'Internship Approved') progress = 90;
    if (isOfficiallyAssigned) progress = 100;
    const hasError = events.some(e => e.isError);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header Telemetry */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Progress Timeline</span>
                            {!hasError && !isComplete && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                            {hasError && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">My Internship Status</h2>
                        <p className="text-gray-500 font-medium max-w-md">
                            Tracking events and updates regarding your internship placement.
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-6">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-20 h-20 -rotate-90">
                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-gray-200" />
                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="6"
                                    className={`${hasError ? 'text-rose-500' : 'text-primary'} transition-all duration-1000`}
                                    strokeDasharray={2 * Math.PI * 36}
                                    strokeDashoffset={2 * Math.PI * 36 * (1 - progress / 100)}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-lg font-black text-gray-800">{progress}%</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
                            <p className="text-lg font-black text-gray-800 tracking-tight">
                                {isComplete ? 'Assigned' : hasError ? 'Attention Needed' : 'In Progress'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Timeline */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8 border-b border-gray-50 pb-4">Activity Log</p>
                <div className="space-y-6">
                    {/* Render exact completed events */}
                    {events.map((evt, idx) => {
                        const isLast = idx === events.length - 1;
                        const isErr = evt.isError;
                        const bg = isErr ? 'bg-rose-50 border-rose-100' : evt.color === 'primary' ? 'bg-primary/5 border-primary/20' : 'bg-emerald-50/50 border-emerald-100';
                        const iconBg = isErr ? 'bg-rose-500 shadow-rose-200' : evt.color === 'primary' ? 'bg-primary shadow-primary/30' : 'bg-emerald-500 shadow-emerald-200';
                        const text = isErr ? 'text-rose-900' : evt.color === 'primary' ? 'text-primary' : 'text-emerald-900';

                        return (
                            <div key={evt.id} className="relative flex items-start gap-5">
                                {/* Line connecting dots (except last item) */}
                                {!isLast && (
                                    <div className={`absolute left-5 top-12 bottom-[-24px] w-0.5 ${isErr ? 'bg-rose-200' : 'bg-emerald-200'}`}></div>
                                )}

                                {/* Icon */}
                                <div className={`relative z-10 w-10 h-10 shrink-0 rounded-[14px] text-white flex items-center justify-center text-sm shadow-lg ${iconBg}`}>
                                    <i className={`fas ${evt.icon}`}></i>
                                </div>

                                {/* Content */}
                                <div className={`flex-1 rounded-2xl border p-5 ${bg}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className={`text-base font-black tracking-tight mb-1 ${text}`}>{evt.title}</h3>
                                            <p className="text-sm font-medium text-gray-600 leading-relaxed">{evt.desc}</p>
                                        </div>
                                        {evt.date && (
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap pt-1">
                                                {new Date(evt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                    {evt.action && (
                                        <div className="mt-4 pt-4 border-t border-rose-200/50">
                                            <Link to={evt.action}>
                                                <button className="px-5 py-2.5 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors shadow-md shadow-rose-200">
                                                    {evt.actionLabel} <i className="fas fa-arrow-right ml-1"></i>
                                                </button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Pending Pulsing Node appended at the end if not complete and no errors */}
                    {!isComplete && !hasError && (
                        <div className="relative flex items-start gap-5 mt-6">
                            {/* Connect from last completed node to pending node */}
                            <div className="absolute left-5 top-[-24px] h-6 w-0.5 bg-gradient-to-b from-emerald-200 to-gray-200"></div>

                            <div className="relative z-10 w-10 h-10 shrink-0 rounded-[14px] bg-white border-2 border-primary/30 text-primary flex items-center justify-center text-sm">
                                <span className="absolute w-full h-full rounded-[14px] border-2 border-primary animate-ping opacity-20"></span>
                                <i className="fas fa-circle-notch fa-spin"></i>
                            </div>

                            <div className="flex-1 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 mt-[-4px]">
                                <h3 className="text-base font-black tracking-tight text-gray-700 mb-1">
                                    {status === 'Internship Approved' ? 'Placement Secured — Awaiting Enrollment' :
                                        (isSubmitted && req?.facultyStatus !== 'Pending') ? 'Official Review in Progress' : 'Awaiting Faculty Response'}
                                </h3>
                                <p className="text-sm font-medium text-gray-500">
                                    {status === 'Internship Approved' ? 'Your placement details are verified. The department will officially enroll you soon. No further action is required from your side.' :
                                        'The relevant authorities will update your status as your request is processed.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
