import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { apiRequest } from '../../utils/api.js';

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

export default function FacultyDashboard({ user, activePhase: propPhase }) {
  const [activePhase, setActivePhase] = useState(propPhase || undefined); // use prop or fallback
  const [allPhases, setAllPhases] = useState([]);
  const [stats, setStats] = useState({ assignedStudents: 0, pendingRequests: 0 });
  const [interns, setInterns] = useState([]);
  const [selectedInternId, setSelectedInternId] = useState('');
  const navigate = useNavigate();

  const isSupervisorPortal = user.role === 'site_supervisor';
  const basePath = isSupervisorPortal ? '/supervisor' : '/faculty';
  const studentPath = isSupervisorPortal ? 'interns' : 'students';
  const requestPath = 'requests';

  useEffect(() => {
    if (!propPhase) fetchPhase();
    else fetchAllPhases();
    fetchStats();
    if (isSupervisorPortal) fetchInterns();
  }, [propPhase]);

  const fetchInterns = async () => {
    try {
      const data = await apiRequest('/supervisor/interns');
      setInterns(data);
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  const fetchStats = async () => {
    try {
      const endpoint = isSupervisorPortal ? '/supervisor/profile' : '/faculty/stats';
      const data = await apiRequest(endpoint);
      if (isSupervisorPortal) {
        setStats({
          assignedStudents: data.stats?.studentCount || 0,
          pendingRequests: 0 // Site supervisors don't have "requests" in the same way yet
        });
      } else {
        setStats(data);
      }
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  const fetchPhase = async () => {
    try {
      const [current, phases] = await Promise.all([
        apiRequest('/phases/current'),
        apiRequest('/phases')
      ]);
      setActivePhase(current);
      setAllPhases(phases);
    } catch (err) {
      setActivePhase(null);
    }
  };

  const fetchAllPhases = async () => {
    try {
      const phases = await apiRequest('/phases');
      setAllPhases(phases);
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  // Lock logic: Full dashboard activates after Phase 2 (order >= 3)
  const isLocked = activePhase !== undefined && (!activePhase || activePhase.order < 3);
  const isPhase1Active = activePhase?.key === 'registration';
  const isPhase4 = activePhase?.order >= 4;
  const noPhaseActive = activePhase === null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">
            {isSupervisorPortal ? 'Industrial Mentor Dashboard' : 'Academic Supervisor Dashboard'}
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {isSupervisorPortal
              ? 'Institutional partnership and industrial mentorship management.'
              : 'Academic oversight and evaluation management for assigned interns.'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {activePhase?.scheduledEndAt && !isPhase4 && (
            <div className="hidden sm:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Next Phase In</span>
                    <CountdownDisplay targetDate={activePhase.scheduledEndAt} />
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center text-xs">
                    <i className="fas fa-hourglass-half animate-pulse" />
                </div>
            </div>
          )}

          {activePhase !== undefined && activePhase && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <div>
                <p className="text-[9px] font-black text-blue-400 tracking-widest">ACTIVE PHASE</p>
                <p className="text-xs font-black text-blue-800">{activePhase.label}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NoticeModal />

      {/* ── Quick Access Actions ── */}
      {!isSupervisorPortal ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onClick={() => navigate(`${basePath}/${requestPath}`)}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                <i className="fas fa-user-pen"></i>
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-800">Supervision Requests</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Manage new student invitations</p>
              </div>
            </div>
            <i className="fas fa-arrow-right text-gray-200 group-hover:text-emerald-500 transition-colors"></i>
          </div>

          <div
            onClick={() => navigate(`${basePath}/${studentPath}`)}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                <i className="fas fa-users"></i>
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-800">My Assigned Interns</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">View registry and student profiles</p>
              </div>
            </div>
            <i className="fas fa-arrow-right text-gray-200 group-hover:text-indigo-500 transition-colors"></i>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center text-base">
                <i className="fas fa-users-viewfinder"></i>
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-800">Integrated Intern Registry</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Select a student to view their profile</p>
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <select
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-black text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              >
                <option value="">Select Student Intern...</option>
                {interns.map(intern => (
                  <option key={intern._id} value={intern._id}>{intern.name} ({intern.reg})</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <i className="fas fa-chevron-down text-[10px]"></i>
              </div>
            </div>
          </div>

          {selectedInternId && (
            <div className="border-t border-gray-50 pt-6 animate-in fade-in slide-in-from-top-2">
              {(() => {
                const intern = interns.find(i => i._id === selectedInternId);
                if (!intern) return null;
                return (
                  <div className="flex items-center justify-between flex-wrap gap-4 p-5 bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl border border-indigo-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      {intern.profilePicture ? (
                        <img src={intern.profilePicture} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-white" />
                      ) : (
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-400 shadow-sm border border-indigo-100/50">
                          <i className="fas fa-user-graduate text-xl"></i>
                        </div>
                      )}
                      <div>
                        <h5 className="text-base font-black text-gray-800 leading-tight">{intern.name}</h5>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{intern.reg}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block text-right mr-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Enrollment Status</p>
                        <p className="text-xs font-black text-gray-700">{intern.status}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/supervisor/grading?studentId=${intern._id}`)}
                        className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 border-0 cursor-pointer flex items-center gap-2"
                      >
                        Grade Student <i className="fas fa-star text-[8px]"></i>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Waiting Banner ── */}
      {isLocked && (
        <div className={`rounded-3xl border-2 overflow-hidden transition-all duration-500 ${!noPhaseActive ? 'border-amber-200 shadow-xl shadow-amber-900/5' : 'border-gray-200'}`}>
          <div className={`p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 ${!noPhaseActive ? 'bg-amber-50/50' : 'bg-gray-50'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl shadow-inner ${!noPhaseActive ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
              <i className="fas fa-hourglass-half animate-pulse"></i>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                <span className={`text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded-full border ${!noPhaseActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {activePhase?.label?.toUpperCase() || 'PHASE 1 — STUDENT REGISTRATION'}
                </span>
                {!noPhaseActive && (
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-white border border-amber-200 px-3 py-1 rounded-full shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    IN PROGRESS
                  </span>
                )}
              </div>
              <h3 className={`text-xl md:text-2xl font-black tracking-tight ${!noPhaseActive ? 'text-amber-900' : 'text-gray-600'}`}>
                {!noPhaseActive ? `${activePhase.label} Phase is Currently Underway` : 'Internship Cycle Has Not Started Yet'}
              </h3>
              <p className={`text-sm mt-2 font-medium leading-relaxed max-w-2xl ${!noPhaseActive ? 'text-amber-700/80' : 'text-gray-400'}`}>
                {!noPhaseActive
                  ? 'The Internship Office is currently onboarding eligible students. Your specialized supervisor dashboard, grading tools, and student registries will activate as soon as the placement process completes.'
                  : 'The Internship Office has not initiated the current academic cycle. All faculty modules are disabled until the registration phase begins.'}
              </p>
            </div>
          </div>

          {/* Phase progression preview */}
          {!noPhaseActive && allPhases.length > 0 && (
            <div className="bg-white border-t border-amber-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-[2px] w-6 bg-amber-200 rounded-full"></div>
                <p className="text-[10px] font-black text-gray-400 tracking-[0.3em] uppercase">Upcoming Cycle Milestones</p>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                {allPhases.map((p, idx) => (
                  <div key={p._id} className={`flex-shrink-0 flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all min-w-[130px] ${p.status === 'active' ? 'bg-amber-50 border-amber-200 shadow-sm scale-105 ring-4 ring-amber-50' :
                    p.status === 'completed' ? 'bg-blue-50 border-blue-200 opacity-60' : 'bg-gray-50 border-gray-100 opacity-40'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${p.status === 'active' ? 'bg-amber-400 text-white' :
                      p.status === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {p.status === 'completed' ? <i className="fas fa-check text-[8px]"></i> : p.order}
                    </div>
                    <span className={`text-[10px] font-black tracking-tight leading-tight text-center ${p.status === 'active' ? 'text-amber-800' : p.status === 'completed' ? 'text-blue-700' : 'text-gray-400'}`}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 3: Internship Commences ── */}
      {(!isLocked && activePhase?.order >= 3) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grading Card - Only for Faculty */}
          {!isSupervisorPortal && (
            <div
              onClick={() => navigate(`${basePath}/add-marks`)}
              className="p-8 rounded-[2.5rem] border-2 bg-white border-rose-50 hover:border-rose-500 hover:shadow-2xl hover:shadow-rose-100 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl group-hover:bg-rose-500 group-hover:text-white transition-all shadow-inner">
                  <i className="fas fa-award"></i>
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-800 tracking-tight">{activePhase?.order >= 4 ? 'Acquired Marks' : 'Grading & Marks'}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{activePhase?.order >= 4 ? 'Student Records Ledger' : 'Evaluation Portal'}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">Review student submissions and award marks based on their performance.</p>
              <div className="text-xs font-black text-rose-500 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                {activePhase?.order >= 4 ? 'View Final Registry' : 'Go to Grading Sheet'} <i className="fas fa-arrow-right text-[10px]"></i>
              </div>
            </div>
          )}

          {/* Monitoring/Evaluation Card - Both, but different routes/labels */}
          <div
            onClick={() => navigate(`${basePath}/${isSupervisorPortal ? 'evaluations' : 'evaluation'}`)}
            className="p-8 rounded-[2.5rem] border-2 bg-white border-emerald-50 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-100 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-800 tracking-tight">{isPhase4 ? 'Performance Summary' : (isSupervisorPortal ? 'Intern Progress' : 'Internal Evaluation')}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{isPhase4 ? 'Consolidated Results' : 'Monitoring Centre'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">{isSupervisorPortal ? 'Evaluate student performance and professional conduct within your company.' : 'Assess student technical skills and draft final institutional evaluations.'}</p>
            <div className="text-xs font-black text-emerald-500 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
              Perform Evaluation <i className="fas fa-arrow-right text-[10px]"></i>
            </div>
          </div>

        </div>
      )}

      {!isLocked && (
        <div className="opacity-60 transition-opacity hover:opacity-100">
          <StatsGrid stats={[
            { icon: 'fa-users', cls: 'blue', val: stats.assignedStudents, label: 'Assigned Students' },
            ...(!isSupervisorPortal ? [
              { icon: 'fa-user-pen', cls: 'emerald', val: stats.pendingRequests, label: 'Pending Requests' }
            ] : []),
            { icon: 'fa-file-lines', cls: 'green', val: 'Ready', label: 'Assignments' },
            { icon: 'fa-clipboard-list', cls: 'yellow', val: 'Track', label: 'Evaluations' },
          ]} />
        </div>
      )}


    </div>
  );
}
