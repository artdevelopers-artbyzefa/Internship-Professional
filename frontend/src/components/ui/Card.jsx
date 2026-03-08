import React from 'react';

export default function Card({ children, className = '', title, subtitle, icon }) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
              <i className={`fas ${icon} text-sm text-primary`}></i>
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-800 tracking-tight">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

