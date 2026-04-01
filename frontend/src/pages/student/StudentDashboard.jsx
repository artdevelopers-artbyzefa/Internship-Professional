import React, { useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import Phase1EligibilityBanner from '../../components/student/Phase1EligibilityBanner.jsx';
import StudentProfileCard from '../../components/student/StudentProfileCard.jsx';
import { apiRequest } from '../../utils/api.js';
import { gradeFromPct, gradeColor, gradePointsFromPct } from '../../utils/helpers.js';

function CountdownDisplay({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const end = new Date(targetDate);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Time reached');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let str = '';
      if (days > 0) str += `${days}d `;
      str += `${hours}h ${mins}m`;
      setTimeLeft(str);
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span className="text-xs font-black text-gray-800 tabular-nums">{timeLeft}</span>;
}

export default function StudentDashboard({ user, eligibility, isEligible, isPhase1, isPendingSetup, hardCriteriaMet, isProfileComplete: isProfileCompleteProp, activePhase }) {
  const [assignments, setAssignments] = useState([]);
  const [gradeInfo, setGradeInfo] = useState(null);

  const isProfileComplete = isProfileCompleteProp ?? !!(user.fatherName && user.section && user.dateOfBirth && user.profilePicture);
  const phaseOrder = activePhase?.order || 1;
  const isLocked = !hardCriteriaMet;

  useEffect(() => {
    if (phaseOrder >= 3) {
      fetchAssignments();
      fetchGrade();
    }
  }, [phaseOrder]);

  const fetchAssignments = async () => {
    try {
      const data = await apiRequest('/student/assignments');
      setAssignments(data || []);
    } catch (err) {
      console.error('Failed to load student task data:', err);
    }
  };

  const fetchGrade = async () => {
    try {
      const data = await apiRequest('/student/my-grade');
      setGradeInfo(data);
    } catch (err) {
      console.error('Failed to load student grade profile:', err);
    }
  };


  // ── Phase events for calendar ──
  const [allPhases, setAllPhases] = useState([]);
  useEffect(() => {
    const fetchPhases = () => {
      apiRequest('/phases').then(d => setAllPhases(d || [])).catch((err) => {
        console.error('Failed to load academic phases:', err);
      });
    };
    fetchPhases();
    const interval = setInterval(fetchPhases, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  // Build calendar events list (assignments + phase milestones)
  const buildCalendarEvents = (year, month) => {
    if (phaseOrder >= 4) return []; // Clear calendar events in Phase 4
    const events = [];
    // Assignment deadlines
    assignments.forEach(a => {
      const dl = new Date(a.deadline);
      if (dl.getFullYear() === year && dl.getMonth() === month) {
        events.push({ day: dl.getDate(), type: 'assignment', label: a.title, submitted: a.submissionStatus === 'Submitted' });
      }
    });
    // Phase start dates
    allPhases.forEach(p => {
      const dates = [{ d: p.startedAt, suffix: 'Start' }, { d: p.completedAt, suffix: 'End' }, { d: p.scheduledStartAt, suffix: 'Scheduled Start' }, { d: p.scheduledEndAt, suffix: 'Scheduled End' }];
      dates.forEach(({ d, suffix }) => {
        if (!d) return;
        const dt = new Date(d);
        if (dt.getFullYear() === year && dt.getMonth() === month) {
          events.push({ day: dt.getDate(), type: 'phase', label: `${p.label} · ${suffix}`, phaseStatus: p.status });
        }
      });
    });
    return events;
  };
  // ── Calendar render ──
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const total = new Date(year, month + 1, 0).getDate();
    const start = new Date(year, month, 1).getDay();
    const events = buildCalendarEvents(year, month);
    const days = [];

    for (let i = 0; i < start; i++) {
      days.push(<div key={`e-${i}`} className="h-16 md:h-24 border-b border-r border-gray-50 bg-gray-50/20" />);
    }

    for (let d = 1; d <= total; d++) {
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      const dayEvt = events.filter(e => e.day === d);

      days.push(
        <div key={d} className={`h-16 sm:h-20 md:h-24 p-1 md:p-2 border-b border-r border-gray-100 hover:bg-blue-50/20 transition-all ${isToday ? 'bg-blue-50/40' : 'bg-white'}`}>
          <span className={`text-[8px] sm:text-[10px] font-black inline-flex items-center justify-center ${isToday ? 'bg-primary text-white w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full' : 'text-gray-400'}`}>
            {d}
          </span>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {dayEvt.slice(0, 3).map((e, i) => (
              <div key={i} title={e.label}
                className={`px-1 py-0.5 rounded text-[6px] sm:text-[8px] font-bold border truncate shadow-sm cursor-default ${e.type === 'phase'
                  ? e.phaseStatus === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : e.phaseStatus === 'completed' ? 'bg-blue-50 text-blue-500 border-blue-100'
                      : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                  : e.submitted
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-rose-50 text-rose-500 border-rose-100'
                  }`}>
                <i className={`fas sm:mr-0.5 ${e.type === 'phase' ? 'fa-flag' : e.submitted ? 'fa-check' : 'fa-clock'}`} />
                <span className="hidden sm:inline">{e.label}</span>
              </div>
            ))}
            {dayEvt.length > 3 && <div className="text-[6px] text-gray-400 font-bold">+{dayEvt.length - 3}</div>}
          </div>
        </div>
      );
    }
    return days;
  };

  // ── Phase 1 view ──
  const Phase1Dashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 p-8 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">Stage 1</span>
            <span className="text-sm font-bold text-primary">Pre-internship Verification</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none mb-3">Welcome to COMSATS University Abbottabad Internship Portal</h2>
          <p className="text-gray-500 font-medium max-w-xl">
            Complete your institutional registration to proceed with the academic internship cycle.
          </p>
        </div>

        {/* Phase 2 Countdown for Phase 1 view */}
        {(() => {
            const p2 = allPhases.find(p => p.order === 2);
            if (p2?.scheduledStartAt) {
                return (
                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl shadow-inner min-w-[200px]">
                        <p className="text-[9px] font-black text-indigo-400 tracking-widest uppercase mb-2">Phase 2 Starts In</p>
                        <div className="flex items-center gap-3">
                            <CountdownDisplay targetDate={p2.scheduledStartAt} />
                            <i className="fas fa-calendar-check text-indigo-400" />
                        </div>
                    </div>
                );
            }
            if (activePhase?.scheduledEndAt) {
                return (
                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl shadow-inner min-w-[200px]">
                        <p className="text-[9px] font-black text-amber-500 tracking-widest uppercase mb-2">Registration Deadline</p>
                        <div className="flex items-center gap-3">
                            <CountdownDisplay targetDate={activePhase.scheduledEndAt} />
                            <i className="fas fa-clock text-amber-500 animate-pulse" />
                        </div>
                    </div>
                );
            }
            return null;
        })()}
      </div>

      <Phase1EligibilityBanner user={user} eligibility={eligibility} activePhase={activePhase} />

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
      <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center text-xl shadow-inner">
            <i className="fas fa-user-graduate" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-2xl font-black text-gray-800 tracking-tight truncate">
              Welcome back, {user.name?.split(' ')[0]}
            </h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-medium mt-1 uppercase tracking-wider flex flex-wrap items-center gap-x-2">
              <span className="shrink-0">{user.reg}</span>
              {user.assignedCompany && (
                <span className="flex items-center gap-2">
                  <span className="hidden sm:inline text-gray-200">|</span>
                  <span className="truncate max-w-[180px] sm:max-w-none text-gray-500 font-bold italic">{user.assignedCompany}</span>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/50 p-3 md:p-4 rounded-xl border border-gray-100/50 lg:bg-transparent lg:p-0 lg:border-0 lg:ml-auto">
          {/* Phase Countdown */}
          {activePhase?.scheduledEndAt && (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Time Remaining</span>
                    <CountdownDisplay targetDate={activePhase.scheduledEndAt} />
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center text-xs">
                    <i className="fas fa-hourglass-half animate-pulse" />
                </div>
            </div>
          )}

          <div className="text-right flex-1 lg:flex-none ml-4">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Phase Progress</p>
            <p className="text-xs md:text-sm font-black text-primary truncate max-w-[120px]">{activePhase?.label || 'Active'}</p>
            <div className="mt-2 w-full lg:w-36 bg-gray-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${(phaseOrder / 5) * 100}%` }} />
            </div>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary flex items-center justify-center text-white text-sm md:text-lg font-black shadow-lg shadow-primary/20 flex-shrink-0">
            {phaseOrder}
          </div>
        </div>
      </div>

      {/* ── Grade Summary Card ─────────────────────────────────── */}
      {gradeInfo && gradeInfo.assignmentsCount > 0 && (() => {
        const gc = gradeColor(gradeInfo.grade);
        return (
          <div className={`rounded-2xl border shadow-sm p-6 ${gc.border} ${gc.bg} overflow-hidden relative`}>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -mr-10 -mt-10" style={{ background: gc.text.replace('text-', '') }} />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-2 ${gc.text} opacity-70`}>Current Academic Grade</p>
                <div className="flex items-baseline gap-3">
                  <span className={`text-5xl font-black ${gc.text}`}>{gradeInfo.grade}</span>
                  <div>
                    <p className={`text-sm font-black ${gc.text}`}>{gradeInfo.percentage}%</p>
                    <p className="text-[10px] font-bold text-gray-500">Avg {gradeInfo.averageMarks} / 10 over {gradeInfo.assignmentsCount} week{gradeInfo.assignmentsCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-500 mt-1">Grade Points: {gradeInfo.gradePoints}</p>
              </div>
              {/* progress ring */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-white opacity-40" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6"
                      className={gc.text}
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - gradeInfo.percentage / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-black ${gc.text}`}>{gradeInfo.percentage}%</span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border bg-white/70 ${gc.text} ${gc.border}`}>
                  <i className={`fas text-[10px] ${gradeInfo.status === 'Pass' ? 'fa-check-circle' : 'fa-times-circle'}`} />
                  {gradeInfo.status === 'Pass' ? 'Passing' : 'Needs Improvement'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full-width Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Calendar toolbar */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h3 className="text-[10px] md:text-xs font-black text-gray-700 uppercase tracking-widest">Academic Calendar</h3>
            {assignments.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] md:text-[9px] font-black rounded-full border border-rose-100 uppercase tracking-wider">
                {assignments.length} Task{assignments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs font-black text-gray-700">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center cursor-pointer shadow-sm">
                <i className="fas fa-chevron-left text-[10px]" />
              </button>
              <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center cursor-pointer shadow-sm">
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
        <div className="px-4 md:px-6 py-3 bg-gray-50/30 border-t border-gray-50 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200 inline-block" /> Today
          </div>
          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded bg-rose-400 inline-block" /> Overdue / Pending
          </div>
          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" /> Completed
          </div>
        </div>
      </div>

      {/* Upcoming deadlines list */}
      {assignments.length > 0 && phaseOrder < 4 && (
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
                  <div key={i} className="px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-xs md:text-sm flex-shrink-0 ${submitted ? 'bg-emerald-50 text-emerald-500' : isOverdue ? 'bg-rose-50 text-rose-500' : 'bg-primary/5 text-primary'}`}>
                        <i className={`fas ${submitted ? 'fa-check-circle' : 'fa-clock'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-800 leading-tight truncate">{a.title}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">{a.courseTitle || 'Company Task'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 bg-gray-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
                      {submitted && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full border border-emerald-100 uppercase tracking-wider">Success</span>
                      )}
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-700">{dl.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                        <p className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${submitted ? 'text-emerald-500' : isOverdue ? 'text-rose-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {submitted ? 'Verified' : isOverdue ? 'Overdue' : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
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
