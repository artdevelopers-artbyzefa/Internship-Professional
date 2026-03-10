import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../utils/api.js';
import DataTable from '../../components/ui/DataTable.jsx';

const ITEMS_PER_PAGE = 15;

export default function RegisteredStudents({ user }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const isSupervisor = user?.role === 'site_supervisor';
    const isFaculty = user?.role === 'faculty_supervisor';

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        try {
            let endpoint = '/office/registered-students';
            if (isSupervisor) {
                endpoint = '/supervisor/interns';
            } else if (isFaculty) {
                const userId = user?.id || user?._id;
                if (userId) endpoint = `/office/registered-students?facultyId=${userId}`;
            }

            const data = await apiRequest(endpoint);
            setStudents(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return students;
        const q = search.toLowerCase();
        return students.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.reg?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.assignedCompany?.toLowerCase().includes(q) ||
            s.assignedFaculty?.name?.toLowerCase().includes(q) ||
            s.assignedSiteSupervisor?.name?.toLowerCase().includes(q) ||
            s.assignedCompanySupervisor?.toLowerCase().includes(q)
        );
    }, [students, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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
            render: v => v ? <span className="font-semibold text-gray-700">{v}</span> : <span className="text-gray-300 italic">Not Assigned</span>
        },
        {
            key: 'assignedSiteSupervisor',
            label: 'Site Supervisor',
            render: (val, row) => {
                const name = val?.name || row.assignedCompanySupervisor;
                const email = val?.email;
                if (!name) return <span className="text-gray-300 italic">Pending</span>;
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
                if (!val) return <span className="text-gray-300 italic">Pending</span>;
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
            render: (val) => {
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

    if (loading) return <div className="py-20 text-center"><i className="fas fa-circle-notch fa-spin text-3xl text-primary opacity-30"></i></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                            {isSupervisor ? 'My Assigned Interns' : 'Placement Directory'}
                        </h2>
                        <p className="text-sm text-gray-400 font-medium mt-1">
                            {isSupervisor
                                ? `Students assigned to you for industrial supervision.`
                                : isFaculty ? 'Students assigned to you for faculty supervision.' : 'Comprehensive view of all students and their respective supervisors.'}
                        </p>
                    </div>
                    <div className="relative group">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm group-focus-within:text-primary transition-colors"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search directory..."
                            className="pl-11 pr-4 py-3 border border-gray-100 rounded-2xl text-sm font-medium text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 w-80 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-50 pt-6">
                    {paginated.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                                <i className="fas fa-user-slash text-gray-300"></i>
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No matching records found</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden">
                            <DataTable columns={columns} data={paginated} />
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-8 mt-6 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest">
                            Showing <span className="text-gray-700">{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</span> of {filtered.length}
                        </p>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-10 h-10 rounded-xl border border-gray-100 text-gray-400 text-xs font-bold hover:bg-gray-50 disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:cursor-not-allowed"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer shadow-sm ${p === page ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-gray-100 text-gray-400 hover:border-primary/30 hover:text-primary'}`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="w-10 h-10 rounded-xl border border-gray-100 text-gray-400 text-xs font-bold hover:bg-gray-50 disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:cursor-not-allowed"
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
