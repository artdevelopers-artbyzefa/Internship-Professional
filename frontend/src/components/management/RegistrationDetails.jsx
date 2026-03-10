import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import DataTable from '../ui/DataTable.jsx';
import SearchBar from '../ui/SearchBar.jsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b'];
const ELIGIBILITY_COLORS = { eligible: '#3b82f6', ineligible: '#ef4444' };

export default function RegistrationDetails() {
    const [activeTab, setActiveTab] = useState('students');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [regSummary, setRegSummary] = useState(null);

    const tabs = [
        { id: 'students', label: 'Students', icon: 'fa-user-graduate', endpoint: '/analytics/students-paginated' },
        { id: 'interns', label: 'Active Interns', icon: 'fa-briefcase', endpoint: '/analytics/interns-paginated' },
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
                label: 'Phase 3 Status',
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-xl border-2 border-primary/10 overflow-hidden">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-0">
                        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-fit overflow-x-auto no-scrollbar">
                            <div className="flex min-w-max">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id); setPage(1); }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <i className={`fas ${tab.icon}`}></i>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="w-full md:w-64">
                            <SearchBar
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder={`Search ${activeTab}...`}
                            />
                        </div>
                    </div>
                </div>

                <div className="relative overflow-x-auto">
                    {loading ? (
                        <div className="min-h-[200px] flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 rounded-xl">
                            <i className="fas fa-circle-notch fa-spin text-3xl text-primary mb-3"></i>
                            <p className="text-sm font-bold text-gray-400">Searching Records...</p>
                        </div>
                    ) : (
                        <div className="w-full min-w-max md:min-w-0">
                            <DataTable columns={columns[activeTab]} data={data} />
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-4 p-4 md:p-0 md:pb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                        Page <span className="text-primary font-black">{page}</span> / <span className="text-gray-800">{totalPages}</span>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-primary hover:text-primary transition-all disabled:opacity-20 bg-white"
                        >
                            <i className="fas fa-chevron-left text-[10px]"></i>
                        </button>
                        <button
                            disabled={page === totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-primary hover:text-primary transition-all disabled:opacity-20 bg-white"
                        >
                            <i className="fas fa-chevron-right text-[10px]"></i>
                        </button>
                    </div>
                </div>
            </Card>

            <Card className="shadow-xl border-2 border-primary/10 h-fit">
                <div className="mb-4">
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest leading-none">
                        {activeTab === 'students' ? 'Student Eligibility' : 'Onboarding Distribution'}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 leading-tight">
                        {activeTab === 'students' ? 'Detailed qualification breakdown' : 'Global registration mix'}
                    </p>
                </div>

                <div className="h-[220px] relative mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        {activeTab === 'students' ? (
                            <BarChart data={eligibilityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: '10px' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        ) : (
                            <PieChart>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: '10px' }}
                                />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                    {activeTab !== 'students' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="text-2xl font-black text-gray-800 leading-none">
                                {regSummary ? (regSummary.total + regSummary.facultyCount + regSummary.siteSupervisorCount) : 0}
                            </div>
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-1">Total Entities</div>
                        </div>
                    )}
                </div>

                <div className="space-y-2 mt-4">
                    {(activeTab === 'students' ? eligibilityData : distributionData).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 group hover:border-primary transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTab === 'students' ? item.fill : COLORS[i] }}></div>
                                <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">{item.name}</span>
                            </div>
                            <span className="text-xs font-black text-gray-800">{item.value}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
