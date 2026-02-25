import React from 'react';

export function StatCard({ icon, colorClass, value, label }) {
  const colors = {
    blue:   'bg-blue-100  text-secondary',
    green:  'bg-green-100 text-success',
    yellow: 'bg-yellow-100 text-warning',
    red:    'bg-red-100   text-danger',
    purple: 'bg-violet-100 text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colors[colorClass] || colors.blue}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div className="text-2xl font-extrabold text-primary">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {stats.map((s, i) => (
        <StatCard key={i} icon={s.icon} colorClass={s.cls} value={s.val} label={s.label} />
      ))}
    </div>
  );
}
