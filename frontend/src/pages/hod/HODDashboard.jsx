import React, { useState, useEffect } from 'react';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import { apiRequest } from '../../utils/api.js';
import RegistrationDetails from '../../components/management/RegistrationDetails.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const CHART_TOOLTIP_STYLE = {
  contentStyle: { borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', fontSize: 12 },
  cursor: { fill: '#f9fafb' }
};

export default function HODDashboard() {
  const [activePhase, setActivePhase] = useState(null);
  const [regStats, setRegStats] = useState(null);
  const [reqStats, setReqStats] = useState(null);
  const [comStats, setComStats] = useState(null);
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

        if (phaseData?.order >= 3) {
          const commencementData = await apiRequest('/analytics/commencement-stats');
          setComStats(commencementData);
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
      {activePhase?.order >= 1 && regStats && (
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

      {/* ── Phase 3: Internship Commences ── */}
      {activePhase?.order >= 3 && comStats && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-primary/20 p-4 md:p-8 overflow-hidden relative mb-2">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full tracking-widest uppercase">
              Phase 3 Live
            </span>
          </div>
          <div className="flex items-center gap-4 mb-6 md:mb-8 mt-4 md:mt-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-lg md:text-xl">
              <i className="fas fa-briefcase"></i>
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-gray-800">Internship Commencement Analytics</h3>
              <p className="text-[10px] md:text-sm text-gray-400 font-medium tracking-tight">Active tracking of industrial engagement and evaluation progress.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 mb-8">
            <div className="p-4 md:p-5 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="text-2xl font-black text-blue-600 mb-1">{comStats.activeInterns}</div>
              <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-tight">Active Interns</div>
            </div>
            <div className="p-4 md:p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="text-2xl font-black text-gray-800 mb-1">{comStats.totalAssignments}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Total Tasks</div>
            </div>
            <div className="p-4 md:p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
              <div className="text-2xl font-black text-indigo-600 mb-1">{comStats.totalSubmissions}</div>
              <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-tight">Submissions</div>
            </div>
            <div className="p-4 md:p-5 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="text-2xl font-black text-amber-600 mb-1">{comStats.gradedBySite}</div>
              <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest leading-tight">Site Graded</div>
            </div>
            <div className="p-4 md:p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="text-2xl font-black text-emerald-600 mb-1">{comStats.gradedByFaculty}</div>
              <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-tight">Faculty Graded</div>
            </div>
            <div className="p-4 md:p-5 bg-purple-50 rounded-2xl border border-purple-100">
              <div className="text-2xl font-black text-purple-600 mb-1">{comStats.fullyGraded}</div>
              <div className="text-[9px] font-bold text-purple-400 uppercase tracking-widest leading-tight">Fully Evaluated</div>
            </div>
            <div className="p-4 md:p-5 bg-primary/10 rounded-2xl border border-primary/20">
              <div className="text-2xl font-black text-primary mb-1">{comStats.completionRate}%</div>
              <div className="text-[9px] font-bold text-primary uppercase tracking-widest leading-tight">Grading Rate</div>
            </div>
          </div>

          {/* Progress Visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Grading Distribution</h4>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Interns', count: comStats.activeInterns },
                      { name: 'Site Graded', count: comStats.gradedBySite },
                      { name: 'Faculty Graded', count: comStats.gradedByFaculty },
                      { name: 'Complete', count: comStats.fullyGraded }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Task Engagement</h4>
              <div className="flex flex-col justify-center h-full space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Submission Rate</span>
                    <span>{comStats.totalAssignments > 0 ? ((comStats.totalSubmissions / (comStats.totalAssignments * comStats.activeInterns || 1)) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-1000"
                      style={{ width: `${comStats.totalAssignments > 0 ? Math.min(100, (comStats.totalSubmissions / (comStats.totalAssignments * comStats.activeInterns || 1)) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Evaluation Coverage</span>
                    <span>{comStats.completionRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-1000"
                      style={{ width: `${comStats.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 2: Placement & Approvals ── */}
      {activePhase?.order >= 2 && reqStats && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border-2 border-secondary/20 p-4 md:p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3">
              <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-black rounded-full tracking-widest uppercase">
                Phase 2 Data
              </span>
            </div>
            <div className="flex items-center gap-4 mb-6 md:mb-8 mt-4 md:mt-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary text-lg md:text-xl">
                <i className="fas fa-file-arrow-up"></i>
              </div>
              <div>
                <h3 className="text-base md:text-lg font-black text-gray-800">Placement Submission Monitoring</h3>
                <p className="text-[10px] md:text-sm text-gray-400 font-medium tracking-tight">Real-time oversight of student internship approval requests (AppEx-A).</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
              <div className="p-4 md:p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-2xl font-black text-gray-800 mb-1">{regStats?.total || 0}</div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Total Students</div>
              </div>
              <div className="p-4 md:p-5 bg-rose-50 rounded-2xl border border-rose-100">
                <div className="text-2xl font-black text-rose-600 mb-1">{regStats?.ineligible || 0}</div>
                <div className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-tight">Ineligible</div>
              </div>
              <div className="p-4 md:p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="text-2xl font-black text-blue-600 mb-1">{reqStats.eligible}</div>
                <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-tight">Eligible Only</div>
              </div>
              <div className="p-4 md:p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-2xl font-black text-indigo-600 mb-1">{reqStats.submitted}</div>
                <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-tight">Submitted</div>
              </div>
              <div className="p-4 md:p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="text-2xl font-black text-emerald-600 mb-1">{reqStats.approved}</div>
                <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-tight">Approved</div>
              </div>
              <div className="p-4 md:p-5 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="text-2xl font-black text-amber-600 mb-1">{reqStats.pending}</div>
                <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest leading-tight">Pending</div>
              </div>
            </div>

            {/* Placement Breakdown Graphs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-8">
              {/* Placement Type Pie Chart */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Placement Type</h4>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Self-Arranged', value: reqStats.breakdowns?.type?.self || 0 },
                          { name: 'University Assigned', value: reqStats.breakdowns?.type?.university || 0 }
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip {...CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Internship Mode Pie Chart */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Internship Mode</h4>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Onsite', value: reqStats.breakdowns?.mode?.onsite || 0 },
                          { name: 'Remote', value: reqStats.breakdowns?.mode?.remote || 0 },
                          { name: 'Hybrid', value: reqStats.breakdowns?.mode?.hybrid || 0 },
                          { name: 'Freelance', value: reqStats.breakdowns?.mode?.freelance || 0 }
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                      </Pie>
                      <Tooltip {...CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Supervisor Breakdown Bar Chart */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Supervisor Distribution</h4>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={[
                        { name: 'Faculty', count: reqStats.supervisors?.faculty || 0 },
                        { name: 'Site', count: reqStats.supervisors?.site || 0 }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip {...CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-primary rounded-full"></div>
          <h3 className="font-black text-gray-800 tracking-tight text-lg">Departmental Record Registry</h3>
        </div>
        <RegistrationDetails />
      </div>
    </div>
  );
}
