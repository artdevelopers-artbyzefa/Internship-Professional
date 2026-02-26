import React from 'react';

export default function Alert({ type = 'error', icon, children, className = '', onClose }) {
  const styles = {
    info:    'bg-blue-50/80   text-blue-900   border-blue-100/50   icon-blue-600',
    success: 'bg-emerald-50/80 text-emerald-900 border-emerald-100/50 icon-emerald-600',
    warning: 'bg-amber-50/80   text-amber-900   border-amber-100/50   icon-amber-600',
    error:   'bg-amber-100/60   text-amber-900   border-amber-200/50   icon-amber-700', // Matches the provided image style
    danger:  'bg-red-50/80     text-red-900     border-red-100/50     icon-red-600'
  };

  const icons = {
    info:    'fa-circle-info',
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    error:   'fa-triangle-exclamation', // The image shows a warning icon for errors
    danger:  'fa-circle-xmark',
  };

  const currentStyle = styles[type] || styles.error;
  const currentIcon = icon || icons[type] || icons.error;

  return (
    <div className={`flex items-start gap-3.5 p-4 rounded-2xl border ${currentStyle} transition-all duration-300 ${className} animate-in fade-in slide-in-from-top-2 relative group`}>
      <i className={`fas ${currentIcon} text-base mt-0.5 opacity-90`}></i>
      <div className="flex-1 text-[13.5px] font-medium leading-[1.6] leading-relaxed pr-6">
        {children}
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          type="button" 
          className="absolute right-3.5 top-3.5 p-1 rounded-lg hover:bg-black/5 text-current opacity-40 hover:opacity-100 transition-all cursor-pointer border-0 bg-transparent"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      )}
    </div>
  );
}
