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
                    {row.secondaryEmail && (
                        <span className="text-[10px] text-primary/70 font-semibold italic mt-0.5" title="Secondary Email">
                            <i className="fas fa-envelope-open-text mr-1 text-[8px]"></i>
                            {row.secondaryEmail}
                        </span>
                    )}
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
        },
        {
            key: 'whatsappNumber',
            label: 'Mobile Number',
            render: (val, row) => {
                const number = val || row.internshipAgreement?.whatsappNumber || row.internshipAgreement?.contactNumber;
                return (
                    <div className="flex flex-col min-w-[140px]">
                        {number ? (
                            <a 
                                href={`https://wa.me/${number.replace(/[^0-9]/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                title="Click to open WhatsApp"
                                className="group flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold hover:bg-emerald-600 hover:text-white transition-all w-max shadow-sm"
                            >
                                <i className="fab fa-whatsapp text-base"></i>
                                <span className="text-xs">{number}</span>
                            </a>
                        ) : (
                            <span className="px-3 py-2 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 text-[10px] font-black uppercase tracking-widest w-max opacity-80">
                                <i className="fas fa-exclamation-triangle mr-1"></i> Missing
                            </span>
                        )}
                    </div>
                );
            }
        }
    ];

    const [selectedIds, setSelectedIds] = useState([]);

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === students.length) setSelectedIds([]);
        else setSelectedIds(students.map(s => s._id));
    };

    const handleEmailSelected = () => {
        if (selectedIds.length === 0) return;
        navigate('/office/email-center', { state: { selectedRecipients: selectedIds } });
    };

    const isOffice = user?.role === 'internship_office';

    // Update columns to include checkbox
    const selectColumn = {
        key: 'select',
        label: (
            <input 
                type="checkbox" 
                checked={selectedIds.length === students.length && students.length > 0} 
                onChange={toggleAll}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
        ),
        render: (_, row) => (
            <input 
                type="checkbox" 
                checked={selectedIds.includes(row._id)} 
                onChange={() => toggleSelect(row._id)}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
        )
    };

    const columns = isSupervisor 
        ? supervisorColumns 
        : isOffice 
            ? [selectColumn, ...officeColumns]
            : officeColumns;

    return (
        <div className="space-y-6 pb-20">
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200/60 p-4 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center text-xl flex-shrink-0 border border-primary/10">
                        <i className={`fas ${isSupervisor ? 'fa-user-check' : 'fa-users-viewfinder'}`} />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
                            {isSupervisor ? 'My Assigned Interns' : 'Student Records'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] md:text-sm text-gray-400 font-medium uppercase tracking-wider block">
                                {isSupervisor
                                    ? `Active student placements`
                                    : isFaculty ? 'Faculty supervision log' : 'Institutional student registry'}
                            </p>
                            {selectedIds.length > 0 && (
                                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {selectedIds.length} selected
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    {selectedIds.length > 0 && isOffice && (
                        <button
                            onClick={handleEmailSelected}
                            className="w-full sm:w-auto px-6 py-3 bg-primary text-white text-xs font-black rounded-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <i className="fas fa-paper-plane"></i>
                            Email Selected
                        </button>
                    )}
                    <div className="relative group w-full lg:w-80">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm group-focus-within:text-primary transition-all duration-300"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); setSelectedIds([]); }}
                            placeholder="Search by name or reg..."
                            className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 w-full transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="relative min-h-[400px]">
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
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 mt-6 border-t border-gray-100">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none order-2 sm:order-1">
                            Showing <span className="text-slate-700">{(page - 1) * 15 + 1}–{Math.min(page * 15, totalResults)}</span> of {totalResults}
                        </p>
                        <div className="flex items-center gap-3 order-1 sm:order-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-2xl border border-slate-200 text-slate-400 text-sm font-bold hover:bg-white hover:border-primary hover:text-primary active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:cursor-not-allowed bg-slate-50"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>

                            <div className="flex items-center gap-2 px-4 h-10 md:h-12 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                <span className="text-xs font-black text-primary">{page}</span>
                                <span className="text-[10px] font-black text-slate-300">/</span>
                                <span className="text-xs font-black text-slate-400">{totalPages}</span>
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-2xl border border-slate-200 text-slate-400 text-sm font-bold hover:bg-white hover:border-primary hover:text-primary active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:cursor-not-allowed bg-slate-50"
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
