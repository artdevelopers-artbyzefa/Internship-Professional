import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import Card from '../../components/ui/Card.jsx';
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
        body: JSON.stringify(payload),
        credentials: 'include'
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
      <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 text-center md:text-left">
        <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Official Reports</h2>
        <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
          Auto-generated university-standard documentation pulled from live evaluation data.
        </p>
      </div>

      {/* Live Grade Summary ─────────────────────────────────────────────── */}
      <Card
        header={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-bar text-sm" />
              </div>
              <h3 className="font-black text-gray-800 tracking-tight">Live Grade Preview</h3>
              <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">Live</span>
            </div>
            {/* stat pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-100">{passCount} Qualified</span>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[9px] font-black border border-rose-100">{failCount} Failed</span>
              <span className="px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 text-[9px] font-black border border-gray-100">{pendCount} Pending</span>
            </div>
          </div>
        }
        className="overflow-hidden"
      >

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
          <DataTable 
            columns={[
              { label: 'Reg. #', key: '0', render: (val) => <span className="text-[10px] font-bold text-gray-500 font-mono">{val}</span> },
              { label: 'Name', key: '1', render: (val) => <span className="font-bold text-gray-800 text-sm">{val || '—'}</span> },
              { label: 'Weeks', key: '2', render: (val) => <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black border border-indigo-100">{val}</span> },
              { 
                label: 'Avg', 
                key: '3', 
                render: (val, row) => {
                  const pct = parseInt(row[4]) || 0;
                  return (
                    <div className="flex items-center gap-2">
                       <div className="flex-1 min-w-[60px] h-1.5 bg-gray-100 rounded-full overflow-hidden hidden md:block">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: row[5] === 'F' ? '#ef4444' : row[5]?.startsWith('A') ? '#10b981' : row[5]?.startsWith('B') ? '#3b82f6' : '#f59e0b' }} />
                      </div>
                      <span className="text-xs font-black text-gray-800">{val}</span>
                    </div>
                  );
                }
              },
              { label: 'Percentage', key: '4', render: (val, row) => <span className={`text-sm font-black ${row[5] === 'F' ? 'text-red-600' : (parseInt(val) >= 75 ? 'text-emerald-700' : 'text-amber-700')}`}>{val}</span> },
              { label: 'Grade', key: '5', render: (val) => (val && val !== 'N/A' ? <GradeBadge grade={val} /> : <span className="text-gray-300 font-bold text-xs">—</span>) },
              { label: 'Points', key: '5', render: (_, row) => {
                  const pct = parseInt(row[4]) || 0;
                  return <span className="text-[10px] font-bold text-gray-400">{row[5] && row[5] !== 'N/A' ? gradePointsFromPct(pct) : '—'}</span>
              }},
              { 
                label: 'Status', 
                key: '6', 
                render: (val) => (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${val === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : val === 'Failed' ? 'bg-red-50 text-red-700 border-red-100'
                      : 'bg-gray-50 text-gray-500 border-gray-100'
                    }`}>
                    <i className={`fas text-[8px] ${val === 'Qualified' ? 'fa-check' : val === 'Failed' ? 'fa-times' : 'fa-clock'}`} />
                    {val || 'Pending'}
                  </span>
                )
              }
            ]}
            data={evalData}
          />
        )}
      </Card>

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

      </div>
    </div>
  );
}
