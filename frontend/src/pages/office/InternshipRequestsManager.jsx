import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';
import { DataTable } from '../../components/ui/DataTable.jsx';

export default function InternshipRequestsManager({ user }) {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

    const fetchRequests = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const res = await apiRequest(`/office/internship-request-students?page=${page}&search=${debouncedSearch}&filter=${filter}`, { silent: isSilent });
            if (res) {
                setStudents(res.data || []);
                setTotalPages(res.pages || 1);
            }
        } catch (err) {
            // Error handled by apiRequest
        }
        finally { if (!isSilent) setLoading(false); }
    }, [page, debouncedSearch, filter]);

    const fetchCounts = async () => {
        try {
            const data = await apiRequest('/office/internship-request-stats');
            if (data) setCounts(data);
        } catch (err) {
            // Error handled by apiRequest
        }
    };

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { fetchRequests(); fetchCounts(); }, [fetchRequests]);

    useEffect(() => {
        const interval = setInterval(() => fetchRequests(true), 60000);
        return () => clearInterval(interval);
    }, [fetchRequests]);

    const columns = [
        {
            key: 'name',
            label: 'Student Identity',
            render: (v, r) => (
                <div className="flex flex-col gap-0.5 py-1">
                    <span className="font-black text-slate-900 uppercase text-xs md:text-sm">{r.name}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.reg}</span>
                </div>
            )
        },
        {
            key: 'placement',
            label: 'Placement Details',
            render: (v, r) => (
                <div className="flex flex-col gap-0.5 py-1">
                    <span className="text-xs font-black text-slate-900 uppercase truncate max-w-[200px]">{r.internshipRequest?.companyName || 'PENDING'}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.internshipRequest?.mode || 'TBD'}</span>
                </div>
            )
        },
        {
            key: 'advisors',
            label: 'Supervision',
            render: (v, r) => (
                <div className="flex flex-col gap-1.5 py-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${r.assignedFaculty ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`}></div>
                        <span className={`text-[9px] font-black uppercase tracking-tight ${r.assignedFaculty ? 'text-slate-900' : 'text-slate-300'}`}>Internal Advisor</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${r.assignedCompanySupervisor ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`}></div>
                        <span className={`text-[9px] font-black uppercase tracking-tight ${r.assignedCompanySupervisor ? 'text-slate-900' : 'text-slate-300'}`}>Site Manager</span>
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Decision',
            render: (v, r) => (
                <span className={`inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                    r.status === 'Internship Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    r.status === 'Internship Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                    {r.status?.split(' ').pop()}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'text-right',
            render: (v, r) => (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/office/internship-requests/${r._id}`);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:scale-[1.02] active:scale-95 transition-all shadow-sm hover:shadow-primary/25 cursor-pointer"
                >
                    View Details
                    <i className="fas fa-arrow-right text-[8px]"></i>
                </button>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Command Header */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-[32px] p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
                <div className="text-center sm:text-left z-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">Internship Requests</h2>
                    <p className="text-[10px] font-black text-primary tracking-[0.3em] mt-2 ">Manage the internship requests</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto z-10">
                    <div className="relative group w-full lg:w-96">
                        <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xs transition-colors group-focus-within:text-primary"></i>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="SEARCH BY NAME, ID, OR SITE..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-3.5 text-slate-900 text-[11px] font-black tracking-widest outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all placeholder-slate-300 uppercase" />
                    </div>
                    <button onClick={() => fetchRequests()} className="h-12 w-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-primary hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin text-primary' : ''} text-sm`}></i>
                    </button>
                </div>
            </div>

            {/* Registry Table Container */}
            <div className="bg-white border border-slate-100 rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden">
                {/* Modern Dropdown Form */}
                <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest hidden sm:block">Filter Requests Status</h3>
                    <div className="relative w-full sm:w-80">
                        <select
                            value={filter}
                            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                            className="appearance-none w-full bg-white border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-widest rounded-[1.25rem] focus:ring-4 focus:ring-primary/10 focus:border-primary block px-6 py-4 pr-12 shadow-sm cursor-pointer outline-none transition-all hover:border-slate-300"
                        >
                            <option value="all">All Requests ({counts.all})</option>
                            <option value="pending">Under Review ({counts.pending})</option>
                            <option value="approved">Approved ({counts.approved})</option>
                            <option value="rejected">Rejected ({counts.rejected})</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-6 text-slate-400">
                            <i className="fas fa-chevron-down text-[10px]"></i>
                        </div>
                    </div>
                </div>

                <div className="w-full min-h-[500px]">
                    {students.length === 0 && !loading ? (
                        <div className="py-48 text-center flex flex-col items-center justify-center gap-6">
                             <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 text-slate-200 shadow-inner">
                                <i className="fas fa-inbox text-4xl"></i>
                             </div>
                             <div className="space-y-2">
                                <h4 className="text-slate-400 font-black text-xs  tracking-[0.5em]">No Applications Found</h4>
                                <p className="text-[10px] text-slate-300 font-bold  tracking-wider">Try adjusting your filters or search keywords</p>
                             </div>
                        </div>
                    ) : (
                        <DataTable 
                            columns={columns} 
                            data={students} 
                            loading={loading}
                            onRowClick={(row) => navigate(`/office/internship-requests/${row._id}`)}
                        />
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="bg-slate-50/50 border-t border-slate-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Navigation</span>
                            <span className="text-xs font-black text-slate-900 uppercase mt-1 tracking-tighter">Page {page} of {totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setPage(p => p - 1)} 
                                disabled={page === 1 || loading} 
                                className="h-11 px-6 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:shadow-xl hover:shadow-slate-900/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <i className="fas fa-chevron-left mr-2"></i> Prev
                            </button>
                            
                            <div className="flex items-center gap-1.5 hidden lg:flex">
                                {[...Array(totalPages)].map((_, i) => {
                                    const p = i + 1;
                                    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                                        return (
                                            <button 
                                                key={p} 
                                                onClick={() => setPage(p)}
                                                disabled={loading}
                                                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[10px] font-black transition-all cursor-pointer ${page === p ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-110' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    }
                                    if (p === page - 2 || p === page + 2) {
                                        return <span key={p} className="text-slate-400 font-black px-1 self-center">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button 
                                onClick={() => setPage(p => p + 1)} 
                                disabled={page === totalPages || loading} 
                                className="h-11 px-6 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:shadow-xl hover:shadow-slate-900/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Next <i className="fas fa-chevron-right ml-2"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
