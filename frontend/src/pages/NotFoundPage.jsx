import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-8">
                <div className="text-[120px] font-black text-slate-100 select-none leading-none">404</div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary text-white rounded-3xl rotate-12 flex items-center justify-center text-3xl shadow-xl shadow-primary/20">
                        <i className="fas fa-ghost"></i>
                    </div>
                </div>
            </div>
            
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Gate Not Found</h1>
            <p className="text-slate-500 font-medium max-w-sm mb-10 leading-relaxed">
                The terminal you're looking for doesn't exist or is currently restricted within the sector.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <button 
                    onClick={() => navigate(-1)}
                    className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
                >
                    Return Back
                </button>
                <button 
                    onClick={() => navigate('/')}
                    className="px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                    Go to Dashboard
                </button>
            </div>

            <div className="mt-16 text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-3">
                <div className="w-8 h-px bg-slate-200"></div>
                <span>Internship Professional Core</span>
                <div className="w-8 h-px bg-slate-200"></div>
            </div>
        </div>
    );
}
