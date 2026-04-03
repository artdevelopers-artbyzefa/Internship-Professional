import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../utils/api.js';

export default function SearchInput({ 
    label, 
    placeholder, 
    endpoint, 
    onSelect, 
    value, 
    onChange, 
    iconLeft, 
    autoSnap = true,
    required = false,
    disabled = false,
    className = ""
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!value || value.length < 2 || disabled) {
            setSuggestions([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await apiRequest(`${endpoint}?q=${encodeURIComponent(value)}`);
                setSuggestions(results || []);
                setShowSuggestions(true);

                // Auto-snap Match Logic: Flexible matching (ignores titles like Dr, Prof, etc.)
                if (autoSnap) {
                    const normalize = (str) => str?.toLowerCase().replace(/^(dr|prof|mr|ms|mrs)\.?\s+/i, '').trim();
                    const inputNorm = normalize(value);
                    
                    const match = (results || []).find(s => {
                        const targetNorm = normalize(s.name || s.display_name);
                        return targetNorm === inputNorm || targetNorm.startsWith(inputNorm) && (results.length === 1);
                    });

                    if (match) {
                        onSelect(match);
                        setShowSuggestions(false);
                    }
                }
            } catch (err) {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [value, endpoint, disabled, autoSnap]);

    const handleSelect = (item) => {
        onSelect(item);
        setShowSuggestions(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative group">
                {iconLeft && (
                    <i className={`fas ${iconLeft} absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary`}></i>
                )}
                <input
                    type="text"
                    required={required}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => value?.length >= 2 && setShowSuggestions(true)}
                    placeholder={placeholder}
                    className={`w-full ${iconLeft ? 'pl-11' : 'px-4'} py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/5 focus:bg-white outline-none transition-all shadow-sm ${className}`}
                />
                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <i className="fas fa-circle-notch fa-spin text-primary/40 text-[10px]"></i>
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                        <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                            Matching Suggestions
                        </div>
                        {suggestions.map((item, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelect(item)}
                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 group transition-all flex items-center justify-between gap-4"
                            >
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-800 group-hover:text-primary transition-colors">
                                        {item.name || item.display_name}
                                    </span>
                                    {(item.email || item.company) && (
                                        <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                                            {item.email && <><i className="fas fa-envelope mr-1 text-[9px] opacity-40"></i>{item.email}</>}
                                            {item.email && item.company && <span className="mx-1.5 opacity-20">|</span>}
                                            {item.company && <><i className="fas fa-building mr-1 text-[9px] opacity-40"></i>{item.company}</>}
                                        </span>
                                    )}
                                </div>
                                <i className="fas fa-chevron-right text-[9px] text-slate-200 group-hover:text-primary group-hover:translate-x-1 transition-all"></i>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
