import React from 'react';

const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const extractProgram = (reg) => {
    if (!reg) return 'N/A';
    const parts = reg.split('-');
    if (parts.length >= 2) return parts[1];
    return 'N/A';
};

const InfoItem = ({ label, value, grow = 0 }) => (
    <div className={`p-4 border-b border-r last:border-r-0 flex flex-col justify-center min-h-[70px] ${grow ? 'md:col-span-2' : ''}`}>
        <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] leading-none mb-2 uppercase">{label}</span>
        <span className="font-black text-gray-800 truncate tracking-tight">{value || 'NOT SET'}</span>
    </div>
);

export default function StudentProfileCard({ user }) {
    if (!user) return null;

    return (
        <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm text-[13px] mb-8">
            <div className="flex flex-col lg:flex-row">
                <div className="lg:w-48 bg-gray-50/50 flex items-center justify-center p-6 border-r-2 border-gray-100">
                    <div className="w-32 h-32 rounded-[2rem] bg-white border-4 border-white shadow-xl overflow-hidden flex items-center justify-center group relative ring-1 ring-gray-100">
                        {user.profilePicture ? (
                            <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <i className="fas fa-user text-5xl text-gray-200"></i>
                        )}
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4">
                    <InfoItem label="Full Name" value={user.name} grow={1} />
                    <InfoItem label="Registration No" value={user.reg} />
                    <InfoItem label="Father Name" value={user.fatherName} />
                    <InfoItem label="Program" value={extractProgram(user.reg)} />
                    <InfoItem label="Section" value={user.section} />
                    <InfoItem label="DOB" value={formatDate(user.dateOfBirth)} />
                    <InfoItem label="Institutional Email" value={user.email} grow={1} />
                    {user.secondaryEmail && (
                        <InfoItem
                            label="Secondary Email"
                            value={
                                <span className="flex items-center gap-2">
                                    <span className="truncate">{user.secondaryEmail}</span>
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0">Linked</span>
                                </span>
                            }
                            grow={1}
                        />
                    )}
                    <InfoItem
                        label="Faculty Supervisor"
                        value={
                            user.assignedFaculty?.name ||
                            (user.internshipRequest?.facultyStatus === 'Pending' ? 'Pending Approval' :
                                user.internshipRequest?.facultyStatus === 'Rejected' ? 'Rejected - Reassign Needed' : 'Not Assigned')
                        }
                        grow={1}
                    />
                </div>
            </div>
        </div>
    );
}
