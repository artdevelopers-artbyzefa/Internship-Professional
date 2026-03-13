import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';
import RegisteredStudents from '../office/RegisteredStudents.jsx';

export default function SupervisorDashboard({ user, activePhase }) {
    const [profile, setProfile] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const isPhase2OrLower = activePhase?.order <= 2;

    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    useEffect(() => {
        Promise.all([
            apiRequest('/supervisor/profile'),
            !isPhase2OrLower ? apiRequest('/supervisor/assignments') : Promise.resolve([])
        ]).then(([profileData, assignmentData]) => {
            setProfile(profileData);
            setAssignments(assignmentData || []);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, [isPhase2OrLower]);

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const total = new Date(year, month + 1, 0).getDate();
        const start = new Date(year, month, 1).getDay();
        const days = [];

        for (let i = 0; i < start; i++) {
            days.push(<div key={`e-${i}`} className="h-24 border-b border-r border-gray-50 bg-gray-50/20" />);
        }

        for (let d = 1; d <= total; d++) {
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

            // Match assignments where start date OR deadline falls on this day
            const dayEvents = assignments.flatMap(a => {
                const events = [];
                const dl = new Date(a.deadline);
                const sd = new Date(a.startDate);
                if (dl.getDate() === d && dl.getMonth() === month && dl.getFullYear() === year)
                    events.push({ title: a.title, type: 'deadline' });
                if (sd.getDate() === d && sd.getMonth() === month && sd.getFullYear() === year && dl.toDateString() !== sd.toDateString())
                    events.push({ title: a.title, type: 'start' });
                return events;
            });

            days.push(
                <div key={d} className={`h-24 p-1.5 border-b border-r border-gray-100 hover:bg-blue-50/20 transition-all ${isToday ? 'bg-blue-50/40' : 'bg-white'}`}>
                    <span className={`text-[10px] font-black inline-flex items-center justify-center ${isToday ? 'bg-primary text-white w-5 h-5 rounded-full' : 'text-gray-400'}`}>
                        {d}
                    </span>
                    <div className="mt-1 space-y-0.5">
                        {dayEvents.map((ev, i) => (
                            <div key={i} title={ev.title}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold border truncate ${ev.type === 'deadline'
                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    }`}>
                                <i className={`fas ${ev.type === 'deadline' ? 'fa-flag-checkered' : 'fa-play'} mr-1`} />
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    if (loading) return <div className="p-20 text-center"><i className="fas fa-circle-notch fa-spin text-primary text-2xl" /></div>;

    const stats = [
        { label: 'Assigned Interns', value: profile?.stats?.studentCount || 0, icon: 'fa-users', color: 'blue' }
    ];

    if (!isPhase2OrLower) {
        stats.push(
            { label: 'Active Tasks', value: profile?.stats?.assignmentCount || 0, icon: 'fa-tasks', color: 'emerald' },
            { label: 'Pending Evaluations', value: profile?.stats?.pendingEvaluations || 0, icon: 'fa-clock', color: 'amber' }
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-100 overflow-hidden">
                        {user.profilePicture
                            ? <img src={user.profilePicture} className="w-full h-full object-cover rounded-2xl" alt={user.name} />
                            : <i className="fas fa-user-tie text-xl" />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
                        <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-2">
                            <i className="fas fa-building text-gray-300" />
                            {profile?.company?.name || 'Partner Organization'}
                            <span className="text-gray-200">|</span>
                            <span className="text-primary font-bold">{user.email}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Portal Access</p>
                        <p className="text-xs font-bold text-gray-700">Industrial Site Supervisor</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100 mx-2" />
                    <button onClick={() => navigate('/supervisor/profile')}
                        className="p-3 rounded-xl border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 transition-all bg-white cursor-pointer">
                        <i className="fas fa-cog" />
                    </button>
                </div>
            </div>

            {/* Phase info bar for Phase 2 */}
            {isPhase2OrLower && (
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white text-sm shadow-md shadow-blue-200">
                        <i className="fas fa-info-circle text-lg" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Placement & Approvals</p>
                        <p className="text-xs text-blue-500 font-medium mt-0.5">Assigned interns are currently undergoing administrative approvals. Assignments and grading will unlock in Phase 3.</p>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className={`grid grid-cols-1 ${isPhase2OrLower ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                            stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-amber-50 text-amber-600'}`}>
                            <i className={`fas ${stat.icon}`} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {isPhase2OrLower ? (
                <div className="space-y-6">
                    <RegisteredStudents user={user} />
                </div>
            ) : (
                <>
                    {/* Full-width Calendar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Toolbar */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-5 bg-primary rounded-full" />
                                <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Assignment Calendar</h3>
                                {assignments.length > 0 && (
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] font-black rounded-full border border-rose-100 uppercase tracking-wider">
                                        {assignments.length} Task{assignments.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-gray-700">
                                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-primary transition-all flex items-center justify-center cursor-pointer">
                                        <i className="fas fa-chevron-left text-[10px]" />
                                    </button>
                                    <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-primary transition-all flex items-center justify-center cursor-pointer">
                                        <i className="fas fa-chevron-right text-[10px]" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Day names */}
                        <div className="grid grid-cols-7 border-b border-gray-50">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7">
                            {renderCalendar()}
                        </div>

                        {/* Legend */}
                        <div className="px-6 py-3 bg-gray-50/30 border-t border-gray-50 flex items-center gap-6">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                <span className="w-3 h-3 rounded bg-primary inline-block" /> Today
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                <span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Task Start Date
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                <span className="w-3 h-3 rounded bg-rose-400 inline-block" /> Submission Deadline
                            </div>
                        </div>
                    </div>

                    {/* Upcoming deadlines quick view */}
                    {assignments.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest">Task Deadlines</h3>
                                <button onClick={() => navigate('/supervisor/assignments')}
                                    className="text-[10px] font-black text-primary hover:underline bg-transparent border-0 cursor-pointer uppercase tracking-wider">
                                    Manage Tasks →
                                </button>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {[...assignments]
                                    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                                    .map((a, i) => {
                                        const dl = new Date(a.deadline);
                                        const isOverdue = dl < today;
                                        const daysLeft = Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
                                        return (
                                            <div key={i} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${isOverdue ? 'bg-rose-50 text-rose-500' : 'bg-primary/5 text-primary'}`}>
                                                        <i className="fas fa-clipboard-list" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800 leading-none">{a.title}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                            {a.targetStudents?.length > 0 ? `${a.targetStudents.length} intern(s)` : 'All interns'} · {a.totalMarks} marks
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs font-black text-gray-700">{dl.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                    <p className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${isOverdue ? 'text-rose-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                        {isOverdue ? 'Closed' : daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
