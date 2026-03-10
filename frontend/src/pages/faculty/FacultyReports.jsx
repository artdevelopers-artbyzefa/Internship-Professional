import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';
import { gradeFromPct, gradeColor, gradePointsFromPct } from '../../utils/helpers.js';

// ── Grade badge helper ──────────────────────────────────────────────────────
function GradeBadge({ grade }) {
  const c = gradeColor(grade);
  return (
    <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black tracking-widest border ${c.bg} ${c.text} ${c.border}`}>
      {grade}
    </span>
  );
}

// ── Circular progress ───────────────────────────────────────────────────────
function Ring({ pct, grade }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  const c = gradeColor(grade);
  const stroke = c.text.replace('text-', '').split('-').pop() === '700'
    ? c.text.replace('text-', 'stroke-')
    : c.text.replace('text-', 'stroke-');

  const strokeColor = grade === 'F' ? '#ef4444'
    : grade.startsWith('A') ? '#10b981'
      : grade.startsWith('B') ? '#3b82f6'
        : grade.startsWith('C') ? '#f59e0b'
          : '#f97316';

  return (
    <svg width="72" height="72" className="-rotate-90 flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={strokeColor} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="36" y="41" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 11, fontWeight: 900, fill: strokeColor, transform: 'rotate(90deg) translateY(-72px)' }}
        className="rotate-90 origin-center" />
    </svg>
  );
}

export default function FacultyReports({ user }) {
  const [loading, setLoading] = useState(null);
  const [evalData, setEvalData] = useState([]);
  const [loadingLive, setLoadingLive] = useState(true);

  // Live grade preview ─────────────────────────────────────────────────────
  useEffect(() => {
    apiRequest('/faculty/report-data/evaluation')
      .then(d => setEvalData(d?.tableData || []))
      .catch(() => { })
      .finally(() => setLoadingLive(false));
  }, []);

  // PDF download ────────────────────────────────────────────────────────────
  const handleDownloadPDF = async (type) => {
    setLoading(type);
    try {
      const payload = await apiRequest(`/faculty/report-data/${type}`);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${payload.reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast.success('Report downloaded successfully!');
    } catch (err) {
      console.error(err);
      showToast.error('Failed to generate report. Check if students have been evaluated.');
    } finally {
      setLoading(null);
    }
  };

  const passCount = evalData.filter(r => r[6] === 'Qualified').length;
  const failCount = evalData.filter(r => r[6] === 'Failed').length;
  const pendCount = evalData.filter(r => r[6] === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Official Reports</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Auto-generated university-standard documentation pulled from live evaluation data.
        </p>
      </div>

      {/* Live Grade Summary ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-bar text-sm" />
            </div>
            <h3 className="font-black text-gray-800 tracking-tight">Live Grade Preview</h3>
            <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">Live</span>
          </div>
          {/* stat pills */}
          <div className="hidden md:flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100">{passCount} Qualified</span>
            <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black border border-rose-100">{failCount} Failed</span>
            <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-500 text-[10px] font-black border border-gray-100">{pendCount} Pending</span>
          </div>
        </div>

        {loadingLive ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
          </div>
        ) : evalData.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <i className="fas fa-inbox text-3xl opacity-40 block mb-3" />
            <p className="text-sm font-bold">No evaluations recorded yet. Grade at least one student to see results.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60">
                  {['Reg. #', 'Name', 'Weeks Graded', 'Average / 10', 'Percentage', 'Grade', 'Grade Points', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {evalData.map((row, i) => {
                  // row: [reg, name, weeks, avg, pct%, grade, status]
                  const pctNum = parseInt(row[4]) || 0;
                  const gc = gradeColor(row[5] || 'F');
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-500 font-mono">{row[0]}</td>
                      <td className="px-6 py-4 font-bold text-gray-800 text-sm">{row[1]}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black border border-indigo-100">{row[2]}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pctNum}%`, background: row[5] === 'F' ? '#ef4444' : row[5]?.startsWith('A') ? '#10b981' : row[5]?.startsWith('B') ? '#3b82f6' : '#f59e0b' }} />
                          </div>
                          <span className="text-xs font-black text-gray-800">{row[3]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-black ${row[5] === 'F' ? 'text-red-600' : pctNum >= 75 ? 'text-emerald-700' : 'text-amber-700'}`}>{row[4]}</span>
                      </td>
                      <td className="px-6 py-4">
                        {row[5] && row[5] !== 'N/A' ? <GradeBadge grade={row[5]} /> : <span className="text-gray-300 font-bold text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{row[5] && row[5] !== 'N/A' ? gradePointsFromPct(pctNum) : '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${row[6] === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : row[6] === 'Failed' ? 'bg-red-50 text-red-700 border-red-100'
                              : 'bg-gray-50 text-gray-500 border-gray-100'
                          }`}>
                          <i className={`fas text-[8px] ${row[6] === 'Qualified' ? 'fa-check' : row[6] === 'Failed' ? 'fa-times' : 'fa-clock'}`} />
                          {row[6] || 'Pending'}
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

      {/* Download Buttons ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Student List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-users text-xl" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Student Placement List</h3>
          <p className="text-sm text-gray-500 mb-6">Full list of your assigned students with company, mode, and placement status.</p>
          <button
            onClick={() => handleDownloadPDF('student-list')}
            disabled={loading !== null}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
              ${loading === 'student-list' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-secondary shadow-lg shadow-blue-600/20'}`}
          >
            {loading === 'student-list'
              ? <><i className="fas fa-circle-notch fa-spin" /> Generating...</>
              : <><i className="fas fa-download" /> Download PDF</>}
          </button>
        </div>

        {/* Evaluation / Grade Sheet */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-clipboard-check text-xl" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Grade Sheet (Performance)</h3>
          <p className="text-sm text-gray-500 mb-6">Official marksheet — weekly averages, percentages, letter grades & qualification status.</p>
          <button
            onClick={() => handleDownloadPDF('evaluation')}
            disabled={loading !== null}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
              ${loading === 'evaluation' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-600/20'}`}
          >
            {loading === 'evaluation'
              ? <><i className="fas fa-circle-notch fa-spin" /> Generating...</>
              : <><i className="fas fa-download" /> Download PDF</>}
          </button>
        </div>

        {/* Coming soon */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 opacity-60">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-file-word text-xl" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Official Letters</h3>
          <p className="text-sm text-gray-500 mb-6">Internship completion letters in Word format.</p>
          <div className="w-full py-3 rounded-xl bg-gray-50 text-gray-400 text-center text-sm font-bold border border-dashed border-gray-200">
            Coming Soon
          </div>
        </div>
      </div>

      {/* Grade Scale Reference ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <i className="fas fa-table text-sm" />
          </div>
          <h3 className="font-black text-gray-800">Grading Scale Reference</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                {['Grade', 'Grade Points', 'Percentage Range', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ['A', '3.67–4.00', '85% and above', true],
                ['A-', '3.34–3.66', '80 – 84%', true],
                ['B+', '3.01–3.33', '75 – 79%', true],
                ['B', '2.67–3.00', '71 – 74%', true],
                ['B-', '2.34–2.66', '68 – 70%', true],
                ['C+', '2.01–2.33', '64 – 67%', true],
                ['C', '1.67–2.00', '61 – 63%', true],
                ['C-', '1.31–1.66', '58 – 60%', true],
                ['D+', '1.01–1.30', '54 – 57%', true],
                ['D', '0.10–1.00', '50 – 53%', true],
                ['F', '0.00', 'Below 50%', false],
              ].map(([g, gp, range, pass]) => {
                const c = gradeColor(g);
                return (
                  <tr key={g} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><GradeBadge grade={g} /></td>
                    <td className="px-4 py-3 font-bold text-gray-700 text-xs">{gp}</td>
                    <td className="px-4 py-3 font-bold text-gray-700 text-xs">{range}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black ${pass ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        <i className={`fas text-[7px] ${pass ? 'fa-check' : 'fa-times'}`} />
                        {pass ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
