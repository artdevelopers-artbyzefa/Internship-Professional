import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import { apiRequest } from '../../utils/api.js';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';

export default function HODArchive() {
    const [archives, setArchives] = useState([]);
    const [selected, setSelected] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiRequest('/office/archives')
            .then(data => setArchives(data || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="py-20 text-center"><i className="fas fa-circle-notch fa-spin text-primary text-3xl"></i></div>;

    if (selectedStudent) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center text-xl">
                            <i className="fas fa-user-graduate" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-800 tracking-tight">{selectedStudent.name}</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Reg: {selectedStudent.reg} · {selectedStudent.company}</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="px-4 py-2 bg-gray-50 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors">
                        <i className="fas fa-arrow-left mr-2" /> Back to Cycle
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="rounded-[2.5rem]">
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i className="fas fa-tasks text-indigo-500" /> Assignment Records
                        </h3>
                        {selectedStudent.marks?.length > 0 ? (
                            <div className="space-y-4">
                                {selectedStudent.marks.map((m, i) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-sm font-bold text-gray-700">{m.title}</h4>
                                            <span className="text-xs font-black text-primary bg-white px-2 py-1 rounded-lg border border-gray-100">{m.marks} / {m.totalMarks}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Faculty Score</p>
                                                <p className="text-xs font-bold text-gray-600">{m.facultyMarks || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Site Score</p>
                                                <p className="text-xs font-bold text-gray-600">{m.siteSupervisorMarks || 0}</p>
                                            </div>
                                        </div>
                                        {(m.facultyRemarks || m.siteSupervisorRemarks) && (
                                            <div className="mt-3 pt-3 border-t border-gray-200/50">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Feedback</p>
                                                <p className="text-[10px] text-gray-500 leading-relaxed italic">
                                                    {m.facultyRemarks || m.siteSupervisorRemarks}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">No mark records found.</p>
                        )}
                    </Card>

                    <Card className="rounded-[2.5rem]">
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i className="fas fa-clipboard-check text-emerald-500" /> Professional Evaluations
                        </h3>
                        {selectedStudent.evaluations?.length > 0 ? (
                            <div className="space-y-4">
                                {selectedStudent.evaluations.map((e, i) => (
                                    <div key={i} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">{e.title}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{new Date(e.submittedAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed mb-4">{e.feedback}</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-400">
                                                    <i className="fas fa-user-tie" />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{e.evaluatorName}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Performance Score</p>
                                                <p className="text-sm font-black text-emerald-600">{e.score}/10</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">No evaluations found.</p>
                        )}
                    </Card>
                </div>
            </div>
        );
    }

    if (selected) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 tracking-tight">{selected.cycleName}</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Archived on {new Date(selected.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="px-4 py-2 bg-gray-50 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors">
                        <i className="fas fa-arrow-left mr-2" /> Back
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="text-2xl font-black text-gray-800">{selected.statistics.totalStudents}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Students</div>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="text-2xl font-black text-emerald-600">{selected.statistics.totalPassed}</div>
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Passed</div>
                    </div>
                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm">
                        <div className="text-2xl font-black text-rose-600">{selected.statistics.totalFailed}</div>
                        <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Failed</div>
                    </div>
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                        <div className="text-2xl font-black text-indigo-600">{selected.statistics.averagePercentage.toFixed(1)}%</div>
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Avg. Batch Score</div>
                    </div>
                </div>

                <Card className="rounded-[2.5rem]">
                    <h3 className="text-lg font-black text-gray-800 tracking-tight mb-5">Student Performance Summary</h3>
                    <DataTable columns={['Student', 'Reg. No.', 'Company', 'Grade', 'Status', 'Action']}>
                        {selected.students.map((s, idx) => (
                            <TableRow key={idx}>
                                <TableCell><strong>{s.name}</strong></TableCell>
                                <TableCell muted>{s.reg}</TableCell>
                                <TableCell><span className="text-xs font-bold text-gray-500">{s.company}</span></TableCell>
                                <TableCell><span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${s.percentage >= 50 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{s.grade}</span></TableCell>
                                <TableCell><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${s.percentage >= 50 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>{s.percentage >= 50 ? 'Pass' : 'Fail'}</span></TableCell>
                                <TableCell>
                                    <button onClick={() => setSelectedStudent(s)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors border-0 cursor-pointer" title="View Dossier">
                                        <i className="fas fa-file-invoice text-sm" />
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </DataTable>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">Institutional Memory (Archives)</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Access performance records and statistics from previous internship cycles.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archives.length > 0 ? archives.map(arc => (
                    <div key={arc._id} onClick={() => setSelected(arc)} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                                <i className="fas fa-box-archive" />
                            </div>
                            <span className="text-xs font-black text-gray-300 group-hover:text-primary transition-colors">View Details <i className="fas fa-arrow-right ml-1" /></span>
                        </div>
                        <h4 className="text-lg font-black text-gray-800 mb-1">{arc.cycleName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Year: {arc.year}</p>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                            <div>
                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Students</div>
                                <div className="text-xl font-black text-gray-800">{arc.statistics.totalStudents}</div>
                            </div>
                            <div>
                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Pass Rate</div>
                                <div className="text-xl font-black text-emerald-500">{Math.round((arc.statistics.totalPassed / (arc.statistics.totalStudents || 1)) * 100)}%</div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-center">
                        <i className="fas fa-database text-4xl text-gray-100 mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No archived cycles found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
