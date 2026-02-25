import React, { useState, useEffect } from 'react';
import NoticeItem from './NoticeItem.jsx';
import { apiRequest } from '../../utils/api.js';

export default function NoticeModal() {
    const [notices, setNotices] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitialNotices = async () => {
            try {
                const data = await apiRequest('/notices/my');
                if (data && data.length > 0) {
                    setNotices(data);
                    setIsOpen(true);
                }
            } catch (err) {
                console.error('Modal Fetch Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialNotices();
    }, []);

    if (loading || !isOpen || notices.length === 0) return null;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
        >
            <div 
                className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)' }}
            >
                {/* Header with Close */}
                <div className="flex items-center justify-between p-6 border-b border-blue-50">
                    <div className="flex items-center gap-3 text-primary">
                        <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                            <i className="fas fa-bullhorn text-lg"></i>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Recent Announcements</h2>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {notices.map(notice => (
                        <NoticeItem key={notice._id} notice={notice} />
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-blue-50 bg-gray-50/50 flex justify-center">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-blue-800 transition-all hover:shadow-lg active:scale-95"
                    >
                        I've read these
                    </button>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
