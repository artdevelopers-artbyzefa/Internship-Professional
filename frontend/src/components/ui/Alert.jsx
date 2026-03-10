import React from 'react';

export default function Alert({ type = 'error', title, icon, children, className = '', onClose }) {
  const configs = {
    info: {
      container: 'bg-blue-50/50 border-blue-100/50 shadow-blue-50',
      iconBox: 'bg-blue-500 shadow-blue-200',
      text: 'text-blue-900',
      subtext: 'text-blue-700/80',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: 'fa-circle-info'
    },
    success: {
      container: 'bg-emerald-50/50 border-emerald-100/50 shadow-emerald-50',
      iconBox: 'bg-emerald-500 shadow-emerald-200',
      text: 'text-emerald-900',
      subtext: 'text-emerald-700/80',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: 'fa-circle-check'
    },
    warning: {
      container: 'bg-amber-50/50 border-amber-100/50 shadow-amber-50',
      iconBox: 'bg-amber-500 shadow-amber-200',
      text: 'text-amber-900',
      subtext: 'text-amber-800/80',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: 'fa-triangle-exclamation'
    },
    error: {
      container: 'bg-red-50/50 border-red-100/50 shadow-red-50',
      iconBox: 'bg-red-500 shadow-red-200',
      text: 'text-red-900',
      subtext: 'text-red-700/80',
      badge: 'bg-red-100 text-red-700 border-red-200',
      icon: 'fa-circle-xmark'
    },
    danger: {
      container: 'bg-rose-50/50 border-rose-100/50 shadow-rose-50',
      iconBox: 'bg-rose-500 shadow-rose-200',
      text: 'text-rose-900',
      subtext: 'text-rose-700/80',
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
      icon: 'fa-radiation'
    }
  };

  const config = configs[type] || configs.error;
  const currentIcon = icon || config.icon;

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 p-6 flex items-start gap-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${config.container} ${className}`}>
      {/* Sidebar Accent if needed, but the icon box is usually enough for the 'template' look */}

      {/* Floating Icon Box */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-black text-white shadow-lg ${config.iconBox}`}>
        <i className={`fas ${currentIcon}`}></i>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border border-0.5 uppercase ${config.badge}`}>
            {type === 'danger' ? 'Critical' : type} Notice
          </span>
        </div>

        {title && (
          <h3 className={`text-base font-black tracking-tight ${config.text}`}>
            {title}
          </h3>
        )}

        <div className={`text-sm font-bold leading-relaxed mt-1 ${config.subtext}`}>
          {children}
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="w-8 h-8 rounded-full bg-white/50 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center border-0 cursor-pointer shadow-sm"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      )}
    </div>
  );
}
