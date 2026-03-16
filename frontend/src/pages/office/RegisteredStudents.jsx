import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';

// ─── Skeleton Card ───────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm animate-pulse space-y-4">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-100 rounded-lg"></div>
                <div className="h-3 w-48 bg-slate-50 rounded"></div>
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-50">
            <div className="h-10 bg-slate-50 rounded-xl"></div>
            <div className="h-10 bg-slate-50 rounded-xl"></div>
            <div className="h-10 bg-slate-50 rounded-xl"></div>
        </div>
    </div>
);

// ─── Status Badge ─────────────────────────────────────────
const StatusBadge = ({ status, isFreelance, hasFaculty, hasSiteSup }) => {
    const isEligible = hasFaculty && hasSiteSup;
    if (!isEligible) return (
        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-500 border border-rose-100">
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
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
};

// ─── Student Card ─────────────────────────────────────────
const StudentCard = memo(({ student, isOffice }) => {
    const req = student.internshipRequest;
    const isFreelance = req?.mode === 'Freelance';
    const hasFaculty = !!student.assignedFaculty;
    const hasSiteSup = isFreelance || !!(student.assignedSiteSupervisor || student.assignedCompanySupervisor);
    const phone = student.whatsappNumber || req?.whatsappNumber;

    const companyDisplay = isFreelance
        ? `Freelance${req?.freelancePlatform ? ` · ${req.freelancePlatform}` : ''}`
        : student.assignedCompany || null;

    const facultyName = typeof student.assignedFaculty === 'object'
        ? student.assignedFaculty?.name
        : null;

    const siteSuperName = student.assignedSiteSupervisor?.name || student.assignedCompanySupervisor;

    return (
        <div className="bg-white rounded-3xl border border-slate-100 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-0.5 group relative overflow-hidden hover:border-slate-200">
            <div className="p-5 space-y-4">
                {/* Top row: Avatar + Name + Status */}
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                        {student.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-sm leading-tight truncate">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.reg}</p>
                        {student.email && (
                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{student.email}</p>
                        )}
                        {student.secondaryEmail && (
                            <p className="text-[9px] text-primary/60 font-bold mt-0.5 truncate">
                                <i className="fas fa-envelope-open-text mr-1 text-[8px]"></i>{student.secondaryEmail}
                            </p>
                        )}
                    </div>
                    <StatusBadge status={student.status} isFreelance={isFreelance} hasFaculty={hasFaculty} hasSiteSup={hasSiteSup} />
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-50">
                    {/* Company */}
                    <div className="bg-slate-50/70 rounded-2xl p-3 min-w-0">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <i className="fas fa-building text-[8px]"></i> Company
                        </p>
                        {companyDisplay ? (
                            <p className={`text-xs font-bold truncate ${isFreelance ? 'text-indigo-600' : 'text-slate-700'}`}>{companyDisplay}</p>
                        ) : (
                            <p className="text-[10px] text-slate-300 italic">Not assigned</p>
                        )}
                    </div>

                    {/* Site Supervisor */}
                    <div className={`rounded-2xl p-3 min-w-0 ${isFreelance ? 'bg-slate-50/30' : siteSuperName ? 'bg-emerald-50/40' : 'bg-rose-50/40'}`}>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <i className="fas fa-user-tie text-[8px]"></i> Site Sup.
                        </p>
                        {isFreelance ? (
                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-wider">N/A</p>
                        ) : siteSuperName ? (
                            <p className="text-xs font-bold text-emerald-700 truncate">{siteSuperName}</p>
                        ) : (
                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-wider">Missing</p>
                        )}
                    </div>

                    {/* Faculty Mentor */}
                    <div className={`rounded-2xl p-3 min-w-0 ${facultyName ? 'bg-blue-50/40' : 'bg-rose-50/40'}`}>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <i className="fas fa-chalkboard-user text-[8px]"></i> Faculty
                        </p>
                        {facultyName ? (
                            <p className="text-xs font-bold text-blue-700 truncate">{facultyName}</p>
                        ) : (
                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-wider">Missing</p>
                        )}
                    </div>
                </div>

                {/* Bottom row: WhatsApp + Mode badge */}
                <div className="flex items-center justify-between pt-1">
                    {phone ? (
                        <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[10px] font-bold hover:bg-emerald-500 hover:text-white transition-all">
                            <i className="fab fa-whatsapp text-sm"></i>
                            {phone}
                        </a>
                    ) : (
                        <span className="px-3 py-1.5 bg-rose-50 text-rose-400 rounded-xl border border-rose-100 text-[10px] font-black uppercase tracking-wider">
                            <i className="fas fa-exclamation-triangle mr-1"></i>No Contact
                        </span>
                    )}

                    <div className="flex items-center gap-2">
                        {req?.semester && (
                            <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black border border-slate-100">
                                Sem {req.semester || student.semester}
                            </span>
                        )}
                        {req?.mode && (
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black border
                                ${isFreelance ? 'bg-purple-50 text-purple-600 border-purple-100'
                                : req.mode === 'Remote' ? 'bg-sky-50 text-sky-600 border-sky-100'
                                : req.mode === 'Hybrid' ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                {req.mode}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ─── Supervisor Simple Card ───────────────────────────────
const SupervisorStudentCard = memo(({ student }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-sm flex-shrink-0">
            {student.name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate">{student.name}</p>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{student.reg}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
            Active
        </span>
    </div>
));

// ─── Main Component ───────────────────────────────────────
export default function RegisteredStudents({ user }) {
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

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const fetchStudents = useCallback(async () => {
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
            const response = await apiRequest(url);

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
            setError('Failed to load student records. Please try again.');
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }, [isSupervisor, isFaculty, user, page, debouncedSearch]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const LIMIT = 15;

    return (
        <div className="space-y-6 pb-10">
            {/* Header Card */}
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-lg shadow-slate-100/50 p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-5 z-10">
                    <div className="w-14 h-14 rounded-[22px] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 flex-shrink-0">
                        <i className={`fas ${isSupervisor ? 'fa-user-check' : 'fa-users'} text-xl`}></i>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            {isSupervisor ? 'My Assigned Interns' : 'Student Records'}
                        </h2>
                        <p className="text-sm text-slate-400 font-medium mt-0.5">
                            {isSupervisor ? 'Active student placements'
                                : isFaculty ? 'Faculty supervision roster'
                                : 'Institutional student registry'}
                        </p>
                        {totalResults > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{totalResults} Records</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10 w-full lg:w-auto">
                    <div className="relative">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                        <input type="text" value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or reg..."
                            className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/20 w-full sm:w-72 transition-all" />
                    </div>
                    <button onClick={fetchStudents} className="w-12 h-12 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors flex-shrink-0">
                        <i className="fas fa-rotate-right text-sm"></i>
                    </button>
                </div>
            </div>


            {/* Error state */}
            {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 flex-shrink-0">
                        <i className="fas fa-triangle-exclamation"></i>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-rose-700">{error}</p>
                    </div>
                    <button onClick={fetchStudents} className="px-4 py-2 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600 transition-all uppercase tracking-widest">
                        Retry
                    </button>
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : students.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 py-24 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-slate-100">
                        <i className="fas fa-user-slash text-slate-200 text-3xl"></i>
                    </div>
                    <h3 className="text-slate-500 font-black text-base tracking-tight">No Students Found</h3>
                    <p className="text-slate-300 text-xs font-bold uppercase tracking-[3px] mt-2">
                        {debouncedSearch ? 'Try a different search term' : 'No records in this registry'}
                    </p>
                    {debouncedSearch && (
                        <button onClick={() => setSearch('')} className="mt-6 px-6 py-2.5 border border-slate-200 rounded-xl text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                            Clear Search
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {students.map(s => (
                        isSupervisor ? (
                            <SupervisorStudentCard key={s._id} student={s} />
                        ) : (
                            <StudentCard
                                key={s._id}
                                student={s}
                                isOffice={isOffice}
                            />
                        )
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !loading && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        Showing <span className="text-slate-700">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalResults)}</span> of {totalResults}
                    </p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="w-11 h-11 rounded-2xl border border-slate-100 bg-white text-slate-400 hover:border-primary hover:text-primary active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center shadow-sm">
                            <i className="fas fa-chevron-left text-xs"></i>
                        </button>

                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)}
                                className={`w-11 h-11 rounded-2xl text-xs font-black transition-all ${p === page
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'border border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}>
                                {p}
                            </button>
                        ))}

                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="w-11 h-11 rounded-2xl border border-slate-100 bg-white text-slate-400 hover:border-primary hover:text-primary active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center shadow-sm">
                            <i className="fas fa-chevron-right text-xs"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
