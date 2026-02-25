import React from 'react';

export default function StepWizard({ steps, current }) {
  return (
    <div className="flex items-center mb-7">
      {steps.map((label, i) => {
        const num = i + 1;
        const done   = num < current;
        const active = num === current;
        return (
          <div key={label} className="flex flex-col items-center flex-1 relative">
            {/* connector line */}
            {i < steps.length - 1 && (
              <div className={`absolute top-4 left-1/2 w-full h-0.5 z-0 ${done || active ? 'bg-secondary' : 'bg-gray-200'}`} />
            )}
            {/* circle */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10
              ${done   ? 'bg-success text-white'
              : active ? 'bg-secondary text-white'
              :          'bg-gray-200 text-gray-500'}`}>
              {done ? <i className="fas fa-check text-xs"></i> : num}
            </div>
            <div className={`text-xs mt-1.5 font-medium text-center ${active ? 'text-secondary' : 'text-gray-400'}`}>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
