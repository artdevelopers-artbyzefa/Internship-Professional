import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import NoticeItem from '../../components/notice/NoticeItem.jsx';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { apiRequest } from '../../utils/api.js';

export default function FacultyDashboard({ user, activePhase: propPhase }) {
  const [activePhase, setActivePhase] = useState(propPhase || undefined); // use prop or fallback
  const [allPhases, setAllPhases] = useState([]);
  const [notices, setNotices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (!propPhase) fetchPhase();
    else fetchAllPhases();
    fetchNotices();
    fetchRequests();
  }, [propPhase]);

  const fetchNotices = async () => {
    try {
      const data = await apiRequest('/notices/my');
      setNotices(data);
    } catch (err) {
      console.error('Failed to fetch notices:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const data = await apiRequest('/faculty/pending-requests');
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRequest = async (studentId, action) => {
    try {
      await apiRequest('/faculty/handle-request', {
        method: 'POST',
        body: { studentId, action }
      });
      // Success: Refetch and inform
      fetchRequests();
    } catch (err) {
      alert(err.message);
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
    } catch (err) { }
  };

  // Lock logic: Full dashboard activates after Phase 6 (order >= 7)
  const isLocked = activePhase !== undefined && (!activePhase || activePhase.order < 7);
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

      {/* ── Pending Supervision Invitations Section ── */}
      {(requests.length > 0 || (activePhase?.order >= 2 && activePhase?.order <= 6)) && (
        <Card title="Pending Supervision Requests" icon="fa-user-pen" className="border-l-4 border-l-emerald-500 bg-emerald-50/10">
          <div className="p-1 px-2 border border-emerald-100 bg-emerald-50 rounded-lg inline-flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Action Required: First Come First Serve Queue</span>
          </div>

          {requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {requests.map(request => (
                <div key={request._id} className="bg-white p-6 rounded-2xl border-2 border-emerald-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-sm font-black text-gray-800">{request.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{request.reg}</p>
                    </div>
                    <div className="text-[9px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      {new Date(request.internshipRequest.submittedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                      <i className="fas fa-building w-4 text-emerald-500"></i>
                      {request.internshipRequest.companyName}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                      <i className="fas fa-briefcase w-4 text-emerald-500"></i>
                      {request.internshipRequest.type} — {request.internshipRequest.mode}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleRequest(request._id, 'Accepted')}
                      className="py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRequest(request._id, 'Rejected')}
                      className="py-2.5 rounded-xl border-2 border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 italic text-sm bg-white/50 rounded-2xl border border-dashed border-gray-100">
              <i className="fas fa-user-clock text-2xl mb-3 block opacity-20"></i>
              No pending supervision invitations in your current queue.
            </div>
          )}
        </Card>
      )}

      {/* ── Waiting Banner ── */}
      {isLocked && (
        <div className={`rounded-2xl border-2 overflow-hidden ${!noPhaseActive ? 'border-amber-200' : 'border-gray-200'}`}>
          <div className={`p-6 flex items-start gap-4 ${!noPhaseActive ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${!noPhaseActive ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border ${!noPhaseActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {activePhase?.label?.toUpperCase() || 'PHASE 1 — STUDENT REGISTRATION'}
                </span>
                {!noPhaseActive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-white border border-amber-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    In Progress
                  </span>
                )}
              </div>
              <h3 className={`text-base font-black ${!noPhaseActive ? 'text-amber-900' : 'text-gray-600'}`}>
                {!noPhaseActive ? `${activePhase.label} Phase is Currently Underway` : 'Internship Cycle Has Not Started Yet'}
              </h3>
              <p className={`text-sm mt-1 ${!noPhaseActive ? 'text-amber-700' : 'text-gray-400'}`}>
                {!noPhaseActive
                  ? 'The Internship Office is onboarding eligible students. Your supervisor dashboard will activate once students are assigned to you after Phase 6.'
                  : 'The Internship Office has not initiated any phase yet. You will be notified when a cycle begins.'}
              </p>
            </div>
          </div>

          {/* Phase progression preview */}
          {!noPhaseActive && allPhases.length > 0 && (
            <div className="bg-white border-t border-amber-100 p-4 px-6">
              <p className="text-[10px] font-black text-gray-400 tracking-widest mb-3">UPCOMING PHASES</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allPhases.map((p, idx) => (
                  <div key={p._id} className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-center min-w-[90px] ${p.status === 'active' ? 'bg-amber-50 border-amber-200' :
                    p.status === 'completed' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${p.status === 'active' ? 'bg-amber-400 text-white' :
                      p.status === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {p.status === 'completed' ? <i className="fas fa-check text-[8px]"></i> : p.order}
                    </div>
                    <span className={`text-[9px] font-bold leading-tight ${p.status === 'active' ? 'text-amber-700' : p.status === 'completed' ? 'text-blue-600' : 'text-gray-400'}`}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLocked && (
        <StatsGrid stats={[
          { icon: 'fa-users', cls: 'blue', val: 'Active', label: 'Assigned Students' },
          { icon: 'fa-file-lines', cls: 'green', val: 'Ready', label: 'Assignments Reviewed' },
          { icon: 'fa-clipboard-list', cls: 'yellow', val: 'Pending', label: 'Evaluations' },
          { icon: 'fa-award', cls: 'purple', val: 'Track', label: 'Results' },
        ]} />
      )}

      {/* ── Announcements Section (Always Visible) ── */}
      <Card title="Updates from Internship Office" icon="fa-bullhorn" className="border-l-4 border-l-blue-500">
        {notices.length > 0 ? (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {notices.map(notice => (
              <NoticeItem key={notice._id} notice={notice} />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-400 italic text-sm">
            <i className="fas fa-comment-slash text-2xl mb-3 block opacity-20"></i>
            No recent updates from the Internship Office.
          </div>
        )}
      </Card>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

