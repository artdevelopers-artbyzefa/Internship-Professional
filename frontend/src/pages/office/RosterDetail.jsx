import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import { showToast } from '../../utils/notifications.jsx';

const SkeletonCard = () => (
  <div className="bg-slate-50 animate-pulse p-6 rounded-[24px] border border-slate-100 h-40">
    <div className="flex justify-between mb-6">
      <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
      <div className="w-10 h-5 bg-slate-200 rounded-full"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 w-3/4 bg-slate-200 rounded-lg"></div>
      <div className="h-3 w-1/2 bg-slate-200 rounded-lg"></div>
    </div>
  </div>
);

export default function RosterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const type = queryParams.get('type') || 'faculty'; // 'faculty' or 'site'
  const email = queryParams.get('email');
  const name = queryParams.get('name');
  const company = queryParams.get('company');

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      let url = '';
      if (type === 'faculty') {
        url = `/office/faculty-students/${id}`;
      } else {
        let params = new URLSearchParams();
        if (email) params.append('email', email);
        if (name) params.append('supervisor', name);
        if (company) params.append('company', company);
        url = `/office/supervisor-students?${params.toString()}`;
      }

      const data = await apiRequest(url);
      setStudents(data || []);

      // Attempt to find supervisor meta if passed in state
      if (location.state?.supervisor) {
        setMeta(location.state.supervisor);
      }
    } catch (err) {
      // Error handled by apiRequest
    } finally {
      setLoading(false);
    }
  }, [id, type, email, name, company, location.state]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Premium Header */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all group"
          >
            <i className="fas fa-arrow-left text-sm group-hover:-translate-x-1 transition-transform"></i>
          </button>
          <div className="space-y-1">
            <div className="flex flex-col">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Assigned Students: <span className="text-primary">{meta?.name || name || 'Registry Entry'}</span></h2>
              <div className="flex items-center gap-2 mt-2">
                <div className="px-3 py-1 rounded-full bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-100">
                  {students.length} Interns Registered
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/5">
                  {type === 'site' ? '  Mentor' : 'Academic Supervisor'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchRoster}
            className="flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-primary transition-colors px-4 py-2"
          >
            <i className={`fas fa-sync-alt text-[10px] ${loading ? 'fa-spin text-primary' : ''}`}></i>
            Refresh Data
          </button>
          <div className="h-8 w-[1px] bg-slate-100 hidden lg:block mx-2"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Unit</span>
            <span className="text-sm font-black text-slate-800">{meta?.companies?.[0]?.name || 'Departmental Roster'}</span>
          </div>
        </div>
      </div>

      {/* Main Roster Body */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
            Assigned Active Student Base
          </h3>
          <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            Internal Registry Mapping: {type.toUpperCase()}-{id || 'QM'}
          </div>
        </div>

        {loading ? (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : students.length > 0 ? (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {students.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-white hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 group transition-all p-5 rounded-[24px] border border-slate-100 relative overflow-hidden"
                >
                  {/* Accent bar */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary transition-colors"></div>

                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-primary/5 flex items-center justify-center text-sm font-black text-slate-400 group-hover:text-primary border border-slate-100 transition-all shrink-0">
                      {s.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/5">
                      S{s.semester}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-black text-slate-800 truncate leading-tight group-hover:text-primary transition-colors">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1 truncate">{s.reg}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-50 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <i className="fas fa-envelope text-slate-300 w-4"></i>
                        <span className="truncate">{s.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <i className="fas fa-circle-check text-emerald-400 w-4"></i>
                        <span>Active Intern</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-40 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto border border-slate-100">
              <i className="fas fa-users-rectangle text-slate-200 text-4xl"></i>
            </div>
            <div>
              <h4 className="text-slate-500 font-extrabold text-xl">No Placements Registered</h4>
              <p className="text-slate-400 text-xs font-bold mt-2 max-w-xs mx-auto">This supervisor currently does not have any active students assigned in the system.</p>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)} className="!rounded-2xl !px-10 !py-4 !text-[11px] !font-black !tracking-widest !uppercase">Return to registry</Button>
          </div>
        )}
      </div>
    </div>
  );
}
