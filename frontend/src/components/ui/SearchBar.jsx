import React from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
      <input
        className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl font-poppins text-sm outline-none focus:border-secondary w-60 transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
