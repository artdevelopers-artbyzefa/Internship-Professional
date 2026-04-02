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
        } catch (err) { console.error('Pool Fetch Error:', err); }
        finally { if (!isSilent) setLoading(false); }
    }, [page, debouncedSearch, filter]);

    const fetchCounts = async () => {
        try {
            const data = await apiRequest('/office/internship-request-stats');
            if (data) setCounts(data);
        } catch (err) { console.error('Stats Sync Error:', err); }
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

            {/* Registry Table: Simple Blue & White */}
            <div className="bg-white border border-blue-100 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-blue-50 border-b border-blue-100 px-8 py-6">
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                        {[
                            { key: 'all', label: 'All Logs', count: counts.all },
                            { key: 'pending', label: 'Waiting', count: counts.pending },
                            { key: 'approved', label: 'Authorized', count: counts.approved },
                            { key: 'rejected', label: 'Terminated', count: counts.rejected },
                        ].map(t => (
                            <button key={t.key} onClick={() => { setFilter(t.key); setPage(1); }}
                                className={`px-6 py-3 rounded-lg text-[10px] font-black tracking-[0.2em] transition-all flex items-center gap-3 border ${
                                    filter === t.key ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-400 border-blue-100 hover:border-blue-300'
                                } `}>
                                {t.label}
                                <span className={`px-2 py-0.5 rounded-md ${filter === t.key ? 'bg-white/20' : 'bg-blue-50'}`}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-blue-900/40  tracking-widest">Personnel</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-blue-900/40  tracking-widest">Operational Data</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-blue-900/40 tracking-widest">Linkage</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-blue-900/40 tracking-widest">Classification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />) : 
                             students.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-40 text-center font-black text-blue-200 text-[10px] uppercase tracking-[0.5em]">Empty</td>
                                </tr>
                             ) : (
                                students.map(s => (
                                    <tr key={s._id} onClick={() => navigate(`/office/internship-requests/${s._id}`)} 
                                        className="group cursor-pointer hover:bg-blue-50/30 transition-all border-l-4 border-transparent hover:border-blue-600">
                                        <td className="px-8 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs group-hover:scale-105 transition-transform">
                                                    {s.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-blue-900 uppercase group-hover:text-blue-600 transition-colors">{s.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.reg}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <p className="text-xs font-black text-blue-900 uppercase">{s.internshipRequest?.companyName || 'PENDING'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{s.internshipRequest?.mode || 'TBD'}</p>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="flex flex-col gap-2">
                                                <div className={`text-[9px] font-black uppercase ${s.assignedFaculty ? 'text-blue-600' : 'text-blue-300'}`}>Internal Advisor</div>
                                                <div className={`text-[9px] font-black uppercase ${s.assignedCompanySupervisor ? 'text-blue-600' : 'text-blue-300'}`}>Site Manager</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-right">
                                            <span className={`px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                                                s.status === 'Internship Approved' ? 'bg-blue-600 text-white border-blue-600' :
                                                s.status === 'Internship Rejected' ? 'bg-white text-blue-600 border-blue-600' :
                                                'bg-white text-blue-400 border-blue-100'
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
                    <div className="bg-blue-50 border-t border-blue-100 p-8 flex items-center justify-between">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">PAGE {page} OF {totalPages}</p>
                        <div className="flex gap-4">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-6 py-2 bg-white border border-blue-100 rounded-md text-[10px] font-black text-blue-600 uppercase hover:bg-blue-600 hover:text-white transition-all">Prev</button>
                            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="px-6 py-2 bg-white border border-blue-100 rounded-md text-[10px] font-black text-blue-600 uppercase hover:bg-blue-600 hover:text-white transition-all">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
