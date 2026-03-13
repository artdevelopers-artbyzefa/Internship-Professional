import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import RegistrationDetails from '../../components/management/RegistrationDetails.jsx';

export default function OfficeDashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [regStats, setRegStats] = useState(null);
  const [reqStats, setReqStats] = useState(null);
  const [activePhase, setActivePhase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumData, statsData, phaseData] = await Promise.all([
          apiRequest('/analytics/summary'),
          apiRequest('/analytics/registration-stats'),
          apiRequest('/phases/current')
        ]);
        setSummary(sumData);
        setRegStats(statsData);
        setActivePhase(phaseData);

        // Fetch phase-specific stats if moving to Phase 2
        if (phaseData?.key === 'placement_process' || phaseData?.order >= 2) {
          const reqData = await apiRequest('/analytics/request-stats');
          setReqStats(reqData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const stats = [
    { label: 'Completed Internships', count: summary?.completedInternships || 0, icon: 'fa-check-circle', color: 'bg-emerald-500' },
    { label: 'Partner Companies', count: summary?.activeCompanies || 0, icon: 'fa-building', color: 'bg-blue-500' },
    { label: 'Active Interns', count: summary?.totalStudents || 0, icon: 'fa-users', color: 'bg-indigo-500' },
    { label: 'Faculty Active', count: summary?.facultyCount || 0, icon: 'fa-user-tie', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Institutional Portal Control</h2>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">Global oversight of internship workflows, requests, and academic evaluations.</p>
        </div>
      </div>

      {/* ── Phase 1: Registration Stats ── */}
      {activePhase?.order >= 1 && regStats && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-primary/20 p-4 md:p-8 overflow-hidden relative mb-6">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full tracking-widest uppercase">
              Phase: Registration
            </span>
          </div>
          <div className="flex items-center gap-4 mb-6 md:mb-8 mt-4 md:mt-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-lg md:text-xl">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-gray-800">Registration Onboarding Status</h3>
              <p className="text-[10px] md:text-sm text-gray-400 font-medium tracking-tight">Real-time statistics for current cycle registration.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="p-4 md:p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center lg:text-left">
              <div className="text-2xl md:text-3xl font-black text-gray-800 mb-1">{regStats.total}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Total Students</div>
            </div>
            <div className="p-4 md:p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center lg:text-left">
              <div className="text-2xl md:text-3xl font-black text-emerald-600 mb-1">{regStats.eligible}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-tight">Eligible</div>
            </div>
            <div className="p-4 md:p-5 bg-rose-50 rounded-2xl border border-rose-100 text-center lg:text-left">
              <div className="text-2xl md:text-3xl font-black text-rose-600 mb-1">{regStats.ineligible}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-tight">Ineligible Status</div>
            </div>
            <div className="p-4 md:p-5 bg-indigo-50 rounded-2xl border border-indigo-100 text-center lg:text-left">
              <div className="text-2xl md:text-3xl font-black text-indigo-600 mb-1">{regStats.facultyCount}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-tight">Faculty</div>
            </div>
            <div className="p-4 md:p-5 bg-amber-50 rounded-2xl border border-amber-100 text-center lg:text-left col-span-2 lg:col-span-1">
              <div className="text-2xl md:text-3xl font-black text-amber-600 mb-1">{regStats.siteSupervisorCount}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-tight">Site Supervisors</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 2: Placement & Approvals ── */}
      {activePhase?.order >= 2 && reqStats && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-secondary/20 p-4 md:p-8 overflow-hidden relative mb-6">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-black rounded-full tracking-widest uppercase">
              Placement Activity
            </span>
          </div>
          <div className="flex items-center gap-4 mb-6 md:mb-8 mt-4 md:mt-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary text-lg md:text-xl">
              <i className="fas fa-file-arrow-up"></i>
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-gray-800">Student Submission Tracking</h3>
              <p className="text-[10px] md:text-sm text-gray-400 font-medium tracking-tight">Monitoring internship preferences (AppEx-A) for eligible students.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="p-4 md:p-5 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="text-2xl md:text-3xl font-black text-blue-600 mb-1">{reqStats.eligible}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-tight">Eligible Count</div>
            </div>
            <div className="p-4 md:p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
              <div className="text-2xl md:text-3xl font-black text-indigo-600 mb-1">{reqStats.submitted}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-tight">Received AppEx-A</div>
            </div>
            <div className="p-4 md:p-5 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="text-2xl md:text-3xl font-black text-amber-600 mb-1">{reqStats.pending}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-tight">Unsubmitted</div>
            </div>
            <div className="p-4 md:p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="text-2xl md:text-3xl font-black text-emerald-600 mb-1">{reqStats.approved}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-tight">OFFICIALLY Approved</div>
            </div>

          </div>
        </div>
      )}

      {activePhase?.order >= 1 && (
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h3 className="font-black text-gray-800 tracking-tight text-lg px-2">Detailed Registration Records</h3>
          </div>
          <RegistrationDetails />
        </div>
      )}

      {activePhase?.key !== 'registration' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}>
                <i className={`fas ${s.icon}`}></i>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-800">{s.count}</div>
                <div className="text-xs font-medium text-gray-400 tracking-wider uppercase">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center text-xl md:text-2xl text-gray-400 overflow-hidden border-2 border-primary/10">
            <i className="fas fa-user"></i>
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-xs md:text-sm text-gray-400">Internship Office Admin • {user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-widest">Designation</div>
            <div className="text-sm font-medium">Internship Officer</div>
          </div>
          <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/10">
            <div className="text-[10px] font-bold text-secondary mb-1 uppercase tracking-widest">Campus</div>
            <div className="text-sm font-medium">CUI Abbottabad</div>
          </div>
        </div>
      </div>
    </div>
  );
}
