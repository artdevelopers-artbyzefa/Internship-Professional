import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Send, Users, ShieldAlert, CheckCircle, Search, X, Check } from 'lucide-react';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

const EmailCenter = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [fetchingRecipients, setFetchingRecipients] = useState(false);
    const [recipientsList, setRecipientsList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Check if we arrived here with selected students from another page
    const selectedFromNav = location.state?.selectedRecipients || [];

    const [payload, setPayload] = useState({
        category: selectedFromNav.length > 0 ? 'Selected Recipients' : 'Students',
        subject: '',
        message: '',
        selectedRecipients: selectedFromNav
    });

    const categories = [
        'Students',
        'Faculty Supervisors',
        'Site Supervisors',
        'All Internal Roles',
        'Ineligible Students',
        'Students Pending Placement'
    ];

    const placeholders = [
        { key: '{{name}}', label: "User's Full Name" },
        { key: '{{reg}}', label: "Student Registration #" },
    ];

    // Fetch recipients whenever category changes (unless we have fixed selection from nav)
    useEffect(() => {
        if (payload.category !== 'Selected Recipients') {
            fetchRecipients(payload.category);
        } else if (selectedFromNav.length > 0) {
            // If from nav, we still want to show the names if possible, but for now we trust the IDs
            // Maybe fetch them to show a list
            fetchSpecificRecipients(selectedFromNav);
        }
    }, [payload.category]);

    const fetchRecipients = async (cat) => {
        setFetchingRecipients(true);
        try {
            const data = await apiRequest(`/office/recipients/${cat}`);
            setRecipientsList(data);
            // Default select all
            setPayload(prev => ({ ...prev, selectedRecipients: data.map(u => u._id) }));
        } catch (err) {
            showToast.error('Failed to load recipients');
        } finally {
            setFetchingRecipients(false);
        }
    };

    const fetchSpecificRecipients = async (ids) => {
        setFetchingRecipients(true);
        try {
            // Re-use API logic: we can just find them
            const data = await apiRequest('/office/registered-students'); // Fallback or add specific endpoint
            // Filter locally for now or add endpoint
            const filtered = data.students?.filter(s => ids.includes(s._id)) || [];
            setRecipientsList(filtered);
        } catch (err) {
            console.error(err);
        } finally {
            setFetchingRecipients(false);
        }
    };

    const toggleRecipient = (id) => {
        setPayload(prev => {
            const current = [...prev.selectedRecipients];
            if (current.includes(id)) {
                return { ...prev, selectedRecipients: current.filter(rid => rid !== id) };
            } else {
                return { ...prev, selectedRecipients: [...current, id] };
            }
        });
    };

    const toggleAllRecipients = () => {
        if (payload.selectedRecipients.length === recipientsList.length) {
            setPayload(prev => ({ ...prev, selectedRecipients: [] }));
        } else {
            setPayload(prev => ({ ...prev, selectedRecipients: recipientsList.map(r => r._id) }));
        }
    };

    const insertPlaceholder = (key) => {
        setPayload({ ...payload, message: payload.message + key });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!payload.subject.trim() || !payload.message.trim()) {
            return showToast.error('Please fill in both subject and message');
        }

        if (payload.selectedRecipients.length === 0) {
            return showToast.error('Please select at least one recipient');
        }

        if (!window.confirm(`Are you sure you want to broadcast this email to ${payload.selectedRecipients.length} recipients?`)) {
            return;
        }

        setLoading(true);
        try {
            const res = await apiRequest('/office/broadcast-email', {
                method: 'POST',
                body: payload
            });
            showToast.success(res.message);
            if (payload.category !== 'Selected Recipients') {
                setPayload({ ...payload, subject: '', message: '' });
            }
        } catch (err) {
            showToast.error(err.message || 'Failed to send broadcast');
        } finally {
            setLoading(false);
        }
    };

    const filteredRecipients = recipientsList.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (r.reg && r.reg.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                         <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Email Center</h2>
                        <p className="text-xs text-slate-500 font-medium">Send secure emails to program participants.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Recipients</span>
                        <span className="text-xs font-black text-primary">{payload.selectedRecipients.length} / {recipientsList.length} Students</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* RECIPIENT LIST PANEL */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[700px]">
                        <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Recipients</h3>
                                <button 
                                    onClick={toggleAllRecipients}
                                    className="text-[10px] font-black text-primary px-3 py-1 bg-primary/5 rounded-full hover:bg-primary/10 transition-colors"
                                >
                                    {payload.selectedRecipients.length === recipientsList.length ? 'DESELECT ALL' : 'SELECT ALL'}
                                </button>
                            </div>
                            
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search by name or reg..."
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {fetchingRecipients ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                                    <span className="text-xs font-bold">Syncing recipients...</span>
                                </div>
                            ) : filteredRecipients.length > 0 ? (
                                filteredRecipients.map(user => (
                                    <div 
                                        key={user._id}
                                        onClick={() => toggleRecipient(user._id)}
                                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                                            payload.selectedRecipients.includes(user._id)
                                            ? 'bg-primary/5 border border-primary/10'
                                            : 'hover:bg-slate-50 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors ${
                                                payload.selectedRecipients.includes(user._id)
                                                ? 'bg-primary text-white'
                                                : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-black transition-colors ${
                                                    payload.selectedRecipients.includes(user._id) ? 'text-primary' : 'text-slate-700'
                                                }`}>{user.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{user.reg || user.role}</p>
                                            </div>
                                        </div>
                                        {payload.selectedRecipients.includes(user._id) && (
                                            <Check className="w-4 h-4 text-primary" />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                                    <Users className="w-10 h-10 mb-2" />
                                    <span className="text-xs font-bold">No recipients found</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                             <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest italic">
                                Only selected users will receive this broadcast
                             </p>
                        </div>
                    </div>
                </div>

                {/* COMPOSE SECTION */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-100 p-6">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email Details</span>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Category Selector */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Send To
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            disabled={selectedFromNav.length > 0}
                                            onClick={() => setPayload({ ...payload, category: cat })}
                                            className={`py-3 px-3 rounded-xl text-[9px] font-black transition-all border uppercase tracking-wider ${
                                                payload.category === cat
                                                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-50'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                    {selectedFromNav.length > 0 && (
                                        <button
                                            type="button"
                                            className="py-3 px-3 rounded-xl text-[9px] font-black bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20 uppercase tracking-wider"
                                        >
                                            Custom Selection
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Subject */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</label>
                                <input
                                    type="text"
                                    placeholder="Enter subject line..."
                                    className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm text-slate-700 placeholder:text-slate-300"
                                    value={payload.subject}
                                    onChange={e => setPayload({ ...payload, subject: e.target.value })}
                                />
                            </div>

                            {/* Body */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Body</label>
                                    <div className="flex gap-2">
                                        {placeholders.map(p => (
                                            <button
                                              key={p.key}
                                              type="button"
                                              onClick={() => insertPlaceholder(p.key)}
                                              className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-primary transition-colors uppercase tracking-widest"
                                            >
                                                {p.key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative group">
                                    <textarea
                                        className="w-full px-6 py-6 rounded-3xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-medium text-slate-700 min-h-[350px] resize-none leading-relaxed"
                                        placeholder="Draft your institutional announcement here..."
                                        value={payload.message}
                                        onChange={e => setPayload({ ...payload, message: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center justify-between px-2">
                                    <p className="text-[10px] text-slate-400 font-bold italic flex items-center gap-2">
                                        <ShieldAlert className="w-3 h-3" />
                                        Messages are automatically wrapped in official CUI branding
                                    </p>
                                    <span className="text-[10px] font-black text-slate-300 tracking-widest">{payload.message.length} CHARS</span>
                                </div>
                            </div>

                            {/* Dispatch Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading || payload.selectedRecipients.length === 0}
                                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base hover:bg-blue-800 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span className="uppercase tracking-[0.15em] text-sm">Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            <span className="uppercase tracking-[0.15em] text-sm">Send Email</span>
                                        </>
                                    )}
                                </button>
                                {payload.selectedRecipients.length === 0 && (
                                    <p className="text-center text-rose-500 text-[9px] font-black uppercase tracking-widest mt-3">
                                        Select at least one recipient
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailCenter;
