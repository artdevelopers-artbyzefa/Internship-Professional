import React from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative group w-full">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300">
        <i className="fas fa-search text-xs"></i>
      </div>
      <input
        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-300 placeholder:text-slate-400"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
