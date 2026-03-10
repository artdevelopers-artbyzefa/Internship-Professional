import React, { useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import Phase1EligibilityBanner from '../../components/student/Phase1EligibilityBanner.jsx';
import StudentProfileCard from '../../components/student/StudentProfileCard.jsx';
import { apiRequest } from '../../utils/api.js';

export default function StudentDashboard({ user, isEligible, isPhase1, isPendingSetup, hardCriteriaMet, isProfileComplete: isProfileCompleteProp, activePhase }) {
  const [assignments, setAssignments] = useState([]);

  const isProfileComplete = isProfileCompleteProp ?? !!(user.fatherName && user.section && user.dateOfBirth && user.profilePicture);
  const phaseOrder = activePhase?.order || 1;
  const isLocked = !hardCriteriaMet;

  useEffect(() => {
    if (phaseOrder >= 3) fetchAssignments();
  }, [phaseOrder]);

  const fetchAssignments = async () => {
    try {
      const data = await apiRequest('/student/assignments');
      setAssignments(data || []);
    } catch (_) { }
  };

  // ── Calendar helpers ──
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
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
      const dayDeadlines = assignments.filter(a => {
        const dl = new Date(a.deadline);
        return dl.getDate() === d && dl.getMonth() === month && dl.getFullYear() === year;
      });

      days.push(
        <div
          key={d}
          className={`h-24 p-2 border-b border-r border-gray-100 hover:bg-blue-50/20 transition-all ${isToday ? 'bg-blue-50/40' : 'bg-white'}`}
        >
          <span className={`text-[10px] font-black inline-flex items-center justify-center ${isToday ? 'bg-primary text-white w-5 h-5 rounded-full' : 'text-gray-400'}`}>
            {d}
          </span>
          <div className="mt-1 space-y-0.5">
            {dayDeadlines.map((a, i) => (
              <div
                key={i}
                title={`Deadline: ${a.title}\n${a.submissionStatus === 'Submitted' ? '✓ Submitted' : '⏳ Pending'}`}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold border truncate shadow-sm cursor-default ${a.submissionStatus === 'Submitted'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-rose-50 text-rose-500 border-rose-100'
                  }`}
              >
                <i className={`fas ${a.submissionStatus === 'Submitted' ? 'fa-check' : 'fa-clock'} mr-1`}></i>
                {a.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  // ── Phase 1 view ──
  const Phase1Dashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 p-8 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">Stage 1</span>
            <span className="text-sm font-bold text-primary">Pre-internship Verification</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-3">Welcome to University Internship Portal</h2>
          <p className="text-gray-500 font-medium max-w-xl">
            Complete your institutional registration to proceed with the academic internship cycle.
          </p>
        </div>
      </div>

      <Phase1EligibilityBanner user={user} />

      {isPendingSetup && (
        <Alert type="warning" title="Finalize Academic Profile" className="mt-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <p className="max-w-md">Meeting all requirements! Finalize your profile details to unlock the placement workflow.</p>
            <a href="/student/profile" className="flex-shrink-0">
              <button className="font-bold text-xs px-10 py-3 rounded-xl bg-gray-900 text-white hover:bg-black transition-all border-0 shadow-lg cursor-pointer uppercase tracking-widest">
                Complete Profile
              </button>
            </a>
          </div>
        </Alert>
      )}
    </div>
  );

  // ── Phase 2+ view ──
  const Phase2PlusDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* Header with phase progress */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
            Welcome back, {user.name?.split(' ')[0]}
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            {user.reg}{user.assignedCompany ? ` · ${user.assignedCompany}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phase Progress</p>
            <p className="text-sm font-black text-primary">{activePhase?.label || 'Active'}</p>
            <div className="mt-2 w-36 bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${(phaseOrder / 5) * 100}%` }} />
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white text-lg font-black shadow-lg shadow-primary/20">
            {phaseOrder}
          </div>
        </div>
      </div>

      {/* Full-width Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Calendar toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Academic Calendar</h3>
            {assignments.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] font-black rounded-full border border-rose-100 uppercase tracking-wider">
                {assignments.length} Deadline{assignments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-gray-700">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center cursor-pointer shadow-sm border-0">
                <i className="fas fa-chevron-left text-[10px]" />
              </button>
              <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center cursor-pointer shadow-sm border-0">
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
            <span className="w-3 h-3 rounded bg-rose-400 inline-block" /> Deadline (Pending)
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
            <span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Submitted
          </div>
        </div>
      </div>

      {/* Upcoming deadlines list */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest">Assignment Deadlines</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {[...assignments]
              .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
              .map((a, i) => {
                const dl = new Date(a.deadline);
                const isOverdue = dl < today;
                const daysLeft = Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
                const submitted = a.submissionStatus === 'Submitted';
                return (
                  <div key={i} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${submitted ? 'bg-emerald-50 text-emerald-500' : isOverdue ? 'bg-rose-50 text-rose-500' : 'bg-primary/5 text-primary'}`}>
                        <i className={`fas ${submitted ? 'fa-check-circle' : 'fa-clock'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 leading-none">{a.title}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{a.courseTitle || 'Industrial Task'}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-4">
                      {submitted && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full border border-emerald-100 uppercase tracking-wider">Submitted</span>
                      )}
                      <div>
                        <p className="text-xs font-black text-gray-700">{dl.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className={`text-[9px] font-black uppercase tracking-wider mt-0.5 text-right ${submitted ? 'text-emerald-500' : isOverdue ? 'text-rose-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {submitted ? 'Done' : isOverdue ? 'Overdue' : daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-2 px-4 md:px-0 space-y-8">
      <NoticeModal />
      {!isLocked && <StudentProfileCard user={user} />}
      {isPhase1 ? <Phase1Dashboard /> : <Phase2PlusDashboard />}
    </div>
  );
}
