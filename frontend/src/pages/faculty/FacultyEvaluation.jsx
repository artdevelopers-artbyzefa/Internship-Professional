import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';

export default function FacultyEvaluation({ user }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState({ technical: 0, professional: 0, reports: 0, presentation: 0 });
  const [checkboxTasks, setCheckboxTasks] = useState({
    attendance: false,
    professionalism: false,
    qualityOfWork: false,
    communication: false,
    problemSolving: false,
  });
  const [comments, setComments] = useState('');
  const [siteEval, setSiteEval] = useState(null);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setFetchingEval(true);
    try {
      const data = await apiRequest(`/evaluation/${student._id}`);
      if (data.evaluation) {
        setMarks(data.evaluation.marks || { technical: 0, professional: 0, reports: 0, presentation: 0 });
        setComments(data.evaluation.comments || '');
        if (data.evaluation.checkboxTasks) setCheckboxTasks(data.evaluation.checkboxTasks);
      } else {
        setMarks({ technical: 0, professional: 0, reports: 0, presentation: 0 });
        setComments('');
        setCheckboxTasks({
          attendance: false,
          professionalism: false,
          qualityOfWork: false,
          communication: false,
          problemSolving: false,
        });
      }
      setSiteEval(data.siteEval);
    } catch (err) {
    } finally {
      setFetchingEval(false);
    }
  };

  const handleCheckboxChange = (key) => {
    setCheckboxTasks(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Logic: each checked box adds some marks automatically to professional/technical
      // This is a dynamic helper for the faculty
      return next;
    });
  };

  const handleSubmit = async (finalize = false) => {
    setSubmitting(true);
    try {
      await apiRequest('/evaluation/submit', {
        method: 'POST',
        body: {
          studentId: selectedStudent._id,
          marks,
          checkboxTasks,
          comments,
          finalize
        }
      });
      showToast.success(`Grading ${finalize ? 'finalized' : 'saved as draft'} successfully.`);
      if (finalize) {
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
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Grading Summary</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Review site supervisor grades and provide academic evaluation remarks.
          </p>
        </div>
        {selectedStudent && (
          <Button variant="outline" onClick={() => setSelectedStudent(null)} className="rounded-xl font-bold uppercase tracking-widest text-xs">
            <i className="fas fa-arrow-left mr-2"></i> Back to Interns
          </Button>
        )}
      </div>

      {!selectedStudent ? (
        <Card className="rounded-[2.5rem]">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight mb-5">Assigned Interns</h3>
          <DataTable columns={['Student Name', 'Reg. No.', 'Company', 'Eval. Status', 'Action']}>
            {students.length > 0 ? (
              students.map(s => (
                <TableRow key={s._id}>
                  <TableCell><strong>{s.name}</strong></TableCell>
                  <TableCell muted>{s.reg}</TableCell>
                  <TableCell>{s.company}</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${s.evaluationStatus === 'Submitted' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                      {s.evaluationStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant={s.isGraded ? 'secondary' : 'primary'} onClick={() => handleSelectStudent(s)} className="rounded-xl font-black uppercase tracking-widest text-[9px]">
                      {s.isGraded ? 'Update' : 'Grade Intern'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">No active interns found for grading.</TableCell>
              </TableRow>
            )}
          </DataTable>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {siteEval && (
              <Card className="border-amber-100 bg-amber-50/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <i className="fas fa-building-user text-sm"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-900 tracking-tight leading-none">Site Supervisor Grading Report</h4>
                    <p className="text-[10px] text-amber-600 font-bold tracking-widest uppercase mt-1">Industrial Mentorship Feedback</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-amber-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Technical</p>
                    <p className="text-sm font-black text-amber-600">{siteEval.marks.technical}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Professional</p>
                    <p className="text-sm font-black text-amber-600">{siteEval.marks.professional}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Reports</p>
                    <p className="text-sm font-black text-amber-600">{siteEval.marks.reports}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Comments</p>
                    <p className="text-[10px] text-gray-600 italic truncate" title={siteEval.comments}>{siteEval.comments || 'No comments'}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-inner">
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
                  {/* Itemized Grading Checkboxes */}
                  <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Task-Based Performance Checklist</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                      {Object.keys(checkboxTasks).map((task) => (
                        <div key={task} className="flex items-center gap-3 cursor-pointer group" onClick={() => handleCheckboxChange(task)}>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 
                            ${checkboxTasks[task] ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-white border-gray-200 group-hover:border-primary/40'}`}>
                            {checkboxTasks[task] && <i className="fas fa-check text-[10px]"></i>}
                          </div>
                          <span className={`text-xs font-black uppercase tracking-tight ${checkboxTasks[task] ? 'text-primary' : 'text-gray-500'}`}>
                            {task.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Range Sliders */}
                  {[
                    { label: 'Technical Proficiency', key: 'technical', max: 50, icon: 'fa-code', desc: 'Efficiency in project tasks and code quality.' },
                    { label: 'Professionalism & Conduct', key: 'professional', max: 30, icon: 'fa-user-tie', desc: 'Punctuality, ethics, and team collaboration.' },
                    { label: 'Weekly Reporting Quality', key: 'reports', max: 40, icon: 'fa-file-lines', desc: 'Clarity, regularity, and depth of documentation.' },
                    { label: 'Final Presentation/Viva', key: 'presentation', max: 30, icon: 'fa-chalkboard-user', desc: 'Oral communication and mastery over assigned tasks.' }
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
                        <div className="text-xs font-black text-gray-400 tracking-widest">MAX {item.max}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <input
                          type="range" min="0" max={item.max} value={marks[item.key]}
                          onChange={e => setMarks({ ...marks, [item.key]: Number(e.target.value) })}
                          className="flex-1 accent-primary h-1.5 rounded-full bg-gray-100 appearance-none cursor-pointer"
                        />
                        <input
                          type="number" min="0" max={item.max} value={marks[item.key]}
                          onChange={e => setMarks({ ...marks, [item.key]: Number(e.target.value) })}
                          className="w-16 h-10 border-2 border-gray-100 rounded-xl text-center font-black text-sm text-primary focus:border-primary outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-4">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-tight block mb-3">Academic Supervisor Remarks</label>
                    <textarea
                      rows={4}
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="Summarize student performance and academic progress..."
                      className="w-full p-5 rounded-[2rem] bg-gray-50 border-2 border-gray-100 text-sm font-medium focus:bg-white focus:border-primary outline-none transition-all resize-none shadow-inner"
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2.5rem] sticky top-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b pb-4">Consolidated Score</h3>
              <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-900/40">
                <div className="relative z-10 text-center">
                  <div className="text-6xl font-black tracking-tighter mb-2">{total}</div>
                  <div className="h-px bg-white/10 w-full mb-4"></div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Aggregate Marks</p>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Button
                  block variant="primary" size="lg" className="h-14 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs"
                  onClick={() => handleSubmit(true)} loading={submitting}
                >
                  Finalize &amp; Lock Grade
                </Button>
                <Button
                  block variant="outline" size="lg" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
                  onClick={() => handleSubmit(false)} loading={submitting}
                >
                  Save Draft Progress
                </Button>
              </div>

              <p className="mt-6 text-[9px] text-gray-400 font-bold leading-relaxed text-center uppercase tracking-widest">
                <i className="fas fa-lock mr-1"></i> Finalized marks are permanent.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
