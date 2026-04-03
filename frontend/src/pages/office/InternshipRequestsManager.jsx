import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';

const SkeletonRow = () => (
    <tr className="animate-pulse border-b border-slate-50">
        <td className="py-6 px-8"><div className="h-10 w-10 bg-slate-100 rounded-lg"></div></td>
        <td className="py-6 px-8"><div className="h-6 w-48 bg-slate-100 rounded"></div></td>
        <td className="py-6 px-8"><div className="h-6 w-32 bg-slate-50 rounded"></div></td>
        <td className="py-6 px-8 text-right"><div className="h-8 w-24 bg-slate-100 rounded-full ml-auto"></div></td>
    </tr>
);

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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Command Header */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Applications</h2>
                    <p className="text-xs font-bold text-slate-500 tracking-widest mt-2 uppercase">Active Applications</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative group w-full lg:w-96">
                        <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="SEARCH BY NAME, ID, OR SITE..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-4 text-slate-900 text-xs font-black tracking-widest outline-none focus:bg-white focus:border-slate-300 transition-all placeholder-slate-400 uppercase" />
                    </div>
                    <button onClick={() => fetchRequests()} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all">
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} text-sm`}></i>
                    </button>
                </div>
            </div>

            {/* Registry Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left">
                {/* Modern Sleek Tabs */}
                <div className="px-8 pt-6 border-b border-slate-100">
                    <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                        {[
                            { key: 'all', label: 'All Requests', count: counts.all },
                            { key: 'pending', label: 'Under Review', count: counts.pending },
                            { key: 'approved', label: 'Approved', count: counts.approved },
                            { key: 'rejected', label: 'Rejected', count: counts.rejected },
                        ].map(t => (
                            <button 
                                key={t.key} 
                                onClick={() => { setFilter(t.key); setPage(1); }}
                                className={`relative pb-4 text-xs font-black tracking-wide transition-colors whitespace-nowrap flex items-center gap-2 ${
                                    filter === t.key 
                                        ? 'text-slate-900' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {t.label}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    filter === t.key 
                                        ? 'bg-slate-900 text-white' 
                                        : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {t.count}
                                </span>
                                {filter === t.key && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-t-full"></span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full">
                    <table className="w-full block lg:table">
                        <thead className="hidden lg:table-header-group">
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 tracking-widest">Student</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 tracking-widest">Internship</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 tracking-widest">Supervisors</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="block lg:table-row-group divide-y divide-slate-100 lg:divide-slate-50">
                            {loading ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />) : 
                             students.length === 0 ? (
                                <tr className="block lg:table-row">
                                    <td colSpan={4} className="block lg:table-cell py-40 text-center font-black text-slate-300 text-[10px] uppercase tracking-[0.5em]">Empty</td>
                                </tr>
                             ) : (
                                students.map(s => (
                                    <tr key={s._id} onClick={() => navigate(`/office/internship-requests/${s._id}`)} 
                                        className="group cursor-pointer hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-slate-900 block lg:table-row p-6 lg:p-0">
                                        
                                        <td className="block lg:table-cell lg:px-8 lg:py-8 mb-4 lg:mb-0">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest lg:hidden mb-1">Student</p>
                                            <p className="text-sm font-black text-slate-900 uppercase transition-colors">{s.name}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.reg}</p>
                                        </td>
                                        
                                        <td className="block lg:table-cell lg:px-8 lg:py-8 mb-4 lg:mb-0">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest lg:hidden mb-1">Placement</p>
                                            <p className="text-xs font-black text-slate-900 uppercase">{s.internshipRequest?.companyName || 'PENDING'}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{s.internshipRequest?.mode || 'TBD'}</p>
                                        </td>
                                        
                                        <td className="block lg:table-cell lg:px-8 lg:py-8 mb-6 lg:mb-0">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest lg:hidden mb-2">Advisors</p>
                                            <div className="flex flex-col gap-2">
                                                <div className={`text-[9px] font-black uppercase ${s.assignedFaculty ? 'text-slate-900' : 'text-slate-300'}`}>Internal Advisor</div>
                                                <div className={`text-[9px] font-black uppercase ${s.assignedCompanySupervisor ? 'text-slate-900' : 'text-slate-300'}`}>Site Manager</div>
                                            </div>
                                        </td>
                                        
                                        <td className="block lg:table-cell lg:px-8 lg:py-8 lg:text-right border-t border-slate-100 lg:border-none pt-4 lg:pt-0">
                                            <span className={`inline-block px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                                                s.status === 'Internship Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                s.status === 'Internship Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {s.status?.split(' ').pop()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                             )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">PAGE {page} OF {totalPages}</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
                            
                            <div className="flex items-center gap-1 hidden sm:flex">
                                {[...Array(totalPages)].map((_, i) => {
                                    const p = i + 1;
                                    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                                        return (
                                            <button 
                                                key={p} 
                                                onClick={() => setPage(p)}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${page === p ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    }
                                    if (p === page - 2 || p === page + 2) {
                                        return <span key={p} className="text-slate-400 font-black px-1">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
