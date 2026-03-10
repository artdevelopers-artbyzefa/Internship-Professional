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
            <div className="flex-1 text-center md:text-left overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{user.name}</h3>
                        <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
                            <span className="text-primary font-bold text-[10px] uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                                <i className="fas fa-id-card mr-1.5 opacity-50"></i> {user.reg}
                            </span>
                            <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                <i className="fas fa-envelope mr-1.5 opacity-50"></i> {user.email}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-2 pr-2 hidden md:flex">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${user.status === 'Assigned' || user.status === 'Agreement Approved'
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-primary text-white border-primary/20'
                            }`}>
                            {user.status || 'Verified'}
                        </span>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Current Academic Status</p>
                    </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-gray-100 grid grid-cols-1 md:grid-cols-4">
                    <div className="p-4 flex flex-col items-center md:items-start transition-colors hover:bg-white">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Father's Name</p>
                        <p className="text-xs font-bold text-gray-800 truncate w-full">{user.fatherName || 'Information Pending'}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center md:items-start transition-colors hover:bg-white">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Classification</p>
                        <p className="text-xs font-bold text-gray-800">Semester {user.semester || '—'} / Sec {user.section || '—'}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center md:items-start transition-colors hover:bg-white">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Current Merit</p>
                        <p className="text-xs font-bold text-gray-800">{user.cgpa || '0.00'} CGPA</p>
                    </div>
                    <div className="p-4 flex flex-col items-center md:items-start transition-colors hover:bg-white bg-gray-50/10">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Registered Course</p>
                        <p className="text-xs font-bold text-gray-800 truncate w-full">{user.registeredCourse || 'Internship'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
