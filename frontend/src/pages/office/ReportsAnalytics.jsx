import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { apiRequest } from '../../utils/api.js';

// ─────────────── CONSTANTS ───────────────
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const CHART_TOOLTIP_STYLE = {
  contentStyle: { borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', fontSize: 12 },
  cursor: { fill: '#f9fafb' }
};

// ─────────────── UTILITY ───────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-800 tracking-tight">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon = 'fa-chart-bar', msg = 'No data available for this report.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
      <i className={`fas ${icon} text-5xl mb-4`}></i>
      <p className="text-sm font-bold text-gray-400">{msg}</p>
    </div>
  );
}

function StatsBox({ label, value, color = 'text-primary' }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i>
    </div>
  );
}

// ─────────────── MAIN COMPONENT ───────────────
export default function ReportsAnalytics() {
  // Global Analytics State
  const [summary, setSummary] = useState(null);
  const [completionData, setCompletionData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [companyData, setCompanyData] = useState([]);
  const [criteriaData, setCriteriaData] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [globalFilter, setGlobalFilter] = useState({ semester: 'All', program: 'All' });

  // Report Module State
  const [reportType, setReportType] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('all');
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Session / Program / Type analysis
  const [sessionData, setSessionData] = useState([]);
  const [typeData, setTypeData] = useState({ byMode: [], byType: [] });
  const [programData, setProgramData] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // ── Fetch global analytics dashboard ──
  useEffect(() => {
    const fetchGlobal = async () => {
      try {
        setLoadingGlobal(true);
        const params = new URLSearchParams(globalFilter).toString();
        const [sum, comp, evalComp, crit, compDist] = await Promise.all([
          apiRequest(`/analytics/summary?${params}`),
          apiRequest(`/analytics/completion-analysis?${params}`),
          apiRequest(`/analytics/evaluation-comparison?${params}`),
          apiRequest(`/analytics/criteria-performance?${params}`),
          apiRequest(`/analytics/company-distribution?${params}`),
        ]);
        setSummary(sum);
        setCompletionData(comp);
        setComparisonData(evalComp);
        setCriteriaData(crit);
        setCompanyData(compDist);
      } catch (err) {
        // Error handled by apiRequest
      } finally {
        setLoadingGlobal(false);
      }
    };
    fetchGlobal();
  }, [globalFilter]);

  // ── Fetch supervisors list whenever needed ──
  useEffect(() => {
    if (reportType === 'results' || reportType === 'assigned-students') {
      apiRequest('/analytics/report/supervisors')
        .then(data => setSupervisors(data || []))
        .catch(() => setSupervisors([]));
    }
  }, [reportType]);

  // ── Fetch analysis charts (session / type / program) ──
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoadingAnalysis(true);
        const [sessions, types, prog] = await Promise.all([
          apiRequest('/analytics/report/session-analysis'),
          apiRequest('/analytics/report/internship-type'),
          apiRequest('/analytics/completion-analysis?program=All&semester=All'),
        ]);
        setSessionData(sessions || []);
        setTypeData(types || { byMode: [], byType: [] });
        // Reuse completion-analysis but aggregate by program
        const byProgram = {};
        (prog || []).forEach(p => {
          if (!byProgram[p.program]) byProgram[p.program] = { program: p.program, total: 0, completed: 0 };
          byProgram[p.program].total += p.total;
          byProgram[p.program].completed += p.completed;
        });
        setProgramData(Object.values(byProgram));
      } catch (err) {
        // Error handled by apiRequest
      } finally {
        setLoadingAnalysis(false);
      }
    };
    fetchAnalysis();
  }, []);

  // ── Generate report ──
  const generateReport = useCallback(async () => {
    if (!reportType) return;
    setLoadingReport(true);
    setReportData(null);
    try {
      if (reportType === 'results') {
        const data = await apiRequest(`/analytics/report/results-by-supervisor?supervisorId=${selectedSupervisor}`);
        setReportData({ type: 'results', assignments: data });
      } else if (reportType === 'assigned-students') {
        const data = await apiRequest(`/analytics/report/assigned-students?supervisorId=${selectedSupervisor}`);
        setReportData({ type: 'assigned-students', students: data });
      } else if (reportType === 'supervisors') {
        const data = await apiRequest('/analytics/report/supervisors');
        setReportData({ type: 'supervisors', supervisors: data });
      }
    } catch (err) {
      // Error handled by apiRequest
    } finally {
      setLoadingReport(false);
    }
  }, [reportType, selectedSupervisor]);

  return (
    <div className="space-y-8 pb-12">

      {/* ── Page Header ── */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Data-driven internship insights, flexible report generation, and performance analytics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
            <i className="fas fa-calendar text-gray-400 text-sm"></i>
            <select
              className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer"
              value={globalFilter.semester}
              onChange={e => setGlobalFilter(f => ({...f, semester: e.target.value}))}
            >
              <option value="All">All Semesters</option>
              {['1','2','3','4','5','6','7','8'].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
            <i className="fas fa-graduation-cap text-gray-400 text-sm"></i>
            <select
              className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer"
              value={globalFilter.program}
              onChange={e => setGlobalFilter(f => ({...f, program: e.target.value}))}
            >
              <option value="All">All Programs</option>
              <option value="BCS">BCS</option>
              <option value="BSE">BSE</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      {loadingGlobal ? <LoadingSpinner /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', value: summary?.totalStudents ?? '—', icon: 'fa-users', color: 'bg-blue-500' },
            { label: 'Completed Internships', value: summary?.completedInternships ?? '—', icon: 'fa-circle-check', color: 'bg-emerald-500' },
            { label: 'Partner Companies', value: summary?.activeCompanies ?? '—', icon: 'fa-building', color: 'bg-amber-500' },
            { label: 'Avg Score', value: summary?.avgScore ? `${summary.avgScore}%` : '—', icon: 'fa-award', color: 'bg-purple-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`w-12 h-12 ${s.color} rounded-2xl flex items-center justify-center text-white flex-shrink-0`}>
                <i className={`fas ${s.icon} text-lg`}></i>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-800">{s.value}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts Row 1: Completion + Evaluation ── */}
      {!loadingGlobal && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Analysis */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <SectionHeader title="Completion Analysis" subtitle="Program-wise internship enrollment vs completion" />
            {completionData.length === 0 ? <EmptyState /> : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completionData} {...CHART_TOOLTIP_STYLE}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="program" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Legend iconType="circle" />
                    <Bar dataKey="total" name="Enrolled" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Evaluation Comparison */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <SectionHeader title="Faculty Score Distribution" subtitle="Marks submitted by supervisors across all assignments" />
            {comparisonData.length === 0 ? <EmptyState /> : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData.slice(0, 12)} {...CHART_TOOLTIP_STYLE}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="reg" hide />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar dataKey="facultyScore" name="Faculty Score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="siteScore" name="Simulated Site Score" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Charts Row 2: Session + Program + Internship Type ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Session-wise Analysis */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <SectionHeader title="Admission Session Analysis" subtitle="FA/SP session-wise student distribution" />
          {loadingAnalysis ? <LoadingSpinner /> : sessionData.length === 0 ? <EmptyState icon="fa-calendar" msg="No session data found." /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="session" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" />
                  <Bar dataKey="total" name="Total" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Program-wise Pie */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <SectionHeader title="Program Distribution" subtitle="BCS vs BSE student breakdown" />
          {loadingAnalysis ? <LoadingSpinner /> : programData.length === 0 ? <EmptyState icon="fa-graduation-cap" msg="No program data available." /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={programData} dataKey="total" nameKey="program" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={5}>
                    {programData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Internship Mode/Type Pie */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <SectionHeader title="Internship Mode Analysis" subtitle="Onsite / Remote / Hybrid / Freelance" />
          {loadingAnalysis ? <LoadingSpinner /> : typeData.byMode.length === 0 ? <EmptyState icon="fa-map-pin" msg="No mode data. Ensure students have submitted internship requests." /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData.byMode} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={4}>
                    {typeData.byMode.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row 3: Company + Competency Radar ── */}
      {!loadingGlobal && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <SectionHeader title="Placement Ecosystem" subtitle="Top hosting companies by student count" />
            {companyData.length === 0 ? <EmptyState icon="fa-building" msg="No company placement data yet." /> : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} width={120} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="value" name="Students" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Student Competency Radar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <SectionHeader title="Student Competency Matrix" subtitle="Average performance across evaluation criteria" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={criteriaData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Avg Performance" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-center text-gray-400 mt-2 font-medium italic">Aggregated faculty evaluation criteria scores</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/*           REPORT GENERATION MODULE         */}
      {/* ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">Generate Custom Report</h3>
          <p className="text-sm text-gray-500 mt-0.5">Select a report type and configure filters to generate an on-demand report.</p>
        </div>

        {/* Report Selector Controls */}
        <div className="flex flex-wrap items-end gap-4 mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
          {/* Report Type */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 mb-2">SELECT REPORT</label>
            <select
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={reportType}
              onChange={e => { setReportType(e.target.value); setReportData(null); setSelectedSupervisor('all'); }}
            >
              <option value="">— Choose Report Type —</option>
              <option value="results">Results Report (by Supervisor)</option>
              <option value="assigned-students">Assigned Students Report</option>
              <option value="supervisors">Supervisors Overview Report</option>
            </select>
          </div>

          {/* Supervisor Filter (conditional) */}
          {(reportType === 'results' || reportType === 'assigned-students') && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-black tracking-widest text-gray-400 mb-2">SELECT SUPERVISOR</label>
              <select
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={selectedSupervisor}
                onChange={e => setSelectedSupervisor(e.target.value)}
              >
                <option value="all">All Supervisors</option>
                {supervisors.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.studentCount} students)</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={generateReport}
            disabled={!reportType || loadingReport}
            className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingReport
              ? <><i className="fas fa-circle-notch fa-spin"></i> Generating...</>
              : <><i className="fas fa-play"></i> Generate</>
            }
          </button>
        </div>

        {/* Report Output */}
        {loadingReport && <LoadingSpinner />}

        {!loadingReport && reportData && reportData.type === 'results' && (
          <ResultsReport data={reportData.assignments} />
        )}
        {!loadingReport && reportData && reportData.type === 'assigned-students' && (
          <AssignedStudentsReport data={reportData.students} />
        )}
        {!loadingReport && reportData && reportData.type === 'supervisors' && (
          <SupervisorsReport data={reportData.supervisors} />
        )}

        {!loadingReport && !reportData && reportType && (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-arrow-up text-3xl mb-3 block opacity-30"></i>
            <p className="text-sm font-bold">Configure the filters above and click <span className="text-primary">Generate</span></p>
          </div>
        )}

        {!reportType && (
          <div className="text-center py-12 text-gray-300">
            <i className="fas fa-file-chart-column text-5xl mb-4 block"></i>
            <p className="text-sm font-bold text-gray-400">Select a report type to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────── RESULTS REPORT ───────────────
function ResultsReport({ data }) {
  if (!data || data.length === 0) return <EmptyState icon="fa-chart-bar" msg="No marks data found for this supervisor." />;

  return (
    <div className="space-y-8">
      {data.map((assignment, idx) => {
        const avgPct = assignment.entries.length > 0
          ? (assignment.entries.reduce((a, e) => a + parseFloat(e.percentage), 0) / assignment.entries.length).toFixed(1)
          : 0;
        const chartData = assignment.entries.map(e => ({ name: e.reg.split('/')[1] || e.reg, marks: e.marks, pct: parseFloat(e.percentage) }));

        return (
          <div key={idx} className="border border-gray-100 rounded-2xl overflow-hidden">
            {/* Assignment Header */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-gray-800">{assignment.assignmentTitle}</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Faculty: <span className="font-bold text-gray-600">{assignment.facultyName}</span>
                  &nbsp;·&nbsp; Total Marks: <span className="font-bold">{assignment.totalMarks}</span>
                  &nbsp;·&nbsp; Students: <span className="font-bold">{assignment.entries.length}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <StatsBox label="Class Avg" value={`${avgPct}%`} color="text-emerald-600" />
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="px-6 pt-4 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, assignment.totalMarks]} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: 12 }}
                      cursor={{ fill: '#f9fafb' }}
                      formatter={(v) => [`${v} marks`, 'Score']}
                    />
                    <Bar dataKey="marks" fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.pct >= 80 ? '#10b981' : entry.pct >= 60 ? '#3b82f6' : entry.pct >= 40 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table */}
            <div className="p-6">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['#', 'Student Name', 'Reg. No.', 'Semester', 'Company', 'Marks', '%', 'Grade'].map(h => (
                      <th key={h} className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignment.entries.map((e, i) => {
                    const pct = parseFloat(e.percentage);
                    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
                    const gradeColor = pct >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                      : pct >= 60 ? 'text-blue-600 bg-blue-50 border-blue-100'
                      : pct >= 50 ? 'text-amber-600 bg-amber-50 border-amber-100'
                      : 'text-red-600 bg-red-50 border-red-100';
                    return (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 text-xs text-gray-400 font-medium">{i + 1}</td>
                        <td className="py-3 font-bold text-gray-800">{e.studentName}</td>
                        <td className="py-3 text-xs text-gray-500 font-medium">{e.reg}</td>
                        <td className="py-3 text-xs text-gray-500">{e.semester || '—'}</td>
                        <td className="py-3 text-xs text-gray-500 max-w-[120px] truncate">{e.company || '—'}</td>
                        <td className="py-3 font-black text-gray-800">{e.marks} / {assignment.totalMarks}</td>
                        <td className="py-3 font-bold text-gray-700">{e.percentage}%</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${gradeColor}`}>{grade}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────── ASSIGNED STUDENTS REPORT ───────────────
function AssignedStudentsReport({ data }) {
  if (!data || data.length === 0) return <EmptyState icon="fa-users" msg="No assigned students found." />;

  const modeColors = { 'Onsite': 'bg-blue-50 text-blue-700 border-blue-100', 'Remote': 'bg-purple-50 text-purple-700 border-purple-100', 'Hybrid': 'bg-teal-50 text-teal-700 border-teal-100', 'Freelance': 'bg-orange-50 text-orange-700 border-orange-100' };

  // Chart: Students per faculty
  const byFaculty = {};
  data.forEach(s => {
    if (!byFaculty[s.faculty]) byFaculty[s.faculty] = { name: s.faculty, count: 0 };
    byFaculty[s.faculty].count += 1;
  });
  const facultyChartData = Object.values(byFaculty);

  const byMode = {};
  data.forEach(s => {
    const m = s.mode || 'N/A';
    if (!byMode[m]) byMode[m] = { name: m, count: 0 };
    byMode[m].count += 1;
  });
  const modeChartData = Object.values(byMode);

  return (
    <div className="space-y-6">
      {/* Mini Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Students per Supervisor</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facultyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">By Internship Mode</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={modeChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={4}>
                  {modeChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <StatsBox label="Total Students" value={data.length} color="text-primary" />
        <StatsBox label="Companies" value={new Set(data.map(s => s.company).filter(Boolean)).size} color="text-emerald-600" />
        <StatsBox label="Supervisors" value={new Set(data.map(s => s.faculty)).size} color="text-amber-600" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['#', 'Student', 'Reg. No.', 'Sem', 'Company', 'Site Supervisor', 'Faculty', 'Mode', 'Type'].map(h => (
                <th key={h} className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="py-3 font-bold text-gray-800 whitespace-nowrap">{s.name}</td>
                <td className="py-3 text-xs text-gray-500 font-medium whitespace-nowrap">{s.reg}</td>
                <td className="py-3 text-xs text-gray-500">{s.semester}</td>
                <td className="py-3 text-xs text-gray-700 max-w-[120px] truncate">{s.company || '—'}</td>
                <td className="py-3 text-xs text-gray-500 whitespace-nowrap">{s.siteSupervisor || '—'}</td>
                <td className="py-3 text-xs font-medium text-gray-700 whitespace-nowrap">{s.faculty}</td>
                <td className="py-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${modeColors[s.mode] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                    {s.mode}
                  </span>
                </td>
                <td className="py-3 text-xs text-gray-500 whitespace-nowrap">{s.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────── SUPERVISOR OVERVIEW REPORT ───────────────
function SupervisorsReport({ data }) {
  if (!data || data.length === 0) return <EmptyState icon="fa-chalkboard-user" msg="No faculty supervisors with assigned students found." />;

  const chartData = data.map(f => ({ name: f.name.split(' ').slice(-1)[0], students: f.studentCount, avgScore: parseFloat(f.avgScore) || 0 }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: 12 }} />
            <Legend iconType="circle" />
            <Bar dataKey="students" name="Assigned Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="avgScore" name="Avg Score" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['#', 'Supervisor Name', 'Email', 'Students Assigned', 'Avg Score', 'Student List'].map(h => (
                <th key={h} className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((f, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors align-top">
                <td className="py-4 text-xs text-gray-400">{i + 1}</td>
                <td className="py-4 font-bold text-gray-800 whitespace-nowrap">{f.name}</td>
                <td className="py-4 text-xs text-gray-500">{f.email}</td>
                <td className="py-4">
                  <span className="text-lg font-black text-primary">{f.studentCount}</span>
                </td>
                <td className="py-4">
                  {f.avgScore
                    ? <span className="font-bold text-emerald-600">{f.avgScore}%</span>
                    : <span className="text-xs text-gray-400 italic">No marks yet</span>}
                </td>
                <td className="py-4">
                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                    {f.students.map((s, j) => (
                      <span key={j} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {s.reg.split('/')[1] || s.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
