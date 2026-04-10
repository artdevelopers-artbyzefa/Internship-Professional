import React, { useState, useEffect, useCallback, useMemo, memo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

const DataTable = React.lazy(() => import('../../components/ui/DataTable.jsx'));

const StatusBadge = memo(({ status, isFreelance, hasFaculty, hasSiteSup }) => {
    const isEligible = hasFaculty && hasSiteSup;
    if (!isEligible) return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center w-full sm:w-fit gap-1 shadow-sm">
            <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
            Incomplete
        </span>
    );
    const map = {
        'Assigned': { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Placed' },
        'Agreement Approved': { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Agreement OK' },
        'Internship Approved': { cls: 'bg-blue-50 text-blue-800 border-blue-200', label: 'Approved' },
    };
    const cfg = map[status] || { cls: 'bg-slate-50 text-slate-500 border-slate-200', label: status?.split(' ').slice(-1)[0] || 'Active' };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border shadow-sm ${cfg.cls} flex items-center justify-center w-full sm:w-fit`}>
            {cfg.label}
        </span>
    );
});
StatusBadge.displayName = 'StatusBadge';

const RegisteredStudents = memo(({ user }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [currentPhase, setCurrentPhase] = useState(null);
    const [fetchingPhase, setFetchingPhase] = useState(true);

    const navigate = useNavigate();

    const isSupervisor = user?.role === 'site_supervisor';
    const isFaculty = user?.role === 'faculty_supervisor';
    const isOffice = user?.role === 'internship_office';

    const handleDownloadMarkSheet = async (id, name, reg) => {
        try {
            const blob = await apiRequest(`/faculty/mark-sheet/${id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reg}_MarkSheet.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast.success('Mark sheet generated successfully.');
        } catch (err) {
            // Error managed by apiRequest
        }
    };

    const handleBulkDownload = async () => {
        try {
            const blob = await apiRequest('/faculty/mark-sheet/bulk', { responseType: 'blob' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Faculty_Master_Ledger.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast.success('Master report generated successfully.');
        } catch (err) { }
    };

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const fetchStudents = useCallback(async (abortSignal) => {
        setLoading(true);
        setError(null);
        try {
            let endpoint = '/office/registered-students';
            if (isSupervisor) endpoint = '/supervisor/interns';
            else if (isFaculty) {
                const uid = user?.id || user?._id;
                if (uid) endpoint = `/office/registered-students?facultyId=${uid}`;
            }

            const sep = endpoint.includes('?') ? '&' : '?';
            const url = `${endpoint}${sep}page=${page}&limit=15&search=${debouncedSearch}`;
            const response = await apiRequest(url, { signal: abortSignal });

            if (response?.data && Array.isArray(response.data)) {
                setStudents(response.data);
                setTotalPages(response.pages || 1);
                setTotalResults(response.total || response.data.length);
            } else if (Array.isArray(response)) {
                setStudents(response);
                setTotalPages(1);
                setTotalResults(response.length);
            } else {
                setStudents([]);
                setTotalResults(0);
            }
            const phaseData = await apiRequest('/phases/current');
            setCurrentPhase(phaseData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setError('Failed to load student records. Please try again.');
                setStudents([]);
            }
        } finally {
            setLoading(false);
            setFetchingPhase(false);
        }
    }, [isSupervisor, isFaculty, user, page, debouncedSearch]);

    useEffect(() => {
        const controller = new AbortController();
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => fetchStudents(controller.signal));
        } else {
            fetchStudents(controller.signal);
        }
        return () => controller.abort();
    }, [fetchStudents]);

    const LIMIT = 15;

    const tableColumns = useMemo(() => isSupervisor ? [
        { key: 'reg', label: 'Registration #' },
        {
            key: 'name',
            label: 'Intern Identity',
            render: (v, r) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-800 text-xs md:text-sm">{r.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{r.reg}</span>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: () => <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">Active</span>
        },
        {
            label: 'Action',
            key: 'action',
            render: (_, r) => {
                const rolePath = user?.role === 'internship_office' ? 'office' : (user?.role === 'site_supervisor' ? 'supervisor' : 'faculty');
                const isEvaluationPhase = currentPhase?.order >= 4;

                if (!isEvaluationPhase && !isOffice && user?.role !== 'hod') return <span className="text-[10px] text-slate-400 font-bold italic">Wait Phase 4</span>;

                return (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate(`/${rolePath}/students/${r._id || r.id}`)}
                            className="h-8 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                        >
                            Profile
                        </button>
                        <button
                            onClick={() => navigate(`/${rolePath}/evaluation?studentId=${r._id || r.id}`)}
                            className="h-8 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-secondary text-white hover:bg-primary transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-secondary/20 border-0"
                        >
                            Evaluation
                        </button>
                        <button
                            onClick={() => handleDownloadMarkSheet(r._id || r.id, r.name, r.reg)}
                            className="h-8 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                        >
                            Mark sheet
                        </button>
                    </div>
                );
            }
        }
    ] : [
        {
            key: 'name',
            label: 'Student Identity',
            render: (v, r) => (
                <div className="flex flex-col gap-0.5 py-1">
                    <span className="font-black text-slate-900 leading-tight text-xs md:text-sm">{r.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{r.reg}</span>
                    <span className="text-[10px] text-primary truncate hidden lg:block">{r.email}</span>
                </div>
            )
        },
        { key: 'reg', label: 'Reg #' },
        { key: 'email', label: 'Institutional Email', className: 'hidden xl:table-cell' },
        {
            key: 'company',
            label: 'Placement Info',
            render: (v, r) => {
                const company = r.internshipRequest?.mode === 'Freelance' ? `Freelance ${r.internshipRequest?.freelancePlatform ? `(${r.internshipRequest.freelancePlatform})` : ''}` : (r.assignedCompany || 'Unassigned');
                const sup = r.internshipRequest?.mode === 'Freelance' ? null : (r.assignedSiteSupervisor?.name || r.assignedCompanySupervisor);
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-700 truncate max-w-[120px] md:max-w-none text-xs md:text-sm">{company}</span>
                        {sup && <span className="text-[10px] text-slate-400 italic">Sup: {sup}</span>}
                        {r.internshipRequest?.mode && <span className="text-[10px] font-black text-primary/60 uppercase tracking-tighter">{r.internshipRequest.mode}</span>}
                    </div>
                );
            }
        },
        {
            key: 'faculty',
            label: 'Faculty',
            render: (v, r) => r.assignedFaculty?.name || '—'
        },
        {
            key: 'status',
            label: 'Placement Status',
            render: (v, r) => <StatusBadge status={r.status} isFreelance={r.internshipRequest?.mode === 'Freelance'} hasFaculty={!!r.assignedFaculty} hasSiteSup={r.internshipRequest?.mode === 'Freelance' || !!(r.assignedSiteSupervisor || r.assignedCompanySupervisor)} />
        },
        {
            label: 'Action',
            key: 'action',
            render: (_, r) => {
                const rolePath = user?.role === 'internship_office' ? 'office' : (user?.role === 'site_supervisor' ? 'supervisor' : 'faculty');
                const isEvaluationPhase = currentPhase?.order >= 4;

                if (!isEvaluationPhase && !isOffice && user?.role !== 'hod') return <span className="text-[10px] text-slate-400 font-bold italic tracking-tighter">Wait Phase 4</span>;

                return (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate(`/${rolePath}/students/${r._id || r.id}`)}
                            className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                        >
                            Profile
                        </button>
                        <button
                            onClick={() => handleDownloadMarkSheet(r._id || r.id, r.name, r.reg)}
                            className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                        >
                            Sheet
                        </button>
                    </div>
                );
            }
        }
    ], [isSupervisor]);

    return (
        <div className="space-y-4 md:space-y-6 pb-8 md:pb-10">
            <div className="bg-white rounded-[20px] sm:rounded-[28px] border border-slate-100 shadow-lg shadow-slate-100/50 p-5 sm:p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-3 sm:gap-5 z-10">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-[16px] sm:rounded-[22px] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 flex-shrink-0">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
                            {isSupervisor ? 'My Assigned Interns' : 'Student Records'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                            {isSupervisor ? 'Active student placements'
                                : isFaculty ? 'Faculty supervision Student'
                                    : 'Institutional student registry'}
                        </p>
                        {totalResults > 0 && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-2">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest">{totalResults} Records</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 z-10 w-full lg:w-auto mt-2 lg:mt-0">
                    <div className="relative w-full sm:w-auto">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                            <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <input type="text" value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or reg..."
                            className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/20 w-full sm:w-64 lg:w-72 transition-all min-h-[44px]" />
                    </div>
                    {(isSupervisor || isFaculty || isOffice || user?.role === 'hod') && (
                        <button
                            onClick={handleBulkDownload}
                            className="h-10 px-5 flex items-center gap-2 whitespace-nowrap bg-transparent text-secondary border border-secondary hover:bg-slate-50 font-poppins rounded-xl transition-all duration-200 cursor-pointer font-black text-[9px] uppercase tracking-widest flex-shrink-0"
                        >
                            <i className="fas fa-file-excel text-xs"></i>
                            <span className="hidden sm:inline">Master Mark Sheet</span>
                        </button>
                    )}
                    <button
                        onClick={() => fetchStudents(new AbortController().signal)}
                        aria-label="Refresh student data"
                        className="min-h-[44px] min-w-[44px] rounded-xl sm:rounded-2xl border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl sm:rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs sm:text-sm font-bold text-rose-700">{error}</p>
                    </div>
                    <button onClick={() => fetchStudents(new AbortController().signal)} className="w-full sm:w-auto px-4 py-2 bg-rose-500 text-white text-[10px] sm:text-xs font-black rounded-lg hover:bg-rose-600 transition-all uppercase tracking-widest mt-2 sm:mt-0 min-h-[44px]">
                        Retry
                    </button>
                </div>
            )}

            <div className="min-h-[250px] sm:min-h-[400px]">
                {students.length === 0 && !loading ? (
                    <div className="py-24 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        </div>
                        <h3 className="text-lg font-black text-slate-800">No records found</h3>
                        <p className="text-sm text-slate-500 font-medium">We couldn't find any students matching your criteria.</p>
                        {search && (
                            <button onClick={() => setSearch('')} className="mt-4 text-xs font-black text-primary uppercase tracking-widest hover:underline cursor-pointer">
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <Suspense fallback={
                        <div className="py-24 text-center text-primary/30 flex justify-center">
                            <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        </div>
                    }>
                        <DataTable columns={tableColumns} data={students} loading={loading} />
                    </Suspense>
                )}
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-4 sm:pt-6 lg:pt-8 mt-4 sm:mt-6 lg:mt-8 border-t border-slate-100">
                <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-400 font-bold tracking-wider text-center lg:text-left uppercase w-full lg:w-auto">
                    Page <span className="text-slate-900">{page}</span> of {Math.max(1, totalPages)} • Showing {students.length} of {totalResults} records
                </p>
                <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 w-full lg:w-auto">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        aria-label="Go to previous page"
                        className="min-w-[44px] min-h-[44px] rounded-lg sm:rounded-xl lg:rounded-2xl border border-slate-100 bg-white text-slate-600 hover:border-primary hover:text-primary active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center shadow-sm cursor-pointer"
                    >
                        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>

                    {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === Math.max(1, totalPages) || Math.abs(p - page) <= 1)
                        .map((p, i, arr) => (
                            <React.Fragment key={p}>
                                {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 sm:px-2 text-slate-300 self-center font-black text-[10px] sm:text-xs">...</span>}
                                <button
                                    onClick={() => setPage(p)}
                                    disabled={loading}
                                    aria-label={`Go to page ${p}`}
                                    className={`min-w-[44px] min-h-[44px] rounded-lg sm:rounded-xl lg:rounded-2xl text-[10px] sm:text-xs font-black transition-all cursor-pointer ${p === page
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                        : 'border border-slate-100 bg-white text-slate-600 hover:border-primary hover:text-primary disabled:opacity-50 shadow-sm'}`}
                                >
                                    {p}
                                </button>
                            </React.Fragment>
                        ))
                    }

                    <button
                        onClick={() => setPage(p => Math.min(Math.max(1, totalPages), p + 1))}
                        disabled={page >= Math.max(1, totalPages) || loading}
                        aria-label="Go to next page"
                        className="min-w-[44px] min-h-[44px] rounded-lg sm:rounded-xl lg:rounded-2xl border border-slate-100 bg-white text-slate-600 hover:border-primary hover:text-primary active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center shadow-sm cursor-pointer"
                    >
                        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
        </div >
    );
});

RegisteredStudents.displayName = 'RegisteredStudents';

export default RegisteredStudents;
