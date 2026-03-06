import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Users, Building, Award, CheckCircle, TrendingUp, Download, 
  Filter, Calendar, GraduationCap, ChevronDown, FileSpreadsheet, FilePieChart
} from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsAnalytics() {
  const [summary, setSummary] = useState(null);
  const [completionData, setCompletionData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [criteriaData, setCriteriaData] = useState([]);
  const [companyData, setCompanyData] = useState([]);
  const [facultyData, setFacultyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ semester: 'All', program: 'All' });

  useEffect(() => {
    fetchAllData();
  }, [filter]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filter).toString();
      const [sum, comp, evalComp, crit, compDist, facPerf] = await Promise.all([
        apiRequest(`/analytics/summary?${params}`),
        apiRequest(`/analytics/completion-analysis?${params}`),
        apiRequest(`/analytics/evaluation-comparison?${params}`),
        apiRequest(`/analytics/criteria-performance?${params}`),
        apiRequest(`/analytics/company-distribution?${params}`),
        apiRequest(`/analytics/faculty-performance?${params}`)
      ]);

      setSummary(sum);
      setCompletionData(comp);
      setComparisonData(evalComp);
      setCriteriaData(crit);
      setCompanyData(compDist);
      setFacultyData(facPerf);
    } catch (err) {
      console.error('Failed to fetch analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    // Placeholder for PDF export using the report template
    alert("Exporting professional COMSATS Analytics Report to PDF...");
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="mt-4 text-gray-500 font-bold tracking-tight">Compiling Insights...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-primary/10 rounded-xl text-primary"><FilePieChart size={28} /></span>
            Reports & Insights
          </h1>
          <p className="text-gray-500 font-medium mt-1 ml-11">Data-driven analysis of internship activities and performances.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
            <Calendar size={16} className="text-gray-400" />
            <select 
              className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer"
              value={filter.semester}
              onChange={(e) => setFilter({...filter, semester: e.target.value})}
            >
              <option value="All">All Semesters</option>
              <option value="FA24">FA24</option>
              <option value="SP24">SP24</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
            <GraduationCap size={16} className="text-gray-400" />
            <select 
              className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer"
              value={filter.program}
              onChange={(e) => setFilter({...filter, program: e.target.value})}
            >
              <option value="All">All Programs</option>
              <option value="BCS">BCS</option>
              <option value="BSE">BSE</option>
            </select>
          </div>
          <div className="flex gap-2 ml-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200">
               <Download size={16} className="mr-2" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200">
               <FileSpreadsheet size={16} className="mr-2" /> Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<CheckCircle size={24} />} 
          label="Total Completions" 
          value={summary?.completedInternships || 0} 
          trend="+12% from last sem" 
          color="bg-emerald-500" 
        />
        <StatCard 
          icon={<Building size={24} />} 
          label="Partner Companies" 
          value={summary?.activeCompanies || 0} 
          trend="+5 new this month" 
          color="bg-blue-500" 
        />
        <StatCard 
          icon={<Award size={24} />} 
          label="Average Score" 
          value={`${summary?.avgScore || 0}%`} 
          trend="Steady performance" 
          color="bg-amber-500" 
        />
        <StatCard 
          icon={<TrendingUp size={24} />} 
          label="Success Rate" 
          value={`${summary?.successRate || 0}%`} 
          trend="Target: 90%" 
          color="bg-purple-500" 
        />
      </div>

      {/* Primary Data Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Completion Analysis */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              Internship Completion Analysis
            </h2>
            <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full">Program-wise</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="program" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="total" name="Enrolled" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Evaluation Comparison */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-gray-800">
              Evaluation Disparity Analysis
            </h2>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Faculty vs Industry</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="reg" hide />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Bar dataKey="facultyScore" name="Faculty Score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="siteScore" name="Site Supervisor Score" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Secondary Data Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Criteria Performance */}
        <Card className="p-6">
          <h2 className="text-lg font-black text-gray-800 mb-8 tracking-tight">Student Competency Matrix</h2>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={criteriaData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 700}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Avg Performance"
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-gray-400 mt-4 font-medium italic">Average performance indicators across modules</p>
        </Card>

        {/* Company Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-black text-gray-800 mb-8 tracking-tight">Placement Ecosystem</h2>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={companyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {companyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top Placement Hub</div>
             <div className="text-sm font-black text-primary uppercase">{companyData[0]?.name || 'N/A'}</div>
          </div>
        </Card>

        {/* Faculty Workload */}
        <Card className="p-6 overflow-hidden">
          <h2 className="text-lg font-black text-gray-800 mb-8 tracking-tight">Faculty Workflow Analytics</h2>
          <div className="space-y-5">
             {facultyData.slice(0, 5).map((fac, i) => (
               <div key={i} className="flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                    {fac.name.charAt(0)}
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-700">{fac.name}</span>
                      <span className="text-xs font-black text-primary">{fac.totalStudents} Interns</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                       <div 
                         className="bg-primary h-full rounded-full transition-all duration-1000" 
                         style={{ width: `${(fac.totalStudents / 20) * 100}%` }}
                       ></div>
                    </div>
                 </div>
               </div>
             ))}
             {facultyData.length === 0 && (
                <div className="text-center py-10 opacity-40">
                    <Users size={40} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-bold">No active supervisions tracked</p>
                </div>
             )}
          </div>
          <button className="w-full mt-8 text-xs font-black text-primary hover:text-secondary uppercase tracking-widest flex items-center justify-center gap-2 group transition-all">
            View Full Faculty Index <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        </Card>
      </div>

      {/* Drill-down Intelligence Table */}
      <Card className="p-8">
        <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight">Active Placements Registry</h2>
              <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Historical Performance & Distribution Data</p>
            </div>
            <div className="flex items-center gap-2">
               <button className="px-5 py-2 text-xs font-bold bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all">Export Segment</button>
               <button className="px-5 py-2 text-xs font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Detailed Drilldown</button>
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest">Partner Company</th>
                <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest">Industry Type</th>
                <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest">Placement Vol.</th>
                <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest">Avg. Score</th>
                <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {companyData.map((comp, idx) => (
                <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                  <td className="py-4">
                     <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">{comp.name}</span>
                  </td>
                  <td className="py-4">
                     <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-tighter">Technology / SaaS</span>
                  </td>
                  <td className="py-4">
                     <span className="text-sm font-black text-gray-800">{comp.value} Students</span>
                  </td>
                  <td className="py-4">
                     <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-emerald-600">88.5</div>
                        <div className="w-12 bg-gray-100 h-1 rounded-full"><div className="bg-emerald-500 h-full rounded-full" style={{width: '88%'}}></div></div>
                     </div>
                  </td>
                  <td className="py-4 text-right">
                     <span className="text-emerald-500 text-xs font-bold flex items-center justify-end gap-1">
                        <TrendingUp size={12} /> +2.4%
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-[160px] relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity scale-150 rotate-12">
         {icon}
      </div>
      <div>
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white text-lg shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
           {icon}
        </div>
        <div className="text-2xl font-black text-gray-800 leading-none mb-1">{value}</div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
      </div>
      <div className="flex items-center gap-1 mt-3">
         <span className={`text-[10px] font-bold ${trend.includes('+') ? 'text-emerald-500' : 'text-primary'}`}>
            {trend}
         </span>
      </div>
    </div>
  );
}
