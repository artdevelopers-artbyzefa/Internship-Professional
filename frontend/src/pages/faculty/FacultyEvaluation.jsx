import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import { gradeFromPct, gradeColor, gradePointsFromPct } from '../../utils/helpers.js';

// ── helpers ──────────────────────────────────────────────────────────────────
function GradeBadge({ grade }) {
  const c = gradeColor(grade);
  return (
    <span className={`inline-block px-3 py-1.5 rounded-xl text-sm font-black tracking-widest border ${c.bg} ${c.text} ${c.border}`}>
      {grade}
    </span>
  );
}

function calcStats(marks, localScores, isFreelance) {
  const rows = marks.map(m => {
    const fInput = localScores[m._id];
    const fScore = (fInput !== '' && fInput !== undefined) ? Number(fInput) : m.facultyMarks;
    const sScore = m.siteSupervisorMarks || 0;

    if (fScore === null || fScore === undefined) return null;

    // Formula: (Site + Faculty) / 2 OR just Faculty for Freelance
    const obtained = isFreelance ? fScore : (sScore + fScore) / 2;
    return { obtained };
  }).filter(r => r !== null);

  if (rows.length === 0) return { avg: null, pct: null, grade: null };
  const totalObtained = rows.reduce((s, r) => s + r.obtained, 0);
  const avg = totalObtained / rows.length;
  const pct = Math.round((avg / 10) * 100);
  const grade = gradeFromPct(pct);
  return { avg: avg.toFixed(1), pct, grade };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FacultyEvaluation({ user }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeklyMarks, setWeeklyMarks] = useState([]);
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [fetchingEval, setFetchingEval] = useState(false);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try { setStudents((await apiRequest('/faculty/my-students')) || []); }
    catch { } finally { setLoading(false); }
  };

  const handleDownload = (mark) => {
    if (!mark.submission?.fileUrl) return;
    const name = mark.assignment?.title || 'Report';
    const cleanName = `${name.replace(/[^a-z0-9]/gi, '_')}_Report`;
    const proxyUrl = `${import.meta.env.VITE_API_URL}/auth/download-proxy?url=${encodeURIComponent(mark.submission.fileUrl)}&filename=${cleanName}.pdf`;
    window.location.assign(proxyUrl);
  };

  const handleSelect = async (s) => {
    setSelected(s); setFetchingEval(true); setScores({});
    try {
      const data = await apiRequest(`/faculty/weekly-evaluations/${s.id || s._id}`);
      setWeeklyMarks(data || []);
      const init = {};
      data.forEach(m => { init[m._id] = m.facultyMarks !== null && m.facultyMarks !== undefined ? m.facultyMarks : ''; });
      setScores(init);
    } catch { } finally { setFetchingEval(false); }
  };

  const handleScoreChange = (id, val) => {
    const n = Number(val);
    if (val !== '' && (n < 0 || n > 10)) return; // enforce /10
    setScores(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = async () => {
    // Only send marks that have a value
    const gradesToSend = Object.keys(scores)
      .filter(id => scores[id] !== '' && scores[id] !== null)
      .map(id => ({
        markId: id,
        facultyMarks: Number(scores[id])
      }));

    if (gradesToSend.length === 0) {
      showToast.error('Please enter at least one mark.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/faculty/weekly-evaluations/${selected.id || selected._id}`, {
        method: 'POST',
        body: { grades: gradesToSend }
      });
      showToast.success('Weekly grades saved successfully.');
      handleSelect(selected);
    } catch (err) { showToast.error(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" /></div>;

  const { avg, pct, grade } = selected ? calcStats(weeklyMarks, scores, selected.isFreelance) : {};

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Grade Internship</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Assign a mark out of <span className="font-black text-gray-700">10</span> per weekly assignment. The student's final grade is the average.
          </p>
        </div>
        {selected && (
          <Button variant="outline" onClick={() => { setSelected(null); setWeeklyMarks([]); }} className="rounded-xl font-bold uppercase tracking-widest text-xs">
            <i className="fas fa-arrow-left mr-2" /> Back to Interns
          </Button>
        )}
      </div>

      {!selected ? (
        /* Student List */
        <Card className="rounded-[2.5rem]">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight mb-5">Assigned Interns</h3>
          <DataTable columns={['Student', 'Reg. No.', 'Company', 'Track', 'Action']}>
            {students.length > 0 ? students.map(s => (
              <TableRow key={s.id || s._id}>
                <TableCell><strong>{s.name}</strong></TableCell>
                <TableCell muted>{s.reg}</TableCell>
                <TableCell>{s.company || 'Not Assigned'}</TableCell>
                <TableCell>
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-500">Weekly Track</span>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="primary" onClick={() => handleSelect(s)} className="rounded-xl font-black uppercase tracking-widest text-[9px]">
                    Grade Intern
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">No active interns found.</TableCell>
              </TableRow>
            )}
          </DataTable>
        </Card>
      ) : (
        /* Grading Panel */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: grade cards */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                    <i className="fas fa-user-edit" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-800">{selected.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selected.reg}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">All grades out of 10</span>
                  {weeklyMarks.length > 0 && weeklyMarks.some(m => !m.isFacultyGraded) && (
                    <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting} className="rounded-xl font-bold tracking-widest uppercase text-[10px] px-6 h-9 shadow-lg shadow-primary/10">
                      Save Grades
                    </Button>
                  )}
                </div>
              </div>

              {fetchingEval ? (
                <div className="py-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-gray-100 border-t-primary rounded-full animate-spin" /></div>
              ) : weeklyMarks.length === 0 ? (
                <p className="text-center py-12 text-gray-400 font-bold text-sm">No assignments submitted yet for this student.</p>
              ) : (
                <div className="space-y-3">
                  {weeklyMarks.map((mark, idx) => {
                    const myScore = scores[mark._id];
                    const hasScore = myScore !== '' && myScore !== undefined;
                    const pctRow = hasScore ? Math.round((Number(myScore) / 10) * 100) : null;
                    const gradeRow = pctRow !== null ? gradeFromPct(pctRow) : null;
                    const gc = gradeRow ? gradeColor(gradeRow) : null;
                    return (
                      <div key={mark._id} className="group p-4 border border-gray-100 rounded-2xl hover:border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 bg-gray-100 text-gray-500 text-[9px] font-black rounded-md flex items-center justify-center">{idx + 1}</span>
                            <p className="font-bold text-gray-800 text-sm">{mark.assignment?.title}</p>
                            {mark.submission && (
                              <button
                                onClick={() => handleDownload(mark)}
                                className="w-6 h-6 rounded bg-primary/5 text-primary hover:bg-primary/10 border-0 flex items-center justify-center cursor-pointer ml-1"
                                title="Download Submission"
                              >
                                <i className="fas fa-download text-[10px]" />
                              </button>
                            )}
                          </div>
                          {mark.isSiteSupervisorGraded && mark.siteSupervisorRemarks !== 'Freelance Track - Auto bypassed site supervisor' ? (
                            <p className="text-[10px] text-emerald-600 font-bold">Site Supervisor: {mark.siteSupervisorMarks} / 10</p>
                          ) : mark.siteSupervisorRemarks?.includes('Freelance') ? (
                            <p className="text-[10px] text-indigo-500 font-bold">Freelance Track — no site supervisor</p>
                          ) : (
                            <p className="text-[10px] text-gray-400">Site supervisor hasn't graded yet.</p>
                          )}
                          {!mark.submission && (
                            <p className="text-[8px] text-rose-400 font-bold uppercase tracking-widest mt-1">Pending Submission</p>
                          )}
                          {/* per-row progress bar */}
                          {hasScore && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pctRow}%`, backgroundColor: GRADE_COLORS[gradeRow] || '#94a3b8' }} />
                              </div>
                              <span className="text-[9px] font-black text-gray-400">{pctRow}%</span>
                            </div>
                          )}
                        </div>
                        {/* input */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Grade</label>
                          <div className="relative">
                            <input
                              type="number" min="0" max="10"
                              className={`w-16 p-2 text-center border-2 rounded-xl outline-none font-black text-lg transition-colors ${mark.isFacultyGraded ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:border-primary text-primary'}`}
                              value={myScore}
                              onChange={e => handleScoreChange(mark._id, e.target.value)}
                              placeholder="—"
                              disabled={mark.isFacultyGraded}
                            />
                            <span className="absolute -bottom-4 left-0 right-0 text-center text-[8px] font-bold text-gray-300">/ 10</span>
                          </div>
                          {gradeRow && (
                            <div className="mt-5 flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${gc.bg} ${gc.text} ${gc.border}`}>{gradeRow}</span>
                              {mark.isFacultyGraded && <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Finalized</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </Card>
          </div>

          {/* Right: running summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5">Running Average</h4>
              {avg !== null ? (
                <>
                  {/* Circular ring */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-28 h-28">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none"
                          stroke={grade === 'F' ? '#ef4444' : grade.startsWith('A') ? '#10b981' : grade.startsWith('B') ? '#3b82f6' : '#f59e0b'}
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-gray-800">{pct}%</span>
                        <span className="text-[10px] font-bold text-gray-400">{avg}/10</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <GradeBadge grade={grade} />
                    <p className="text-[10px] font-bold text-gray-400">Grade Points: {gradePointsFromPct(pct)}</p>
                    <span className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-[10px] font-black border ${pct >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      <i className={`fas text-[8px] ${pct >= 50 ? 'fa-check' : 'fa-times'}`} />{pct >= 50 ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-gray-300">
                  <i className="fas fa-chart-pie text-3xl block mb-2 opacity-40" />
                  <p className="text-xs font-bold">Enter marks to see live grade.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// needed for inline progress bars
const GRADE_COLORS = {
  A: '#10b981', 'A-': '#34d399', 'B+': '#3b82f6', B: '#60a5fa', 'B-': '#93c5fd',
  'C+': '#f59e0b', C: '#fbbf24', 'C-': '#f97316', 'D+': '#fb923c', D: '#ef4444', F: '#dc2626'
};
