import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import { gradeFromPct, gradeColor, gradePointsFromPct } from '../../utils/helpers.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine
} from 'recharts';

// ── Palette ─────────────────────────────────────────────────────────────────
const GRADE_COLORS = {
  A: '#10b981', 'A-': '#34d399', 'B+': '#3b82f6', B: '#60a5fa', 'B-': '#93c5fd',
  'C+': '#f59e0b', C: '#fbbf24', 'C-': '#f97316', 'D+': '#fb923c', D: '#ef4444', F: '#dc2626'
};
const TIP = { contentStyle: { borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,.15)', fontSize: 12 }, cursor: { fill: '#f9fafb' } };

function GradeBadge({ grade }) {
  const c = gradeColor(grade);
  return <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}>{grade}</span>;
}

function StatCard({ label, value, sub, color = 'blue' }) {
  const map = { blue: 'bg-blue-50 text-blue-600 border-blue-100', emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', amber: 'bg-amber-50 text-amber-700 border-amber-100', rose: 'bg-rose-50 text-rose-600 border-rose-100', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100', purple: 'bg-purple-50 text-purple-600 border-purple-100' };
  return (
    <div className={`p-5 rounded-2xl border ${map[color]} flex flex-col gap-1`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-[10px] font-bold text-slate-500">{label}</div>
      {sub && <div className="text-[9px] font-bold opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function HODReports() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingExport, setLoadingExport] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiRequest('/office/aggregated-marks')
      .then(d => setResults(d || []))
      .catch(err => {
        // Error handled by apiRequest
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────
  const filtered = results.filter(r =>
    r.student.name.toLowerCase().includes(search.toLowerCase()) ||
    r.student.reg.toLowerCase().includes(search.toLowerCase())
  );
  
  const total = results.length;
  // Participation Stats
  const physicalCount = results.filter(r => r.mode === 'Standard (Physical)').length;
  const freelanceCount = results.filter(r => r.mode === 'Freelance').length;
  const ineligibleCount = results.filter(r => r.reportStatus === 'Ineligible').length;
  const participatingCount = total - ineligibleCount;

  const passed = results.filter(r => r.reportStatus === 'Pass').length;
  const failed = results.filter(r => r.reportStatus === 'Fail').length;
  const avgPct = participatingCount ? Math.round(results.filter(r => r.reportStatus !== 'Ineligible').reduce((s, r) => s + r.percentage, 0) / participatingCount) : 0;
  const avgGrade = gradeFromPct(avgPct);

  // Grade distribution
  const gradeLabels = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
  const gradeDist = gradeLabels.map(g => ({
    grade: g, count: results.filter(r => r.grade === g).length
  }));

  // Pass / Fail pie
  const passFail = [
    { name: 'Pass', value: passed },
    { name: 'Fail', value: failed }
  ];

  // Faculty load calculation based on new object structure
  const facultyMap = {};
  results.forEach(r => {
    const f = r.faculty?.name || 'Unassigned';
    if (!facultyMap[f]) facultyMap[f] = { name: f, students: 0, avgPct: 0, totalPct: 0, phone: r.faculty?.phone };
    facultyMap[f].students++;
    if (r.reportStatus !== 'Ineligible') {
        facultyMap[f].totalPct += r.percentage;
    }
  });
  const facultyData = Object.values(facultyMap).map(f => ({ 
    ...f, 
    avgPct: f.students > 0 ? Math.round(f.totalPct / f.students) : 0 
  }));

  // Sorted list for charts
  const topPerformers = [...results]
    .filter(r => r.reportStatus !== 'Ineligible')
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8);

  const handleExportExcel = async () => {
    setLoadingExport(true);
    try {
      // Prepare detailed table structure for Excel
      const studentData = results.map(r => [
        r.student.reg,
        r.student.name,
        r.student.phone || 'N/A',
        r.student.secondaryEmail || 'N/A',
        `${r.faculty?.name || 'N/A'}`,
        `${r.siteSupervisor?.name || 'N/A'}`,
        r.company,
        r.mode,
        r.percentage,
        r.grade,
        r.reportStatus
      ]);

      const payload = {
        stats: { total, passed, failed, avgPct, avgGrade },
        tables: { students: studentData }
      };

      const blob = await apiRequest('/reports/hod-excel-report', {
        method: 'POST',
        body: payload,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HOD_Internship_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      // Error handled by apiRequest
    } finally {
      setLoadingExport(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div id="hod-report-content" className="space-y-6 bg-slate-50 p-2 sm:p-0">

      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <h2 className="text-3xl font-black text-gray-800 tracking-tight italic">Performance Analytics</h2>
          </div>
          <p className="text-sm text-gray-500 font-medium max-w-lg">
            High-fidelity institutional reporting and cohort analysis. Generate audit-ready departmental records.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 w-full md:w-auto">
          <button
            onClick={() => window.open('/hod/premium-report-preview', '_blank')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-black hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <i className="fas fa-crown text-amber-400" />
            <span>Generate Premium Report</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={loadingExport || results.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-700/20 hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
          >
            {loadingExport ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-file-excel" />}
            <span>Download Data Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Total students" value={total} color="blue" />
        <StatCard label="Success cases" value={passed} sub={`${total ? Math.round(passed / total * 100) : 0}% success rate`} color="emerald" />
        <StatCard label="Failure cases" value={failed} sub={`${total ? Math.round(failed / total * 100) : 0}% of cohort`} color="rose" />
        <StatCard label="Batch average" value={`${avgPct}%`} sub={`Academic grade: ${avgGrade}`} color="indigo" />
        <StatCard label="Incomplete files" value={total === 0 ? '—' : results.filter(r => r.assignmentsCount === 0).length} color="amber" />
        <StatCard label="Academic faculty" value={facultyData.length} color="purple" />
      </div>

      {/* Charts Row 1 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Grade Distribution */}
        <div id="chart-dist" className="md:col-span-2 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-bold text-slate-500">Cohort grade distribution</h4>
            <div className="flex items-center gap-1">
              {['A','B','C','D','F'].map(l => (
                  <span key={l} className="w-2 h-2 rounded-full" style={{ backgroundColor: GRADE_COLORS[l] || '#eee'}} />
              ))}
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDist} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip {...TIP} formatter={v => [v, 'Students']} />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={32}>
                  {gradeDist.map((d, i) => <Cell key={i} fill={GRADE_COLORS[d.grade] || '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pass / Fail Pie */}
        <div id="chart-pie" className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white p-8 flex flex-col items-center justify-center">
          <h4 className="text-[10px] font-bold text-slate-500 mb-4 w-full text-left">Completion analysis</h4>
          <div className="relative w-full aspect-square max-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={passFail} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip {...TIP} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-gray-800">{total ? Math.round(passed / total * 100) : 0}%</span>
              <span className="text-[10px] font-bold text-emerald-500">Pass rate</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>Pass: {passed}</span>
                <span>Fail: {failed}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${total ? (passed/total)*100 : 0}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${total ? (failed/total)*100 : 0}%` }} className="bg-rose-500 h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Top Performers */}
        <div id="chart-top" className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white p-8">
          <div className="flex items-center justify-between mb-8">
             <h4 className="text-[10px] font-bold text-slate-500">Academic performance (Top 8)</h4>
             <i className="fas fa-crown text-amber-400" />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topPerformers} margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="student.name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#1e293b' }} width={90} />
                <Tooltip {...TIP} formatter={v => [`${v}%`, 'Score']} />
                <ReferenceLine x={50} stroke="#f43f5e" strokeDasharray="4 2" label={{ position: 'top', value: 'Pass Line', fontSize: 8, fill: '#f43f5e', fontWeight: 900 }} />
                <Bar dataKey="percentage" radius={[0, 12, 12, 0]} barSize={20}>
                  {topPerformers.map((d, i) => <Cell key={i} fill={GRADE_COLORS[d.grade] || '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Faculty avg performance */}
        <div id="chart-faculty" className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-bold text-slate-500">Supervisor performance metrics</h4>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-500 rounded-full text-[9px] font-bold">Standard: 70%+</span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facultyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#1e293b' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                <Tooltip {...TIP} formatter={v => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="avgPct" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Student Grade Records ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><i className="fas fa-graduation-cap text-sm" /></div>
            <h3 className="font-bold text-gray-800">Departmental academic record</h3>
            <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">{filtered.length} students enrolled</span>
          </div>
          <div data-html2canvas-ignore="true">
            <input
              type="text" placeholder="Search by name or reg…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-gray-50 w-64"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <i className="fas fa-inbox text-3xl opacity-40 block mb-3" />
            <p className="text-sm font-bold">No results found matching search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/60 text-[9px] font-bold text-slate-500">
                  {['Reg. #', 'Student', 'Academic supervisor', 'Site supervisor', 'Company', 'Mode', 'Tasks', 'Avg / 10', '%', 'GRD', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 border-b border-gray-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r, i) => {
                  return (
                    <tr key={i} className={`hover:bg-gray-50/50 transition-colors ${r.reportStatus === 'Ineligible' ? 'opacity-60 bg-gray-50/20' : ''}`}>
                      <td className="px-5 py-4 text-[10px] font-bold text-gray-400 font-mono whitespace-nowrap">{r.student.reg}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-sm">{r.student.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium">{r.student.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="font-bold text-indigo-600 text-[11px]">{r.faculty?.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium">{r.faculty?.phone}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-700 text-[11px]">{r.siteSupervisor?.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium">{r.siteSupervisor?.phone}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 font-medium font-mono">{r.company}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${r.mode === 'Freelance' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            {r.mode}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-[10px] font-bold border border-gray-100">{r.assignmentsCount}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, backgroundColor: GRADE_COLORS[r.grade] || '#94a3b8' }} />
                          </div>
                          <span className="text-[11px] font-bold text-gray-800">{r.averageMarks}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${r.percentage >= 75 ? 'text-emerald-600' : r.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.percentage}%</span>
                      </td>
                      <td className="px-5 py-4"><GradeBadge grade={r.grade} /></td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            r.reportStatus === 'Pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            r.reportStatus === 'Fail' ? 'bg-red-50 text-red-700 border-red-100' : 
                            'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          <i className={`fas text-[8px] ${r.reportStatus === 'Pass' ? 'fa-check' : r.reportStatus === 'Fail' ? 'fa-times' : 'fa-clock'}`} />
                          {r.reportStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
