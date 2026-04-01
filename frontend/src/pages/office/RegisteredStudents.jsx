import React, { useState, useEffect, useCallback, useMemo, memo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';

const DataTable = React.lazy(() => import('../../components/ui/DataTable.jsx'));

const StatusBadge = memo(({ status, isFreelance, hasFaculty, hasSiteSup }) => {
    const isEligible = hasFaculty && hasSiteSup;
    if (!isEligible) return (
        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center w-fit gap-1">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Incomplete
        </span>
    );
    const map = {
        'Assigned': { cls: 'bg-primary/10 text-primary border-primary/20', label: 'Placed' },
        'Agreement Approved': { cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Agreement OK' },
        'Internship Approved': { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Approved' },
    };
    const cfg = map[status] || { cls: 'bg-slate-50 text-slate-500 border-slate-100', label: status?.split(' ').slice(-1)[0] || 'Active' };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${cfg.cls} flex items-center justify-center w-fit gap-1`}>
            {cfg.label === 'Agreement OK' || cfg.label === 'Approved' ? (
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            ) : cfg.label === 'Placed' ? (
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            ) : null}
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

    const navigate = useNavigate();

    const isSupervisor = user?.role === 'site_supervisor';
    const isFaculty = user?.role === 'faculty_supervisor';
    const isOffice = user?.role === 'internship_office';

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
        } catch (err) {
            if (err.name !== 'AbortError') {
                setError('Failed to load student records. Please try again.');
                setStudents([]);
            }
        } finally {
            setLoading(false);
        }
    }, [isSupervisor, isFaculty, user, page, debouncedSearch]);

    useEffect(() => {
        const controller = new AbortController();
        fetchStudents(controller.signal);
        return () => controller.abort();
    }, [fetchStudents]);

    const LIMIT = 15;

    const tableColumns = useMemo(() => isSupervisor ? [
        { key: 'reg', label: 'Registration #' },
        { key: 'name', label: 'Full Name' },
        { key: 'status', label: 'Status', render: () => <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">Active</span> }
    ] : [
        { key: 'reg', label: 'Registration #' },
        {
            key: 'name',
            label: 'Full Name',
            render: (v, r) => {
                const phone = r.whatsappNumber || r.internshipRequest?.whatsappNumber;
                return (
                    <div>
                        <div className="font-bold">{r.name}</div>
                        {phone && (
                            <div className="text-[10px] text-emerald-600 font-bold mt-1 tracking-wider inline-flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                {phone}
                            </div>
                        )}
                    </div>
                );
            }
        },
        { key: 'email', label: 'Institutional Email' },
        {
            key: 'company',
            label: 'Company / Org.',
            render: (v, r) => r.internshipRequest?.mode === 'Freelance' ? `Freelance ${r.internshipRequest?.freelancePlatform ? `(${r.internshipRequest.freelancePlatform})` : ''}` : (r.assignedCompany || <span className="text-slate-400 italic">Not Assigned</span>)
        },
        {
            key: 'faculty',
            label: 'Faculty',
            render: (v, r) => r.assignedFaculty?.name || <span className="text-slate-400 italic">Missing</span>
        },
        {
            key: 'siteSup',
            label: 'Site Sup.',
            render: (v, r) => r.internshipRequest?.mode === 'Freelance' ? <span className="text-slate-400 italic">N/A</span> : (r.assignedSiteSupervisor?.name || r.assignedCompanySupervisor || <span className="text-slate-400 italic">Missing</span>)
        },
        {
            key: 'mode',
            label: 'Mode',
            render: (v, r) => r.internshipRequest?.mode ? <span className="text-xs font-bold text-slate-500">{r.internshipRequest.mode}</span> : '—'
        },
        {
            key: 'status',
            label: 'Placement Status',
            render: (v, r) => <StatusBadge status={r.status} isFreelance={r.internshipRequest?.mode === 'Freelance'} hasFaculty={!!r.assignedFaculty} hasSiteSup={r.internshipRequest?.mode === 'Freelance' || !!(r.assignedSiteSupervisor || r.assignedCompanySupervisor)} />
        }
    ], [isSupervisor]);

    return (
        <div className="space-y-4 md:space-y-6 pb-8 md:pb-10">
            <div className="bg-white rounded-[20px] sm:rounded-[28px] border border-slate-100 shadow-lg shadow-slate-100/50 p-5 sm:p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-3 sm:gap-5 z-10">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-[16px] sm:rounded-[22px] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 flex-shrink-0">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
                            {isSupervisor ? 'My Assigned Interns' : 'Student Records'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                            {isSupervisor ? 'Active student placements'
                                : isFaculty ? 'Faculty supervision roster'
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <input type="text" value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or reg..."
                            className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/20 w-full sm:w-64 lg:w-72 transition-all min-h-[44px]" />
                    </div>
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
                {loading ? (
                    <div className="py-16 sm:py-24 text-center flex flex-col items-center justify-center">
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary opacity-20 mb-3 sm:mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        <p className="text-[10px] sm:text-xs font-black text-slate-300 tracking-widest uppercase">Retrieving Records...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 py-16 sm:py-24 text-center shadow-sm px-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-2xl sm:rounded-[28px] flex items-center justify-center mx-auto mb-4 sm:mb-5 border-2 border-dashed border-slate-100 text-slate-200">
                            <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h3 className="text-slate-500 font-black text-sm sm:text-base tracking-tight">No Students Found</h3>
                        <p className="text-slate-300 text-[10px] sm:text-xs font-bold tracking-[2px] sm:tracking-[3px] mt-2 uppercase">
                            {debouncedSearch ? 'Try a different search term' : 'No records in this registry'}
                        </p>
                        {debouncedSearch && (
                            <button onClick={() => setSearch('')} className="mt-4 sm:mt-6 px-4 sm:px-6 py-2 sm:py-2.5 border border-slate-200 rounded-lg sm:rounded-xl text-slate-400 text-[10px] sm:text-xs font-black tracking-widest uppercase hover:bg-slate-50 transition-all min-h-[44px]">
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
                        <DataTable columns={tableColumns} data={students} />
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
        </div>
    );
});

RegisteredStudents.displayName = 'RegisteredStudents';

export default RegisteredStudents;
