import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import FacultyDashboard from '../faculty/FacultyDashboard.jsx';
import Button from '../../components/ui/Button.jsx';
import { TextInput } from '../../components/ui/FormInput.jsx';
import { showToast } from '../../utils/notifications.jsx';

export default function SupervisorDashboard({ user, activePhase }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await apiRequest('/supervisor/profile');
            setProfile(data);
            setPhoneValue(data.user.whatsappNumber || '');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePhone = async () => {
        if (!phoneValue) return;
        setUpdating(true);
        try {
            await apiRequest('/supervisor/update-phone', {
                method: 'POST',
                body: { whatsappNumber: phoneValue }
            });
            showToast.success('Contact number updated successfully.');
            setEditingPhone(false);
            // Update local state
            setProfile({
                ...profile,
                user: { ...profile.user, whatsappNumber: phoneValue }
            });
        } catch (err) {
            // Handled
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-10 text-center"><i className="fas fa-circle-notch fa-spin text-primary text-2xl"></i></div>;

    return (
        <div className="space-y-6">
            {/* Professional Identity Header */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group transition-all hover:shadow-md">
                <div className="bg-gradient-to-r from-gray-900 to-slate-800 p-1 relative">
                    <div className="bg-white rounded-[1.8rem] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-blue-100/50">
                                <i className="fas fa-user-tie"></i>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl font-black text-gray-800 tracking-tight">{user.name}</h2>
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-100">Verified Mentor</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                        <i className="fas fa-building text-primary/60 text-[10px]"></i>
                                        <span>{profile?.company?.name || 'Institutional Partner'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                        <i className="fas fa-envelope text-[10px]"></i>
                                        <span>{user.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-2">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Professional Contact</div>
                            {editingPhone ? (
                                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                    <TextInput
                                        size="sm"
                                        value={phoneValue}
                                        onChange={e => setPhoneValue(e.target.value)}
                                        className="border-0 bg-transparent font-bold text-gray-700 w-36"
                                        placeholder="+92..."
                                    />
                                    <div className="flex gap-1">
                                        <button
                                            onClick={handleUpdatePhone}
                                            disabled={updating}
                                            className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-black transition-all border-0 cursor-pointer disabled:opacity-50"
                                        >
                                            <i className={`fas ${updating ? 'fa-spinner fa-spin' : 'fa-check'} text-[10px]`}></i>
                                        </button>
                                        <button
                                            onClick={() => { setEditingPhone(false); setPhoneValue(profile.user.whatsappNumber); }}
                                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-400 flex items-center justify-center hover:text-danger hover:border-danger transition-all cursor-pointer"
                                        >
                                            <i className="fas fa-times text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setEditingPhone(true)}
                                    className="group/phone flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all"
                                >
                                    <span className="font-mono text-sm font-bold text-gray-700">{profile?.user?.whatsappNumber || 'Not Set'}</span>
                                    <i className="fas fa-pen text-[10px] text-gray-300 group-hover/phone:text-primary transition-colors"></i>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Dashboard Content */}
            <FacultyDashboard user={user} activePhase={activePhase} hideBanner={true} />
        </div>
    );
}
