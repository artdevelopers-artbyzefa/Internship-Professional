import React from 'react';

export default function StudentProfileCard({ user }) {
    if (!user) return null;

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gray-50 border overflow-hidden flex-shrink-0">
                {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200 text-3xl">
                        <i className="fas fa-user"></i>
                    </div>
                )}
            </div>
            <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-black text-gray-800 tracking-tight">{user.name}</h3>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">{user.reg}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <i className="fas fa-university text-primary opacity-50"></i>
                        <span>Semester {user.semester || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <i className="fas fa-chart-simple text-purple-500 opacity-50"></i>
                        <span>CGPA {user.cgpa || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <i className="fas fa-envelope text-orange-500 opacity-50"></i>
                        <span>{user.email}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 px-6 border-l hidden md:flex">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.status === 'Assigned' || user.status === 'Agreement Approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                    {user.status || 'Verified'}
                </span>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Current Status</p>
            </div>
        </div>
    );
}
