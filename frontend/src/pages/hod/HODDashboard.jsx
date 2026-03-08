import React, { useState, useEffect } from 'react';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { StatsGrid } from '../../components/ui/StatCard.jsx';
import { apiRequest } from '../../utils/api.js';
import RegistrationDetails from '../../components/management/RegistrationDetails.jsx';

export default function HODDashboard() {
  const [activePhase, setActivePhase] = useState(null);
  const [regStats, setRegStats] = useState(null);
  const [reqStats, setReqStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [phaseData, statsData] = await Promise.all([
          apiRequest('/phases/current'),
          apiRequest('/analytics/registration-stats')
        ]);
        setActivePhase(phaseData);
        setRegStats(statsData);

        if (phaseData?.order >= 2) {
          const requestData = await apiRequest('/analytics/request-stats');
          setReqStats(requestData);
        }
      } catch (error) {
        console.error('HOD Dashboard Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">HOD Oversight Dashboard</h2>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">Final approval and quality assurance of internship evaluations (CS Dept).</p>
        </div>
      </div>

      {/* ── Phase 1: Registration Status ── */}
      {activePhase?.key === 'registration' && regStats && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-primary/20 p-4 md:p-8 overflow-hidden relative mb-2">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full tracking-widest uppercase">
              Phase 1 Active
            </span>
          </div>
          <div className="flex items-center gap-4 mb-6 md:mb-8 mt-4 md:mt-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-lg md:text-xl">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-gray-800">Student Onboarding Analytics</h3>
              <p className="text-[10px] md:text-sm text-gray-400 font-medium tracking-tight">Departmental breakdown of registration and eligibility metrics.</p>
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
              <div className="text-[9px] md:text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-tight">Ineligible</div>
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

      {/* ── Phase 2: Internship Request Stats ── */}
      {activePhase?.key === 'request_submission' && reqStats && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-secondary/20 p-4 md:p-8 overflow-hidden relative mb-6">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-black rounded-full tracking-widest uppercase">
              Phase 2 Active
            </span>
          </div>
          <div className="flex items-center gap-4 mb-6 md:mb-8 mt-4 md:mt-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary text-lg md:text-xl">
              <i className="fas fa-file-arrow-up"></i>
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-gray-800">Departmental Submission Monitoring</h3>
              <p className="text-[10px] md:text-sm text-gray-400 font-medium tracking-tight">Real-time oversight of student internship approval requests (AppEx-A).</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="p-4 md:p-5 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="text-2xl font-black text-blue-600 mb-1">{reqStats.eligible}</div>
              <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-tight">Eligible Count</div>
            </div>
            <div className="p-4 md:p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
              <div className="text-2xl font-black text-indigo-600 mb-1">{reqStats.submitted}</div>
              <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-tight">AppEx-A Received</div>
            </div>
            <div className="p-4 md:p-5 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="text-2xl font-black text-amber-600 mb-1">{reqStats.pending}</div>
              <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest leading-tight">Pending Submission</div>
            </div>
            <div className="p-4 md:p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="text-2xl font-black text-emerald-600 mb-1">{reqStats.approved}</div>
              <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-tight">Verified Approvals</div>
            </div>
            <div className="p-4 md:p-5 bg-gray-900 rounded-2xl border border-gray-800 text-white">
              <div className="text-2xl font-black mb-1">{reqStats.completionRate}%</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Phase Progress</div>
            </div>
          </div>
        </div>
      )}

      {activePhase?.key === 'registration' && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h3 className="font-black text-gray-800 tracking-tight text-lg">Detailed Registration Records</h3>
          </div>
          <RegistrationDetails />
        </div>
      )}

      {activePhase?.key !== 'registration' && (
        <StatsGrid stats={[
          { icon: 'fa-hourglass-half', cls: 'yellow', val: '2', label: 'Pending Approvals' },
          { icon: 'fa-circle-check', cls: 'green', val: '31', label: 'Approved Results' },
          { icon: 'fa-rotate-left', cls: 'red', val: '1', label: 'Returned' },
          { icon: 'fa-lock', cls: 'blue', val: '28', label: 'Locked & Published' },
        ]} />
      )}
    </div>
  );
}
