import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import { gradeFromPct } from '../../utils/helpers.js';
import Card from '../../components/ui/Card.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';

export default function StudentResults() {
  const [marks, setMarks] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [marksData, evalData] = await Promise.all([
        apiRequest('/student/my-marks'),
        apiRequest('/student/my-evaluations')
      ]);
      setMarks(marksData || []);
      setEvaluations(evalData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const assignmentTotal = marks.reduce((s, m) => s + m.marks, 0);
  const assignmentMax = marks.reduce((s, m) => s + (m.assignment?.totalMarks || 100), 0);

  const evalTotal = evaluations.reduce((s, e) => s + e.totalMarks, 0);
  const evalMax = evaluations.reduce((s, e) => s + e.maxTotal, 0);

  const grandTotal = assignmentTotal + evalTotal;
  const grandMax = assignmentMax + evalMax;

  const pct = grandMax > 0 ? Math.round(grandTotal / grandMax * 100) : 0;
  const grade = grandMax > 0 ? gradeFromPct(pct) : 'N/A';

  if (loading) return <div className="text-center py-20"><i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Academic Transcript</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Consolidated results including technical assignments and internal evaluations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="shadow-sm">
          <i className="fas fa-print mr-2"></i> Print Transcript
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gray-900 text-white rounded-[2.5rem] p-8 text-center flex flex-col justify-center shadow-2xl shadow-gray-900/20">
          <div className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Final Grade</div>
          <div className="text-6xl font-black tracking-tighter mb-2">{grade}</div>
          <div className="h-px bg-white/10 w-full my-4"></div>
          <div className="text-2xl font-black">{grandTotal}/{grandMax}</div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Aggregate Marks</div>
        </div>

        <Card className="md:col-span-2">
          <h3 className="text-lg font-black text-gray-800 tracking-tight mb-6 flex items-center gap-2">
            <i className="fas fa-chart-line text-primary"></i>
            Weightage Distribution
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignments</span>
                <span className="text-xs font-bold text-gray-800">{assignmentTotal}/{assignmentMax}</span>
              </div>
              <ProgressBar value={assignmentMax > 0 ? (assignmentTotal / assignmentMax * 100) : 0} color="bg-blue-600" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Technical Evaluations</span>
                <span className="text-xs font-bold text-gray-800">{evalTotal}/{evalMax}</span>
              </div>
              <ProgressBar value={evalMax > 0 ? (evalTotal / evalMax * 100) : 0} color="bg-emerald-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Internal Evaluations Section */}
      {evaluations.length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i className="fas fa-clipboard-check"></i>
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">Internal Evaluation Details</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Company &amp; Supervisor Feedback</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {evaluations.map((e, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-gray-50 border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">
                      {e.source === 'site_supervisor' ? 'Site Supervisor Evaluation' : 'Academic Supervisor Review'}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-medium italic">Submitted on {new Date(e.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-xl font-black text-emerald-600">{e.totalMarks}/{e.maxTotal}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.entries(e.marks).map(([k, v]) => (
                    <div key={k} className="p-2 bg-white rounded-xl border border-gray-50 flex flex-col items-center">
                      <span className="text-[8px] font-black text-gray-400 uppercase">{k}</span>
                      <span className="text-xs font-extrabold text-gray-700">{v}</span>
                    </div>
                  ))}
                </div>
                {e.comments && (
                  <div className="bg-white/50 p-3 rounded-xl border border-gray-100 text-[11px] text-gray-500 leading-relaxed italic">
                    "{e.comments}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assignments Table */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 border-b pb-4">
          <h3 className="text-lg font-black text-gray-800 tracking-tight">Assignment Deep-Dive</h3>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">{marks.length} Tasks Recorded</span>
        </div>

        {error && <Alert type="danger" className="mb-4">{error}</Alert>}

        {marks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
            <i className="fas fa-award text-3xl text-gray-200 mb-2"></i>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No Graded Assignments Yet</p>
            <p className="text-[10px] text-gray-400 mt-1 italic">Weekly marks will appear here once verified.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignment</th>
                  <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Marks Obtained</th>
                  <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Marks</th>
                  <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance</th>
                </tr>
              </thead>
              <tbody>
                {marks.map(m => {
                  const weight = m.assignment?.totalMarks || 100;
                  const p = Math.round(m.marks / weight * 100);
                  return (
                    <tr key={m._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-800 text-sm">{m.assignment?.title}</div>
                        <div className="text-[10px] text-gray-400 font-medium">Internship Report Entry</div>
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-primary">{m.marks}</td>
                      <td className="px-4 py-4 text-xs font-bold text-gray-400">{weight}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20"><ProgressBar value={p} /></div>
                          <span className="text-[10px] font-black text-gray-700">{p}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="bg-blue-50/30 border border-blue-100 p-6 rounded-3xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
          <i className="fas fa-fingerprint text-xl"></i>
        </div>
        <p className="text-[11px] text-blue-900 font-medium leading-relaxed max-w-lg">
          This digital transcript is securely signed and verified. Any discrepancies should be reported directly to the Head of Department.
          <strong> Last Updated: {new Date().toLocaleDateString()}</strong>
        </p>
      </div>
    </div>
  );
}
