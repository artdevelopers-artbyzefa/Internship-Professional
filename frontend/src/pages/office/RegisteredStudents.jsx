import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiRequest } from '../../utils/api.js';
import DataTable from '../../components/ui/DataTable.jsx';

export default function RegisteredStudents({ user }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    const isSupervisor = user?.role === 'site_supervisor';
    const isFaculty = user?.role === 'faculty_supervisor';

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            let endpoint = '/office/registered-students';
            if (isSupervisor) {
                endpoint = '/supervisor/interns';
            } else if (isFaculty) {
                const userId = user?.id || user?._id;
                if (userId) endpoint = `/office/registered-students?facultyId=${userId}`;
            }

            // Append pagination and search params
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${endpoint}${separator}page=${page}&limit=15&search=${search}`;

            const response = await apiRequest(url);

            // Handle both legacy (array) and new (paginated object) responses
            if (response.data && Array.isArray(response.data)) {
                setStudents(response.data);
                setTotalPages(response.pages || 1);
                setTotalResults(response.total || response.data.length);
            } else if (Array.isArray(response)) {
                setStudents(response);
                setTotalPages(1);
                setTotalResults(response.length);
            } else {
                setStudents([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [isSupervisor, isFaculty, user, page, search]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchStudents();
        }, 300);
        return () => clearTimeout(timeout);
    }, [fetchStudents]);

    // Columns for site supervisor view (simple intern list)
    const supervisorColumns = [
        { key: 'reg', label: 'Reg #' },
        {
            key: 'name',
            label: 'Student Name',
            render: (val) => <span className="font-bold text-gray-800">{val}</span>
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => {
                const map = {
                    'Assigned': { bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100', label: 'Assigned' },
                };
                const cfg = map[val] || { bg: 'bg-gray-50 text-gray-500 border border-gray-100', label: val };
                return (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.bg}`}>
                        {cfg.label}
                    </span>
                );
            }
        }
    ];

    // Full columns for office/faculty/HOD view
    const officeColumns = [
        { key: 'reg', label: 'Registration #' },
        {
            key: 'name',
            label: 'Full Name',
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{val}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{row.email}</span>
                </div>
            )
        },
        {
            key: 'assignedCompany',
            label: 'Company',
            render: (v, row) => {
                if (row.internshipRequest?.mode === 'Freelance') {
                    const platform = row.internshipRequest?.freelancePlatform;
                    return <span className="font-semibold text-indigo-600">Freelancing {platform ? `(${platform})` : ''}</span>;
                }
                return v ? <span className="font-semibold text-gray-700">{v}</span> : <span className="text-gray-300 italic">Not Assigned</span>;
            }
        },
        {
            key: 'assignedSiteSupervisor',
            label: 'Site Supervisor',
            render: (val, row) => {
                if (row.internshipRequest?.mode === 'Freelance') {
                    return <span className="text-gray-400 font-black text-[10px] tracking-widest uppercase bg-gray-50 px-2 py-0.5 rounded">N/A</span>;
                }
                const name = val?.name || row.assignedCompanySupervisor;
                const email = val?.email;
                if (!name) return <span className="text-rose-500 font-black text-[10px] tracking-widest uppercase bg-rose-50 px-2 py-0.5 rounded">Ineligible</span>;
                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-rose-600">{name}</span>
                        {email && <span className="text-[10px] text-gray-400 font-medium">{email}</span>}
                    </div>
                );
            }
        },
        {
            key: 'assignedFaculty',
            label: 'Faculty Mentor',
            render: (val) => {
                if (!val) return <span className="text-rose-500 font-black text-[10px] tracking-widest uppercase bg-rose-50 px-2 py-0.5 rounded">Ineligible</span>;
                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-blue-600">{val.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{val.email}</span>
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Cycle Status',
            render: (val, row) => {
                // Determine eligibility based on supervisor assignments
                const isFreelance = row.internshipRequest?.mode === 'Freelance';
                const hasFaculty = !!row.assignedFaculty;
                const hasSiteSup = isFreelance || !!(row.assignedSiteSupervisor || row.assignedCompanySupervisor);

                const isOverallEligible = hasFaculty && hasSiteSup;

                if (!isOverallEligible) {
                    return (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                            Ineligible
                        </span>
                    );
                }

                const map = {
                    'Assigned': { bg: 'bg-primary text-white', label: 'Placement Confirmed' },
                    'Agreement Approved': { bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100', label: 'Ready for Assignment' },
                };
                const cfg = map[val] || { bg: 'bg-gray-50 text-gray-500 border border-gray-100', label: val };
                return (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.bg}`}>
                        {cfg.label}
                    </span>
                );
            }
        }
    ];

    const columns = isSupervisor ? supervisorColumns : officeColumns;

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200/60 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                            {isSupervisor ? 'My Assigned Interns' : 'Student Records'}
                        </h2>
                        <p className="text-sm text-gray-400 font-medium mt-1">
                            {isSupervisor
                                ? `Students assigned to you for industrial supervision.`
                                : isFaculty ? 'Students assigned to you for faculty supervision.' : 'Institutional student registry and placement monitoring.'}
                        </p>
                    </div>
                    <div className="relative group">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm group-focus-within:text-primary transition-all duration-300"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search records..."
                            className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 w-80 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6 relative min-h-[400px]">
                    {loading && (
                        <div className="absolute inset-x-0 top-6 bottom-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl">
                            <div className="w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin mb-3"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Student Records...</p>
                        </div>
                    )}

                    {students.length === 0 && !loading ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                                <i className="fas fa-user-slash text-slate-300"></i>
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No Results yet</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden">
                            <DataTable columns={columns} data={students} />
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-8 mt-6 border-t border-gray-100 gap-4">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none">
                            Showing <span className="text-slate-700">{(page - 1) * 15 + 1}–{Math.min(page * 15, totalResults)}</span> of {totalResults}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 text-xs font-bold hover:bg-white hover:border-primary hover:text-primary disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:cursor-not-allowed bg-slate-50"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>

                            <div className="flex items-center gap-1.5 px-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-primary">{page}</span>
                                <span className="text-[10px] font-black text-slate-300">/</span>
                                <span className="text-[10px] font-black text-slate-400">{totalPages}</span>
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 text-xs font-bold hover:bg-white hover:border-primary hover:text-primary disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:cursor-not-allowed bg-slate-50"
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
