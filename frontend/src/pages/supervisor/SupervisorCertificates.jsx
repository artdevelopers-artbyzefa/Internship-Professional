import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function SupervisorCertificates() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const data = await apiRequest('/supervisor/certificate-students');
            setStudents(data || []);
        } catch (err) { }
        finally { setLoading(false); }
    };

    const handleUpload = async (studentId, file) => {
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);

        setUploading(studentId);
        try {
            await apiRequest(`/supervisor/upload-certificate/${studentId}`, {
                method: 'POST',
                body: formData
            });
            showToast.success('Certificate uploaded successfully');
            fetchStudents();
        } catch (err) { 
            showToast.error('Upload failed');
        } finally {
            setUploading(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <i className="fas fa-circle-notch fa-spin text-3xl text-primary opacity-20"></i>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-none uppercase">Student Certificates</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Professional accreditation management</p>
                </div>
                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                    <i className="fas fa-award text-xl"></i>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/60 border-b border-gray-50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Student Intern</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Engagement Type</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Performance</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Archive Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                        <i className="fas fa-user-slash text-2xl mb-4 block opacity-20"></i>
                                        No Assigned Interns Found
                                    </td>
                                </tr>
                            ) : students.map((s) => (
                                <tr key={s._id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center font-black text-xs border border-indigo-100 grayscale hover:grayscale-0 transition-all">
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-800 leading-none">{s.name}</p>
                                                <p className="text-[10px] text-gray-400 font-black mt-1 uppercase tracking-tighter">{s.reg}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-gray-700">{s.company}</span>
                                            <span className="text-[10px] text-gray-400 font-black mt-0.5 uppercase tracking-tighter">{s.mode} Engagement</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {s.grade !== 'N/A' ? (
                                            <div className="inline-flex flex-col items-center">
                                                <span className={`text-sm font-black ${s.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{s.grade}</span>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{s.percentage}% Score</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-300 font-black italic tracking-widest uppercase opacity-50">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {s.certificateUrl ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-100">
                                                <i className="fas fa-check-circle"></i>
                                                Verified
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border border-amber-100 animate-pulse">
                                                <i className="fas fa-clock"></i>
                                                Awaiting
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {s.certificateUrl && (
                                                <a 
                                                    href={s.certificateUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-primary transition-all flex items-center justify-center cursor-pointer"
                                                    title="View Document"
                                                >
                                                    <i className="fas fa-eye text-xs"></i>
                                                </a>
                                            )}
                                            <label className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm
                                                ${uploading === s._id 
                                                    ? 'bg-gray-50 text-gray-400 border border-gray-100' 
                                                    : 'bg-primary text-white hover:bg-black'}`}>
                                                {uploading === s._id ? (
                                                    <><i className="fas fa-circle-notch fa-spin"></i> Processing</>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-cloud-upload-alt"></i>
                                                        {s.certificateUrl ? 'Replace' : 'Upload'}
                                                    </>
                                                )}
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept=".pdf,image/*"
                                                    onChange={(e) => handleUpload(s._id, e.target.files[0])}
                                                    disabled={uploading === s._id}
                                                />
                                            </label>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Footer */}
            <div className="bg-gray-50/20 p-6 rounded-2xl border border-dotted border-gray-200 flex items-center gap-5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-300 text-sm border border-gray-100">
                    <i className="fas fa-info-circle"></i>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-3xl">
                    Institutional policy requires site supervisors to upload the official scanned copy of the internship certificate. 
                    This document will be permanently linked to the student's institutional record and verified during the final departmental audit.
                </p>
            </div>
        </div>
    );
}
