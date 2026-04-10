import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';

export default function PremiumReportPreview() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const archiveId = searchParams.get('archiveId');

    useEffect(() => {
        const endpoint = archiveId
            ? `/reports/hod-premium-stats/${archiveId}`
            : '/reports/hod-premium-stats';
        apiRequest(endpoint)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [archiveId]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
    );

    if (!data) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-500 font-bold p-10 text-center">
            Critical Error: Unable to fetch institutional datasets. Contact system administrator.
        </div>
    );

    const isArchive = !!archiveId;
    const cycleLabel = data.cycleName || `${new Date().getFullYear()} internship cycle`;

    return (
        <div className="min-h-screen bg-slate-100 py-10 print:py-0 print:bg-white selection:bg-slate-200">
            {/* Action Bar */}
            <div className="fixed top-6 right-6 flex items-center gap-2 print:hidden z-50">
                <button onClick={() => navigate(-1)} className="px-5 py-2 bg-white text-slate-700 rounded-lg font-bold text-sm shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
                    Back
                </button>
                <button onClick={() => window.print()} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm shadow-lg hover:bg-black transition-all">
                    Print Official Report
                </button>
            </div>

            <div className="max-w-[900px] mx-auto bg-white shadow-xl print:shadow-none print:w-full overflow-hidden">
                {/* Header Decoration */}
                <div className="h-1 bg-slate-900 w-full" />

                <div className="p-12 md:p-20">
                    {/* Official Banner */}
                    <div className="flex items-center justify-between mb-16 border-b pb-10">
                        <div className="flex items-center gap-6">
                            <img src="/cuilogo.png" alt="University Logo" className="w-20" />
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 leading-tight">COMSATS University Islamabad</h1>
                                <p className="text-sm font-semibold text-slate-500 mt-1">Abbottabad Campus • Department of Computer Science</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {isArchive && <div className="text-[9px] font-black text-amber-500 mb-1 uppercase tracking-wider">Archived Cycle Report</div>}
                            <div className="text-[10px] font-black text-slate-400 mb-1">Internal audit log</div>
                            <div className="text-sm font-mono font-bold text-slate-800">{data.generatedAt.date}</div>
                        </div>
                    </div>

                    {/* Report Title Section */}
                    <div className="mb-16">
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Official Internship Performance Report</h2>
                        <div className="w-20 h-1.5 bg-slate-900 mb-6" />
                        <p className="text-slate-600 leading-relaxed text-sm max-w-2xl">
                            This document serves as the official analytical record of the {cycleLabel}. 
                            It includes system objectives, role responsibilities, workflow compliance, and academic performance metrics required for HEC accreditation.
                        </p>
                    </div>

                    {/* 1. Introduction */}
                    <section className="mb-12">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">1. Introduction</h3>
                        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                            <p><strong>Background:</strong> The Department of Computer Science at COMSATS Abbottabad facilitates professional internships to bridge the gap between academic theory and industry practice.</p>
                            <p><strong>Need for Portal:</strong> Digitization eliminates manual paperwork, ensures real-time tracking of student progress, and provides verified data for institutional audits.</p>
                            <p><strong>Scope:</strong> This system integrates site supervisors (industry), faculty supervisors (academic), internship office (admin), and HOD (governance).</p>
                        </div>
                    </section>

                    {/* 2. System Objectives */}
                    <section className="mb-12">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">2. System Objectives</h3>
                        <ul className="list-disc ml-5 space-y-2 text-sm text-slate-600">
                            <li>Digitize internship registration, weekly log submission, and performance evaluation.</li>
                            <li>Provide role-based dashboards for transparent tracking of assigned interns.</li>
                            <li>Automatically generate HEC-compliant reports for academic record keeping.</li>
                            <li>Maintain a permanent audit trail for accreditation (HEC/NAAC/PEC).</li>
                        </ul>
                    </section>

                    {/* 3. User Roles */}
                    <section className="mb-12 page-break-before">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">3. Detailed User Responsibilities</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">3.1 Site Supervisor (Industry)</h4>
                                <ul className="text-xs text-slate-500 space-y-1.5">
                                    <li>• Verify company profile and intern placement.</li>
                                    <li>• Review/Add weekly task logs for assigned interns.</li>
                                    <li>• Submit Mid-Term and Final evaluations.</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">3.2 Faculty Supervisor (Academic)</h4>
                                <ul className="text-xs text-slate-500 space-y-1.5">
                                    <li>• Audit and approve submitted task logs.</li>
                                    <li>• Conduct site synchronization and record feedback.</li>
                                    <li>• Submit final academic grade based on rubric.</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">3.3 Internship Office</h4>
                                <ul className="text-xs text-slate-500 space-y-1.5">
                                    <li>• Manage institutional accounts and company registry.</li>
                                    <li>• Assign faculty supervisors to registered interns.</li>
                                    <li>• Verify clearance documents (Completion Certs).</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">3.4 Head of Department (HOD)</h4>
                                <ul className="text-xs text-slate-500 space-y-1.5">
                                    <li>• Oversee department-wide performance analytics.</li>
                                    <li>• Provide final sign-off for internship completion.</li>
                                    <li>• Execute overrides in exceptional administrative cases.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* 4. Functional Modules */}
                    <section className="mb-12">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">4. Functional Modules</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="p-4 bg-slate-50 rounded-lg border"><strong>Registration:</strong> Student submissions, offer letter verification, and faculty mapping.</div>
                            <div className="p-4 bg-slate-50 rounded-lg border"><strong>Task Logs:</strong> Bi-directional approval workflow for weekly professional logs.</div>
                            <div className="p-4 bg-slate-50 rounded-lg border"><strong>Evaluation:</strong> Rubric-based scoring from both site and academic supervisors.</div>
                        </div>
                    </section>

                    {/* 5. Workflow */}
                    <section className="mb-12">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">5. Operational Workflow</h3>
                        <div className="p-6 bg-slate-900 text-slate-300 rounded-xl font-mono text-[11px] leading-relaxed">
                            1. Registration (Student) → 2. Verification (Office) → 3. Assignment (Faculty) → 
                            4. Task Logs (Site) → 5. Approval (Faculty) → 6. Final Evaluation (Both) → 7. Completion (HOD)
                        </div>
                    </section>

                    {/* 6. Implementation Plan */}
                    <section className="mb-16 page-break-before">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">6. Implementation Timeline</h3>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left border-b bg-slate-50">
                                    <th className="px-4 py-3 font-bold text-slate-700">Phase</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Scope</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Deliverable</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.phases.map(p => (
                                    <tr key={p._id}>
                                        <td className="px-4 py-3 font-bold text-slate-900">{p.key.replace('_', ' ')}</td>
                                        <td className="px-4 py-3 text-slate-500">{p.label}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{p.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* 9.1 Internship Completion Statistics */}
                    <section className="mb-12">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">7. Completion Statistics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-5 border rounded-xl text-center">
                                <div className="text-xs font-bold text-slate-400 mb-1">Total registered</div>
                                <div className="text-2xl font-black text-slate-900">{data.compStats.total}</div>
                            </div>
                            <div className="p-5 border rounded-xl text-center">
                                <div className="text-xs font-bold text-slate-400 mb-1">Completed</div>
                                <div className="text-2xl font-black text-emerald-600">{data.compStats.completed}</div>
                            </div>
                            <div className="p-5 border rounded-xl text-center">
                                <div className="text-xs font-bold text-slate-400 mb-1">Active</div>
                                <div className="text-2xl font-black text-blue-600">{data.compStats.inProgress}</div>
                            </div>
                            <div className="p-5 border rounded-xl text-center">
                                <div className="text-xs font-bold text-slate-400 mb-1">Overdue (14 days+)</div>
                                <div className="text-2xl font-black text-rose-600">{data.compStats.overdue}</div>
                            </div>
                        </div>
                    </section>

                    {/* 9.2 Institutional Role Activity Summary */}
                    <section className="mb-12 page-break-before">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">8. Institutional Role Activity (Last 30 Days)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            {Object.entries(data.roleStats).map(([role, actions]) => (
                                <div key={role} className="p-4 bg-slate-50 border rounded-xl">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{role}</div>
                                    <div className="text-xl font-black text-slate-800">{actions} Actions</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Faculty Supervisor Performance */}
                    <section className="mb-12">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">9. Faculty Supervisor Performance Analysis</h3>
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 border-b">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-bold text-slate-700">Supervisor Name</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Interns Managed</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Evals Completed</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Completion Rate</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Cohort Avg</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.facultyPerformance.map(f => (
                                    <tr key={f.name}>
                                        <td className="px-4 py-4 font-bold text-slate-900">{f.name}</td>
                                        <td className="px-4 py-4 font-bold text-slate-600">{f.students}</td>
                                        <td className="px-4 py-4 font-bold text-slate-600">{f.gradedCount}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-slate-800 rounded-full" style={{ width: `${f.completionPct}%` }} />
                                                </div>
                                                <span className="font-bold text-slate-800">{f.completionPct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-indigo-600">{f.avgScoreGiven}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* Site Supervisor Performance */}
                    <section className="mb-12 page-break-before">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">10. Site Supervisor Industry Activity</h3>
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 border-b">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-bold text-slate-700">Industry Expert</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Organization</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Interns Subscribed</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Mid/Final Evals</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Avg Score Given</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.siteSupervisorPerformance.map(ss => (
                                    <tr key={ss.name}>
                                        <td className="px-4 py-4 font-bold text-slate-900">{ss.name}</td>
                                        <td className="px-4 py-4 text-slate-500 font-medium">{ss.company}</td>
                                        <td className="px-4 py-4 font-bold text-slate-600">{ss.students}</td>
                                        <td className="px-4 py-4 font-bold text-emerald-600">{ss.evalsCompleted}</td>
                                        <td className="px-4 py-4 font-bold text-indigo-600">{ss.avgScoreGiven}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* 9.3 Company Participation Report */}
                    <section className="mb-12">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">11. Company Participation Report</h3>
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 border-b">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-bold text-slate-700">Organization Name</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Total Placement</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Site Supervisors</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Mean Efficiency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.companyReports.map(report => (
                                    <tr key={report.name}>
                                        <td className="px-4 py-4 font-bold text-slate-900">{report.name}</td>
                                        <td className="px-4 py-4 text-slate-600">{report.interns}</td>
                                        <td className="px-4 py-4 text-slate-600">{report.supervisors}</td>
                                        <td className="px-4 py-4 font-bold text-slate-900 tracking-tight">{report.avgGrade}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* 9.5 Grade Distribution */}
                    <section className="mb-12 page-break-before">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">12. Grade Distribution (Completed Interns)</h3>
                        <div className="flex flex-wrap gap-4">
                            {data.gradeDist.map(g => (
                                <div key={g.grade} className="flex-1 min-w-[120px] p-5 bg-slate-50 border rounded-xl text-center">
                                    <div className="text-2xl font-black text-slate-900 mb-1">{g.grade}</div>
                                    <div className="text-xs font-bold text-slate-400">{g.count} interns</div>
                                    <div className="text-[10px] font-black text-slate-800 mt-1">{g.pct}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 9.6 Bottleneck Report */}
                    <section className="mb-12">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b text-rose-800 border-rose-100">13. Bottleneck & Exception Report</h3>
                        <div className="space-y-4">
                            <div className="p-5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-4">
                                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold text-xs">!</div>
                                <div>
                                    <h4 className="font-bold text-rose-900 text-sm mb-1">Pending academic approvals</h4>
                                    <p className="text-xs text-rose-700 italic">Currently {data.roleActivity['Faculty Supervisor'].pending} task logs are awaiting faculty verification (Average delay: 2.5 days).</p>
                                </div>
                            </div>
                            <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-4">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">?</div>
                                <div>
                                    <h4 className="font-bold text-amber-900 text-sm mb-1">Missing industry logs</h4>
                                    <p className="text-xs text-amber-800 italic">System detected {data.compStats.overdue} interns with zero activity recorded in the last 14 days.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Sub-report D: Exception/Overdue */}
                    <section className="mb-20">
                        <h3 className="text-xs font-black text-slate-400 mb-4">Report D: Comprehensive exception list</h3>
                        <div className="border rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        {['Student reg', 'Name', 'Organization', 'Academic supervisor', 'Efficacy %'].map(h => (
                                            <th key={h} className="px-4 py-3 font-bold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.buckets.bottom.slice(0, 5).map(s => (
                                        <tr key={s.reg} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4 font-mono font-bold text-slate-500">{s.reg}</td>
                                            <td className="px-4 py-4 font-black font-bold text-slate-900">{s.name}</td>
                                            <td className="px-4 py-4 text-slate-600 font-medium">{s.company}</td>
                                            <td className="px-4 py-4 text-slate-500 font-bold">{s.faculty}</td>
                                            <td className="px-4 py-4 font-bold text-rose-600">{s.percentage}%</td>
                                        </tr>
                                    ))}
                                    {data.buckets.bottom.length === 0 && (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic font-bold">No academic exceptions detected in the current cycle.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Sub-report E: Full Comprehensive Master Ledger */}
                    <section className="mb-20 page-break-before">
                        <h3 className="text-xs font-black text-slate-400 mb-4">Report E: Full Comprehensive Master Ledger</h3>
                        <div className="border rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        {['Student Identity', 'Reg. No', 'Organization', 'Final Grade'].map(h => (
                                            <th key={h} className="px-4 py-3 font-bold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.allStudentsList.map(s => (
                                        <tr key={s.reg} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4 font-black text-slate-900">{s.name}</td>
                                            <td className="px-4 py-4 font-mono font-bold text-slate-500">{s.reg}</td>
                                            <td className="px-4 py-4 text-slate-600 font-medium">{s.company}</td>
                                            <td className="px-4 py-4 font-black">
                                                <span className={`px-2 py-0.5 rounded ${s.grade === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {s.grade}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.allStudentsList.length === 0 && (
                                        <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400 italic font-bold">No students registered in the current cycle.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Footer */}
                    <div className="mt-20 pt-10 border-t flex justify-between items-center text-[10px] font-bold text-slate-300">
                        <div>DIMS Professional Portal • CUI Abbottabad</div>
                        <div>Restricted academic material</div>
                        <div>Page 01 of 01</div>
                    </div>
                </div>

                <div className="h-1 bg-slate-900 w-full" />
            </div>

            <style>{`
                @media print {
                    @page { margin: 0; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .print-hidden { display: none !important; }
                    .page-break-before { page-break-before: always; border: none !important; padding-top: 50px !important; }
                }
            `}</style>
        </div>
    );
}
