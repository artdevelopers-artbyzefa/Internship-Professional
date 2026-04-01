import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import DataTable from '../ui/DataTable.jsx';
import SearchBar from '../ui/SearchBar.jsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b'];
const ELIGIBILITY_COLORS = { eligible: '#3b82f6', ineligible: '#ef4444' };

export default function RegistrationDetails() {
    const [activeTab, setActiveTab] = useState('faculty');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [regSummary, setRegSummary] = useState(null);

    const tabs = [
        { id: 'faculty', label: 'Faculty Advisors', icon: 'fa-user-tie', endpoint: '/analytics/faculty-paginated' },
        { id: 'site_supervisors', label: 'Site Supervisors', icon: 'fa-building-user', endpoint: '/analytics/site-supervisors-paginated' },
    ];

    const fetchData = useCallback(async (isInitial = false) => {
        setLoading(true);
        try {
            const endpoint = tabs.find(t => t.id === activeTab).endpoint;
            const response = await apiRequest(`${endpoint}?page=${page}&limit=5&search=${search}`);
            setData(response.data);
            setTotalPages(response.pages);

            if (isInitial) {
                const stats = await apiRequest('/analytics/registration-stats');
                setRegSummary(stats);
            }
        } catch (error) {
            console.error('Failed to fetch registration details:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page, search]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData(true);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search, activeTab, page, fetchData]);

    const distributionData = regSummary ? [
        { name: 'Students', value: regSummary.total },
        { name: 'Faculty', value: regSummary.facultyCount },
        { name: 'Site Supervisors', value: regSummary.siteSupervisorCount },
    ] : [];

    const eligibilityData = regSummary ? [
        { name: 'Eligible', value: regSummary.eligible, fill: ELIGIBILITY_COLORS.eligible },
        { name: 'Ineligible', value: regSummary.ineligible, fill: ELIGIBILITY_COLORS.ineligible },
    ] : [];

    const columns = {
        students: [
            { key: 'name', label: 'Name' },
            { key: 'reg', label: 'Reg. #' },
            { key: 'semester', label: 'Sem' },
            { key: 'cgpa', label: 'CGPA' },
            {
                key: 'eligible',
                label: 'Status',
                render: (val) => (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${val ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {val ? 'YES' : 'NO'}
                    </span>
                )
            }
        ],
        interns: [
            { key: 'name', label: 'Intern' },
            { key: 'reg', label: 'Reg. #' },
            { key: 'assignedCompany', label: 'Company' },
            { key: 'assignedFaculty', label: 'Academic Sup.', render: (val) => val?.name || 'N/A' },
            {
                key: 'status',
                label: 'Status',
                render: (val) => (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700">
                        {val}
                    </span>
                )
            }
        ],
        faculty: [
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'whatsappNumber', label: 'WhatsApp' }
        ],
        site_supervisors: [
            { key: 'name', label: 'Supervisor' },
            { key: 'company', label: 'Company' }
        ]
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Left: Table Section */}
            <div className="xl:col-span-3 space-y-4">
                <Card className="shadow-sm border border-slate-200/60 overflow-hidden !p-0">
                    <div className="p-4 md:p-6 bg-white flex flex-col gap-6">
                        {/* Tab Switcher & Search Section */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                            <div className="bg-slate-50/80 border border-slate-100 p-1.5 rounded-2xl w-full xl:w-fit overflow-x-auto no-scrollbar scroll-smooth">
                                <div className="flex min-w-max gap-1.5 focus-within:ring-0">
                                    {tabs.map(tab => {
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                                                className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black tracking-[0.1em] transition-all duration-300 border-0 cursor-pointer whitespace-nowrap
                                                    ${isActive
                                                        ? 'bg-white text-primary shadow-[0_4px_12px_-2px_rgba(30,64,175,0.12)] ring-1 ring-slate-200/60 scale-[1.02]'
                                                        : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                                    }`}
                                            >
                                                <i className={`fas ${tab.icon} text-xs transition-all duration-300 ${isActive ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'}`}></i>
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="w-full xl:w-80">
                                <SearchBar
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder={`Search in ${activeTab}...`}
                                />
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="relative min-h-[300px]">
                            {loading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] z-10 rounded-xl">
                                    <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin mb-3"></div>
                                    <p className="text-xs font-black text-gray-400 tracking-widest">Updating Records...</p>
                                </div>
                            )}

                            <div className="w-full">
                                <DataTable columns={columns[activeTab]} data={data} />
                            </div>

                            {!loading && data.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <i className="fas fa-search text-3xl mb-3 opacity-20"></i>
                                    <p className="text-sm font-bold">No results found for your search.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-gray-50 gap-4">
                            <div className="text-[10px] font-black text-gray-400 tracking-[0.2em] leading-none">
                                Showing Page <span className="text-primary">{page}</span> of <span className="text-gray-800">{totalPages}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 1 || loading}
                                    onClick={() => setPage(p => p - 1)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-primary hover:text-primary transition-all disabled:opacity-20 bg-white cursor-pointer"
                                >
                                    <i className="fas fa-chevron-left text-xs"></i>
                                </button>
                                <button
                                    disabled={page === totalPages || loading}
                                    onClick={() => setPage(p => p + 1)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-primary hover:text-primary transition-all disabled:opacity-20 bg-white cursor-pointer"
                                >
                                    <i className="fas fa-chevron-right text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right: Analytics Section */}
            <div className="xl:col-span-1">
                <Card className="shadow-xl border-2 border-primary/10 h-full">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest leading-none">
                                {activeTab === 'students' ? 'Record Analytics' : 'Active Participants'}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-2 leading-tight tracking-wider">
                                {activeTab === 'students' ? 'Real-time eligibility breakdown' : 'Departmental mix distribution'}
                            </p>
                        </div>

                        <div className="h-[240px] relative w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {activeTab === 'students' ? (
                                    <BarChart data={eligibilityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                            contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '800' }}
                                        />
                                        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={34}>
                                            {eligibilityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <Pie
                                            data={distributionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '800' }}
                                        />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                            {activeTab !== 'students' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className="text-3xl font-black text-gray-800 leading-none">
                                        {regSummary ? (regSummary.total + regSummary.facultyCount + regSummary.siteSupervisorCount) : 0}
                                    </div>
                                    <div className="text-[9px] font-black text-gray-400 tracking-widest mt-1.5 opacity-60">Total Base</div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                            {(activeTab === 'students' ? eligibilityData : distributionData).map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-gray-100 group hover:border-primary/20 hover:bg-white transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: activeTab === 'students' ? item.fill : COLORS[i] }}></div>
                                        <span className="text-[11px] font-black text-gray-500 tracking-wider group-hover:text-primary transition-colors">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-gray-800">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
