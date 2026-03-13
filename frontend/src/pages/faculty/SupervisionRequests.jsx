import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function SupervisionRequests({ user }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/faculty/pending-requests');
            setRequests(data);
        } catch (err) {
            console.error('Failed to fetch requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async (studentId, action) => {
        try {
            await apiRequest('/faculty/handle-request', {
                method: 'POST',
                body: { studentId, action }
            });
            showToast.success(`Request ${action.toLowerCase()}ed successfully`);
            fetchRequests();
        } catch (err) {
            showToast.error(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="text-center md:text-left">
                    <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Supervision Requests</h2>
                    <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">Accept or reject internship supervision invitations from students.</p>
                </div>
            </div>

            <Card title="Pending Requests" icon="fa-user-pen" className="border-l-4 border-l-emerald-500 bg-emerald-50/10 !p-4 md:!p-6">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <div className="p-1 px-3 border border-emerald-100 bg-emerald-50 rounded-full inline-flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest whitespace-nowrap">Action Required</span>
                    </div>
                    <div className="px-3 py-1 bg-white/50 border border-gray-100 rounded-full text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        First Come First Serve Queue
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <i className="fas fa-circle-notch fa-spin text-3xl text-emerald-500"></i>
                    </div>
                ) : requests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {requests.map(request => (
                            <div key={request._id} className="bg-white p-4 md:p-6 rounded-2xl border-2 border-emerald-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-sm font-black text-gray-800">{request.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{request.reg}</p>
                                    </div>
                                    <div className="text-[9px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                        {new Date(request.internshipRequest.submittedAt).toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                                        <i className="fas fa-building w-4 text-emerald-500"></i>
                                        {request.internshipRequest.companyName}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                                        <i className="fas fa-briefcase w-4 text-emerald-500"></i>
                                        {request.internshipRequest.type} — {request.internshipRequest.mode}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleRequest(request._id, 'Accepted')}
                                        className="py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleRequest(request._id, 'Rejected')}
                                        className="py-2.5 rounded-xl border-2 border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-10 text-center text-gray-400 italic text-sm bg-white/50 rounded-2xl border border-dashed border-gray-100">
                        <i className="fas fa-user-clock text-2xl mb-3 block opacity-20"></i>
                        No pending supervision invitations in your current queue.
                    </div>
                )}
            </Card>
        </div>
    );
}
