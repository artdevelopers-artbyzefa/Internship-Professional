import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import { gradeFromPct, gradeColor, gradePointsFromPct } from '../../utils/helpers.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, ReferenceLine
} from 'recharts';

// ── Palette ─────────────────────────────────────────────────────────────────
const GRADE_COLORS = {
  A: '#10b981', 'A-': '#34d399', 'B+': '#3b82f6', B: '#60a5fa', 'B-': '#93c5fd',
  'C+': '#f59e0b', C: '#fbbf24', 'C-': '#f97316', 'D+': '#fb923c', D: '#ef4444', F: '#dc2626'
};
const TIP = { contentStyle: { borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,.15)', fontSize: 12 }, cursor: { fill: '#f9fafb' } };

function GradeBadge({ grade }) {
  const c = gradeColor(grade);
  return <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black tracking-widest border ${c.bg} ${c.text} ${c.border}`}>{grade}</span>;
}

function StatCard({ label, value, sub, color = 'blue' }) {
  const map = { blue: 'bg-blue-50 text-blue-600 border-blue-100', emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', amber: 'bg-amber-50 text-amber-700 border-amber-100', rose: 'bg-rose-50 text-rose-600 border-rose-100', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100', purple: 'bg-purple-50 text-purple-600 border-purple-100' };
  return (
    <div className={`p-5 rounded-2xl border ${map[color]} flex flex-col gap-1`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</div>
      {sub && <div className="text-[9px] font-bold opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function HODReports() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiRequest('/office/aggregated-marks')
      .then(d => setResults(d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────
  const filtered = results.filter(r =>
    r.student.name.toLowerCase().includes(search.toLowerCase()) ||
    r.student.reg.toLowerCase().includes(search.toLowerCase())
  );
  const total = results.length;
  const passed = results.filter(r => r.status === 'Pass').length;
  const failed = results.filter(r => r.status === 'Fail').length;
  const avgPct = total ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / total) : 0;
  const avgGrade = gradeFromPct(avgPct);

  // Grade distribution for bar chart
  const gradeLabels = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
  const gradeDist = gradeLabels.map(g => ({
    grade: g, count: results.filter(r => r.grade === g).length
  }));

  // Pass / Fail pie
  const passFail = [
    { name: 'Pass', value: passed },
    { name: 'Fail', value: failed }
  ];

  // Performance timeline (sorted by percentage desc)
  const sortedByPct = [...results].sort((a, b) => b.percentage - a.percentage);
  const topPerformers = sortedByPct.slice(0, 8);

  // Faculty load
  const facultyMap = {};
  results.forEach(r => {
    const f = r.faculty || 'Unknown';
    if (!facultyMap[f]) facultyMap[f] = { name: f, students: 0, avgPct: 0, totalPct: 0 };
    facultyMap[f].students++;
    facultyMap[f].totalPct += r.percentage;
  });
  const facultyData = Object.values(facultyMap).map(f => ({ ...f, avgPct: Math.round(f.totalPct / f.students) }));

  // PDF download
  const handlePDF = async () => {
    setLoadingPDF(true);
    try {
      const tableData = filtered.map(r => [
        r.student.reg, r.student.name, r.faculty, r.company,
        `${r.averageMarks}/10`, `${r.percentage}%`, r.grade, r.gradePoints, r.status
      ]);
      const payload = {
        supervisorName: 'Head of Department',
        reportTitle: 'HOD Internship Grade Sheet',
        tableHeader: ['Reg. #', 'Student', 'Faculty', 'Company', 'Avg', '%', 'Grade', 'GP', 'Status'],
        tableData,
        columnsLayout: [80, '*', '*', '*', 40, 35, 35, 55, 55]
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/reports/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `HOD_Internship_Grade_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error(e); } finally { setLoadingPDF(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Internship Analysis</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Complete grade analytics across the entire active internship cohort.
          </p>
        </div>
        <button
          onClick={handlePDF}
          disabled={loadingPDF || results.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingPDF ? <><i className="fas fa-circle-notch fa-spin" /> Generating...</> : <><i className="fas fa-download" /> Export Full Report</>}
        </button>
      </div>

      {/* KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Evaluated" value={total} color="blue" />
        <StatCard label="Pass" value={passed} sub={`${total ? Math.round(passed / total * 100) : 0}% of cohort`} color="emerald" />
        <StatCard label="Fail" value={failed} sub={`${total ? Math.round(failed / total * 100) : 0}% of cohort`} color="rose" />
        <StatCard label="Cohort Avg %" value={`${avgPct}%`} sub={`Grade: ${avgGrade}`} color="indigo" />
        <StatCard label="Pending" value={total === 0 ? '—' : results.filter(r => r.assignmentsCount === 0).length} color="amber" />
        <StatCard label="Faculty" value={facultyData.length} color="purple" />
      </div>

      {/* Charts Row 1 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Grade Distribution */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Grade Distribution (All Students)</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDist} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip {...TIP} formatter={v => [v, 'Students']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {gradeDist.map((d, i) => <Cell key={i} fill={GRADE_COLORS[d.grade] || '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pass / Fail Pie */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Pass / Fail Ratio</h4>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={passFail} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip {...TIP} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 900 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs font-bold text-gray-400">Pass rate</p>
            <p className="text-2xl font-black text-emerald-600">{total ? Math.round(passed / total * 100) : 0}%</p>
          </div>
        </div>
      </div>

      {/* Charts Row 2 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Top Performers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Top Performers</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topPerformers} margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="student.name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} width={90} />
                <Tooltip {...TIP} formatter={v => [`${v}%`, 'Score']} />
                <ReferenceLine x={50} stroke="#f43f5e" strokeDasharray="4 2" />
                <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                  {topPerformers.map((d, i) => <Cell key={i} fill={GRADE_COLORS[d.grade] || '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Faculty avg performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Faculty Supervisor — Avg Student Score</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facultyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
                <Tooltip {...TIP} formatter={v => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="avgPct" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Student Grade Records ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><i className="fas fa-book-open text-sm" /></div>
            <h3 className="font-black text-gray-800">Student Grade Records</h3>
            <span className="text-[10px] font-black bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100 uppercase tracking-widest">{filtered.length} Records</span>
          </div>
          <input
            type="text" placeholder="Search by name or reg…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-gray-50 w-64"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <i className="fas fa-inbox text-3xl opacity-40 block mb-3" />
            <p className="text-sm font-bold">No Results yet{search ? ' matching your search' : ''}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60">
                  {['Reg. #', 'Student', 'Faculty', 'Company', 'Weeks', 'Average / 10', 'Percentage', 'Grade', 'Grade Points', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r, i) => {
                  const c = gradeColor(r.grade);
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 text-[10px] font-bold text-gray-400 font-mono whitespace-nowrap">{r.student.reg}</td>
                      <td className="px-5 py-4 font-bold text-gray-800 text-sm whitespace-nowrap">{r.student.name}</td>
                      <td className="px-5 py-4 text-xs text-indigo-500 font-bold">{r.faculty}</td>
                      <td className="px-5 py-4 text-xs text-gray-500 font-medium">{r.company}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black border border-indigo-100">{r.assignmentsCount}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, backgroundColor: GRADE_COLORS[r.grade] || '#94a3b8' }} />
                          </div>
                          <span className="text-xs font-black text-gray-800">{r.averageMarks}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-black ${r.percentage >= 75 ? 'text-emerald-600' : r.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.percentage}%</span>
                      </td>
                      <td className="px-5 py-4"><GradeBadge grade={r.grade} /></td>
                      <td className="px-5 py-4 text-[10px] font-bold text-gray-400">{r.gradePoints}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${r.status === 'Pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          <i className={`fas text-[8px] ${r.status === 'Pass' ? 'fa-check' : 'fa-times'}`} />
                          {r.status}
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
