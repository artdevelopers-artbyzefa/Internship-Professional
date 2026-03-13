import React from 'react';

export default function StudentProfileCard({ user }) {
    if (!user) return null;

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 sm:p-6 mb-8 flex flex-col md:flex-row items-center gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-50 border overflow-hidden flex-shrink-0">
                {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200 text-3xl">
                        <i className="fas fa-user"></i>
                    </div>
                )}
            </div>
            <div className="flex-1 text-center md:text-left min-w-0 w-full">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div className="min-w-0">
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight truncate px-2">{user.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-3 justify-center md:justify-start px-2">
                            <span className="text-primary font-bold text-[9px] sm:text-[10px] uppercase tracking-wider bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10 flex items-center shrink-0">
                                <i className="fas fa-id-card mr-2 opacity-60"></i> {user.reg}
                            </span>
                            <span className="text-gray-400 font-bold text-[9px] sm:text-[10px] bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-100 flex items-center min-w-0">
                                <i className="fas fa-envelope mr-2 opacity-60 text-[10px] shrink-0"></i> 
                                <span className="break-all sm:break-normal">{user.email}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
                    <div className="p-3 md:p-4 flex flex-col items-center md:items-start transition-colors hover:bg-white">
                        <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">Father's Name</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-800 truncate w-full text-center md:text-left">{user.fatherName || 'Pending'}</p>
                    </div>
                    <div className="p-3 md:p-4 flex flex-col items-center md:items-start transition-colors hover:bg-white">
                        <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">Classification</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-800 text-center md:text-left">Sem {user.semester || '—'} / {user.section || '—'}</p>
                    </div>
                    <div className="p-3 md:p-4 flex flex-col items-center md:items-start transition-colors hover:bg-white">
                        <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">Academic Merit</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-800 text-center md:text-left">{user.cgpa || '0.00'} CGPA</p>
                    </div>
                    <div className="p-3 md:p-4 flex flex-col items-center md:items-start transition-colors hover:bg-white">
                        <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">Course</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-800 truncate w-full text-center md:text-left">{user.registeredCourse || 'Internship'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
