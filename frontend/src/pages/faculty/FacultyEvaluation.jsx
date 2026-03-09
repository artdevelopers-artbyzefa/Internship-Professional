import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';

export default function FacultyEvaluation({ user }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState({ technical: 0, professional: 0, reports: 0, presentation: 0 });
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fetchingEval, setFetchingEval] = useState(false);

  const maxes = { technical: 50, professional: 30, reports: 40, presentation: 30 };
  const total = Object.values(marks).reduce((s, v) => s + Number(v), 0);
  const maxTotal = Object.values(maxes).reduce((s, v) => s + v, 0);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await apiRequest('/evaluation/students');
      setStudents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setFetchingEval(true);
    try {
      const evalData = await apiRequest(`/evaluation/${student._id}`);
      if (evalData) {
        setMarks(evalData.marks || { technical: 0, professional: 0, reports: 0, presentation: 0 });
        setComments(evalData.comments || '');
      } else {
        setMarks({ technical: 0, professional: 0, reports: 0, presentation: 0 });
        setComments('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingEval(false);
    }
  };

  const handleSubmit = async (finalize = false) => {
    setSubmitting(true);
    try {
      await apiRequest('/evaluation/submit', {
        method: 'POST',
        body: {
          studentId: selectedStudent._id,
          marks,
          comments,
          finalize
        }
      });
      showToast.success(`Evaluation ${finalize ? 'finalized' : 'saved as draft'} successfully.`);
      if (finalize) {
        // Update local student status
        setStudents(students.map(s => s._id === selectedStudent._id ? { ...s, evaluationStatus: 'Submitted', isGraded: true } : s));
        setSelectedStudent(null);
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20"><i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Technical Evaluation</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Assessment of student's professional conduct and technical deliverables.
          </p>
        </div>
        {selectedStudent && (
          <Button variant="outline" onClick={() => setSelectedStudent(null)}>
            <i className="fas fa-arrow-left mr-2"></i> Back to List
          </Button>
        )}
      </div>

      {!selectedStudent ? (
        <Card>
          <h3 className="text-lg font-bold text-gray-800 tracking-tight mb-5">Assigned Interns</h3>
          <DataTable columns={['Student Name', 'Reg. No.', 'Company', 'Eval. Status', 'Action']}>
            {students.length > 0 ? (
              students.map(s => (
                <TableRow key={s._id}>
                  <TableCell><strong>{s.name}</strong></TableCell>
                  <TableCell muted>{s.reg}</TableCell>
                  <TableCell>{s.company}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${s.evaluationStatus === 'Submitted' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                      {s.evaluationStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant={s.isGraded ? 'secondary' : 'primary'} onClick={() => handleSelectStudent(s)}>
                      {s.isGraded ? 'Update' : 'Evaluate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400">No students found for evaluation.</TableCell>
              </TableRow>
            )}
          </DataTable>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                    <i className="fas fa-user-edit"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-800 tracking-tight">{selectedStudent.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedStudent.reg}</p>
                  </div>
                </div>
              </div>

              {fetchingEval ? (
                <div className="py-10 text-center"><i className="fas fa-circle-notch fa-spin text-primary"></i></div>
              ) : (
                <div className="space-y-8">
                  {[
                    { label: 'Technical Proficiency', key: 'technical', max: 50, icon: 'fa-code', desc: 'Efficiency in project tasks and code quality.' },
                    { label: 'Professionalism & Conduct', key: 'professional', max: 30, icon: 'fa-user-tie', desc: 'Punctuality, ethics, and team collaboration.' },
                    { label: 'Weekly Reporting Quality', key: 'reports', max: 40, icon: 'fa-file-lines', desc: 'Clarity, regularity, and depth of documentation.' },
                    { label: 'Mid-term / Final Presentation', key: 'presentation', max: 30, icon: 'fa-chalkboard-user', desc: 'Presentation skills and clarity of communication.' }
                  ].map((item) => (
                    <div key={item.key} className="group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <i className={`fas ${item.icon} text-xs`}></i>
                          </div>
                          <div>
                            <label className="text-xs font-black text-gray-700 uppercase tracking-tight">{item.label}</label>
                            <p className="text-[9px] text-gray-400 font-medium">{item.desc}</p>
                          </div>
                        </div>
                        <div className="text-xs font-black text-gray-400">MAX: {item.max}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <input
                          type="range"
                          min="0"
                          max={item.max}
                          value={marks[item.key]}
                          onChange={e => setMarks({ ...marks, [item.key]: Number(e.target.value) })}
                          className="flex-1 accent-primary h-1.5 rounded-full bg-gray-100 appearance-none cursor-pointer"
                        />
                        <input
                          type="number"
                          min="0"
                          max={item.max}
                          value={marks[item.key]}
                          onChange={e => setMarks({ ...marks, [item.key]: Number(e.target.value) })}
                          className="w-16 h-10 border border-gray-100 rounded-xl text-center font-black text-sm text-primary focus:border-primary outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-4">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-tight block mb-3">Evaluator Comments</label>
                    <textarea
                      rows={4}
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="Provide detailed feedback on the student's performance..."
                      className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b pb-4">Consolidated Score</h3>
              <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-900/20">
                <div className="relative z-10">
                  <div className="text-5xl font-black tracking-tighter mb-2">{total}</div>
                  <div className="h-px bg-white/10 w-full mb-4"></div>
                  <div className="flex items-end justify-between">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aggregate Score</div>
                    <div className="text-lg font-black text-primary-light bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                      {Math.round((total / maxTotal) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Button
                  block
                  variant="primary"
                  size="lg"
                  className="h-14 rounded-2xl shadow-lg shadow-primary/20"
                  onClick={() => handleSubmit(true)}
                  loading={submitting}
                >
                  Finalize &amp; Lock Evaluaton
                </Button>
                <Button
                  block
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl"
                  onClick={() => handleSubmit(false)}
                  loading={submitting}
                >
                  <i className="fas fa-floppy-disk mr-2"></i> Save Progress
                </Button>
              </div>

              <p className="mt-6 text-[10px] text-gray-400 font-medium leading-relaxed text-center">
                <i className="fas fa-info-circle mr-1"></i>
                Finalized evaluations are sent to the Internship Office and cannot be modified without an administrative reset.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
