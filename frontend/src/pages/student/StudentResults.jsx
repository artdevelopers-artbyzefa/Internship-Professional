import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';

export default function StudentResults() {
  const [marks, setMarks] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [gradeSummary, setGradeSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const handleDownload = async (url, name = 'Submission') => {
    if (!url) return;
    try {
      const cleanName = `${name.replace(/[^a-z0-9]/gi, '_')}_Report`;
      const filename = `${cleanName}.pdf`;
      const blob = await apiRequest('/auth/download-proxy', {
        params: { url, filename },
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  const fetchData = async () => {
    try {
      const [marksData, evalData, summaryData] = await Promise.all([
        apiRequest('/student/my-marks'),
        apiRequest('/student/my-evaluations'),
        apiRequest('/student/my-grade')
      ]);
      setMarks(marksData || []);
      setEvaluations(evalData || []);
      setGradeSummary(summaryData);
    } catch (err) {
      // Error handled by apiRequest
    } finally { setLoading(false); }
  };

  const pctColor = (p) => {
    if (p >= 80) return 'bg-emerald-500';
    if (p >= 60) return 'bg-amber-400';
    if (p >= 40) return 'bg-orange-400';
    return 'bg-rose-500';
  };

  const assignmentTotal = marks.reduce((s, m) => s + (m.marks || 0), 0);
  const assignmentMax = marks.reduce((s, m) => s + (m.assignment?.totalMarks || 0), 0);
  const evalTotal = evaluations.reduce((s, e) => s + (e.totalMarks || 0), 0);
  const evalMax = evaluations.reduce((s, e) => s + (e.maxTotal || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <i className="fas fa-circle-notch fa-spin text-3xl text-primary opacity-30"></i>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Grades</h2>
          {gradeSummary && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 ${gradeSummary.status === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <i className={`fas ${gradeSummary.status === 'Pass' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
              {gradeSummary.status}
            </div>
          )}
        </div>
        {gradeSummary && (
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Final Score</div>
              <div className="text-2xl font-black text-gray-800">{gradeSummary.averageMarks} <span className="text-gray-300 font-medium">/ 10</span></div>
              <div className="text-[10px] font-bold text-gray-400 mt-1">Grade: <span className="text-primary">{gradeSummary.grade}</span></div>
            </div>
            <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-lg"
              style={{ background: gradeSummary.percentage >= 50 ? '#d1fae5' : '#fee2e2' }}>
              <span className="text-2xl font-black" style={{ color: gradeSummary.percentage >= 50 ? '#059669' : '#dc2626' }}>{gradeSummary.percentage}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Marks Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-800  tracking-widest">Assignment Results</h3>
          {marks.length > 0 && (
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Total Assignments: {marks.length}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest w-10">#</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest">Title</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest text-center">Obtained</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest text-center">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest text-center">%</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest text-center">Submission</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest w-40">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {marks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <i className="fas fa-award text-3xl text-gray-100 mb-3 block"></i>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No Graded Assignments Yet</p>
                  </td>
                </tr>
              ) : marks.map((m, idx) => {
                const max = m.assignment?.totalMarks || 10;
                const obtained = m.marks || 0;
                const p = Math.round((obtained / max) * 100);
                return (
                  <tr key={m._id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-gray-300">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-800 leading-none">{m.assignment?.title || '—'}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{m.assignment?.courseTitle || 'Company Task'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-primary">{obtained.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-gray-400">{max}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-gray-700">{p}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {m.submissionFileUrl ? (
                        <button
                          onClick={() => handleDownload(m.submissionFileUrl, m.assignment?.title)}
                          className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 hover:text-primary transition-all flex items-center justify-center border border-gray-100 cursor-pointer mx-auto"
                        >
                          <i className="fas fa-file-download text-[10px]"></i>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-bold italic tracking-tight">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${pctColor(p)}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluations Table — only shown if evaluations exist */}
      {evaluations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Supervisor Evaluations</h3>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Total Points: {evalTotal} / {evalMax}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/60">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest w-10">#</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest">Source</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest text-center">Obtained</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest text-center">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest text-center">%</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400  tracking-widest w-40">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {evaluations.map((e, idx) => {
                  const p = e.maxTotal > 0 ? Math.round((e.totalMarks / e.maxTotal) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-4 text-xs font-black text-gray-300">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-800">
                          {e.source === 'site_supervisor' ? 'Site Supervisor' : 'Faculty Supervisor'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-400">
                        {new Date(e.submittedAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-black text-primary">{e.totalMarks}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-bold text-gray-400">{e.maxTotal}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-black text-gray-700">{p}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pctColor(p)}`} style={{ width: `${p}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Certificate Card */}
      {gradeSummary?.certificateUrl && (
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative group mt-12 animate-in fade-in slide-in-from-top-6 duration-1000">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />
          <div className="flex items-center gap-8 relative z-10">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-primary/5">
              <i className="fas fa-award"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Official Internship Certificate</h3>
              <p className="text-[10px] text-gray-400 font-bold  tracking-widest mt-3 flex items-center gap-2">
                <i className="fas fa-shield-check text-emerald-500"></i>
                Uploaded by Site Supervisor
              </p>
            </div>
          </div>
          <button 
            onClick={() => handleDownload(gradeSummary.certificateUrl, 'Internship_Certificate')}
            className="px-10 py-4 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all hover:shadow-2xl hover:shadow-primary/20 cursor-pointer flex items-center gap-3 active:scale-95 relative z-10 hover:-translate-y-1"
          >
            <i className="fas fa-file-contract text-sm"></i>
            Download Official Certificate
          </button>
        </div>
      )}

    </div>
  );
}
