import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';

export default function HODReports() {
  const [activePhase, setActivePhase] = useState(null);
  const [regStats, setRegStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [phase, stats] = await Promise.all([
          apiRequest('/phases/current'),
          apiRequest('/analytics/registration-stats')
        ]);
        setActivePhase(phase);
        setRegStats(stats);
      } catch (err) {
        console.error('Init Error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const reportTypes = ['Full Internship Report', 'Department Summary', 'Company-wise Report', 'Grade Sheet'];

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Departmental Intelligence</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Generate and export comprehensive internship analytics and performance reports.</p>
        </div>
      </div>

      {/* ── Phase 1: Registration Stats for HOD ── */}
      {activePhase?.key === 'registration' && regStats && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-primary/20 p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full tracking-widest uppercase">
              Phase 1 Active
            </span>
          </div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-xl">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-800">Student Registration Statistics</h3>
              <p className="text-sm text-gray-400 font-medium">Real-time departmental enrollment tracking for Phase 1.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="text-3xl font-black text-gray-800 mb-1">{regStats.total}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Registrations</div>
            </div>
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="text-3xl font-black text-emerald-600 mb-1">{regStats.eligible}</div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                Eligible Students
                <i className="fas fa-check-circle text-[10px]"></i>
              </div>
            </div>
            <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="text-3xl font-black text-rose-600 mb-1">{regStats.ineligible}</div>
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                Ineligible Students
                <i className="fas fa-times-circle text-[10px]"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card
        title="Available Report Modules"
        icon="fa-file-export"
        className={activePhase?.key === 'registration' ? 'opacity-60 grayscale border-dashed shadow-none' : ''}
      >
        <div className="flex gap-3 flex-wrap">
          {reportTypes.map(r => (
            <Button key={r} variant="outline" disabled={activePhase?.key === 'registration'}>
              <i className="fas fa-file-export mr-2"></i> {r}
            </Button>
          ))}
        </div>
        {activePhase?.key === 'registration' && (
          <p className="text-xs text-gray-400 font-medium mt-4 italic flex items-center gap-2">
            <i className="fas fa-lock text-[10px]"></i>
            Full departmental reports will unlock once the registration phase is complete.
          </p>
        )}
      </Card>
    </div>
  );
}
