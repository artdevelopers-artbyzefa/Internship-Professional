import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';

export default function OfficeDashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await apiRequest('/analytics/summary');
        setSummary(data);
      } catch (error) {
        console.error('Failed to fetch summary:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const stats = [
    { label: 'Completed Internships', count: summary?.completedInternships || 0, icon: 'fa-check-circle', color: 'bg-emerald-500' },
    { label: 'Partner Companies', count: summary?.activeCompanies || 0, icon: 'fa-building', color: 'bg-blue-500' },
    { label: 'Active Interns', count: summary?.totalStudents || 0, icon: 'fa-users', color: 'bg-indigo-500' },
    { label: 'Faculty Active', count: summary?.facultyCount || 0, icon: 'fa-user-tie', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Institutional Portal Control</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Global oversight of internship workflows, requests, and academic evaluations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}>
              <i className={`fas ${s.icon}`}></i>
            </div>
            <div>
              <div className="text-2xl font-black text-gray-800">{s.count}</div>
              <div className="text-xs font-medium text-gray-400 tracking-wider">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl text-gray-400 overflow-hidden border-2 border-primary/10">
            <i className="fas fa-user"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-sm text-gray-400">Internship Office Admin • {user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="text-xs font-bold text-primary mb-1">Designation</div>
            <div className="text-sm font-medium">Internship Officer</div>
          </div>
          <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/10">
            <div className="text-xs font-bold text-secondary mb-1">Campus</div>
            <div className="text-sm font-medium">CUI Abbottabad</div>
          </div>
        </div>
      </div>
    </div>
  );
}
