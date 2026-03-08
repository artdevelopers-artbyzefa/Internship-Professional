import React from 'react';

export default function ProgressBar({ value, max = 100 }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className="h-full bg-secondary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
