import React, { useState, useEffect } from 'react';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import { apiRequest } from '../../utils/api.js';

export default function FacultyDashboard({ user }) {
  const [activePhase, setActivePhase] = useState(undefined); // undefined = loading
  const [allPhases, setAllPhases] = useState([]);

  useEffect(() => { fetchPhase(); }, []);

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

  // Find phase 1 specifically
  const phase1 = allPhases.find(p => p.key === 'registration');
  const phase1Done = phase1?.status === 'completed';
  const isPhase1Active = activePhase?.key === 'registration';
  const noPhaseActive = activePhase === null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Supervisor Dashboard</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Academic oversight and evaluation management for assigned interns.</p>
        </div>
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

      <NoticeModal />

      {/* ── Phase 1 Waiting Banner ── */}
      {activePhase !== undefined && (isPhase1Active || noPhaseActive) && (
        <div className={`rounded-2xl border-2 overflow-hidden ${isPhase1Active ? 'border-amber-200' : 'border-gray-200'
          }`}>
          <div className={`p-6 flex items-start gap-4 ${isPhase1Active ? 'bg-amber-50' : 'bg-gray-50'
            }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isPhase1Active ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
              }`}>
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border ${isPhase1Active
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                  PHASE 1 — STUDENT REGISTRATION
                </span>
                {isPhase1Active && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-white border border-amber-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    In Progress
                  </span>
                )}
                {noPhaseActive && (
                  <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    Not Started
                  </span>
                )}
              </div>
              <h3 className={`text-base font-black ${isPhase1Active ? 'text-amber-900' : 'text-gray-600'}`}>
                {isPhase1Active
                  ? 'Student Registration Phase is Currently Underway'
                  : 'Internship Cycle Has Not Started Yet'}
              </h3>
              <p className={`text-sm mt-1 ${isPhase1Active ? 'text-amber-700' : 'text-gray-400'}`}>
                {isPhase1Active
                  ? 'The Internship Office is onboarding eligible students. Your supervisor dashboard will activate once students are assigned to you after Phase 6.'
                  : 'The Internship Office has not initiated any phase yet. You will be notified when a cycle begins.'}
              </p>
            </div>
          </div>

          {/* Phase progression preview */}
          {isPhase1Active && allPhases.length > 0 && (
            <div className="bg-white border-t border-amber-100 p-4 px-6">
              <p className="text-[10px] font-black text-gray-400 tracking-widest mb-3">UPCOMING PHASES</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allPhases.map((p, idx) => (
                  <div key={p._id} className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-center min-w-[90px] ${p.status === 'active' ? 'bg-amber-50 border-amber-200' :
                      p.status === 'completed' ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-100'
                    }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${p.status === 'active' ? 'bg-amber-400 text-white' :
                        p.status === 'completed' ? 'bg-blue-500 text-white' :
                          'bg-gray-200 text-gray-500'
                      }`}>
                      {p.status === 'completed' ? <i className="fas fa-check text-[8px]"></i> : p.order}
                    </div>
                    <span className={`text-[9px] font-bold leading-tight ${p.status === 'active' ? 'text-amber-700' : p.status === 'completed' ? 'text-blue-600' : 'text-gray-400'
                      }`}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <StatsGrid stats={[
        { icon: 'fa-users', cls: 'blue', val: 'Active', label: 'Assigned Students' },
        { icon: 'fa-file-lines', cls: 'green', val: 'Ready', label: 'Assignments Reviewed' },
        { icon: 'fa-clipboard-list', cls: 'yellow', val: 'Pending', label: 'Evaluations' },
        { icon: 'fa-award', cls: 'purple', val: 'Track', label: 'Results' },
      ]} />
    </div>
  );
}
