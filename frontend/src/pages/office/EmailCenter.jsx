import React, { useState, useEffect,useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Send, Users, ShieldAlert, CheckCircle, Search, X, Check } from 'lucide-react';
import { apiRequest } from '../../utils/api.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';
import { SelectInput } from '../../components/ui/FormInput.jsx';

const EmailCenter = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [fetchingRecipients, setFetchingRecipients] = useState(false);
    const [recipientsList, setRecipientsList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({});
    const [groupPageSize, setGroupPageSize] = useState({}); // Tracking pagination per group
    
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
            // Error handled by apiRequest
        } finally {
            setFetchingRecipients(false);
        }
    };

    const fetchSpecificRecipients = async (ids) => {
        if (!ids || ids.length === 0) return;
        setFetchingRecipients(true);
        try {
            // Use the new ?ids= filter I just added to the office/registered-students route
            const idString = ids.join(',');
            const response = await apiRequest(`/office/registered-students?ids=${idString}&limit=500`);
            
            // Backend returns { data: [...], total, page, pages }
            const students = response?.data || [];
            setRecipientsList(students);
            // Ensure they are selected in the state
            setPayload(prev => ({ ...prev, selectedRecipients: students.map(s => s._id) }));
        } catch (err) {
            // Error handled by apiRequest
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

        const confirmed = await showAlert.confirm(
            'Confirm Broadcast',
            `Are you sure you want to broadcast this email to ${payload.selectedRecipients.length} recipient${payload.selectedRecipients.length > 1 ? 's' : ''}?`,
            'Yes, Send Email'
        );
        if (!confirmed) return;

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
            // Error handled by apiRequest
        } finally {
            setLoading(false);
        }
    };

    const getGroup = (user) => {
        if (user.role !== 'student' || !user.reg) return user.role === 'faculty_supervisor' ? 'Faculty Supervisors' : user.role === 'site_supervisor' ? 'Site Supervisors' : 'Other';
        const match = user.reg.match(/(FA|SP)\d{2}/i);
        return match ? match[0].toUpperCase() : 'Other Students';
    };

    const groupedRecipients = useMemo(() => {
        const filtered = recipientsList.filter(r => 
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (r.reg && r.reg.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const groups = {};
        filtered.forEach(r => {
            const g = getGroup(r);
            if (!groups[g]) groups[g] = [];
            groups[g].push(r);
        });

        // Sort groups: FA/SP first, then roles
        return Object.keys(groups).sort((a, b) => {
            const isStudentGroup = (s) => /^(FA|SP)\d{2}/.test(s);
            if (isStudentGroup(a) && !isStudentGroup(b)) return -1;
            if (!isStudentGroup(a) && isStudentGroup(b)) return 1;
            return a.localeCompare(b);
        }).reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {});
    }, [recipientsList, searchTerm]);

    const currentVisibleIds = useMemo(() => {
        return Object.values(groupedRecipients).flat().map(u => u._id);
    }, [groupedRecipients]);

    const toggleAllRecipients = () => {
        const isAllVisibleSelected = currentVisibleIds.every(id => payload.selectedRecipients.includes(id));
        
        setPayload(prev => {
            if (isAllVisibleSelected) {
                return { 
                    ...prev, 
                    selectedRecipients: prev.selectedRecipients.filter(id => !currentVisibleIds.includes(id)) 
                };
            } else {
                return { 
                    ...prev, 
                    selectedRecipients: [...new Set([...prev.selectedRecipients, ...currentVisibleIds])] 
                };
            }
        });
    };

    const allVisibleSelected = useMemo(() => {
        if (currentVisibleIds.length === 0) return false;
        return currentVisibleIds.every(id => payload.selectedRecipients.includes(id));
    }, [currentVisibleIds, payload.selectedRecipients]);

    const toggleGroup = (groupName) => {
        const groupMembers = groupedRecipients[groupName].map(u => u._id);
        const allSelected = groupMembers.every(id => payload.selectedRecipients.includes(id));

        setPayload(prev => {
            if (allSelected) {
                return { ...prev, selectedRecipients: prev.selectedRecipients.filter(id => !groupMembers.includes(id)) };
            } else {
                const newSelection = Array.from(new Set([...prev.selectedRecipients, ...groupMembers]));
                return { ...prev, selectedRecipients: newSelection };
            }
        });
    };

    const toggleAccordion = (groupName) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const showMoreInGroup = (groupName) => {
        setGroupPageSize(prev => ({ ...prev, [groupName]: (prev[groupName] || 20) + 50 }));
    };



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
                        <span className="text-[9px] font-black text-slate-400 tracking-widest">Selected Recipients</span>
                        <span className="text-xs font-black text-primary">{payload.selectedRecipients.length} / {recipientsList.length} Students</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* RECIPIENT LIST PANEL */}
                <div className="lg:col-span-3 sticky top-8">
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-[200px] max-h-[calc(100vh-8rem)]">
                        <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-slate-800 text-sm tracking-wider">Recipients</h3>
                                <button 
                                    onClick={toggleAllRecipients}
                                    className="text-[10px] font-black text-primary px-3 py-1 bg-primary/5 rounded-full hover:bg-primary/10 transition-colors"
                                >
                                    {allVisibleSelected ? 'Deselect All' : 'Select All'}
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

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {fetchingRecipients ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                                    <span className="text-xs font-bold">Syncing recipients...</span>
                                </div>
                            ) : Object.keys(groupedRecipients).length > 0 ? (
                                Object.entries(groupedRecipients).map(([groupName, members]) => {
                                    const allSelected = members.every(u => payload.selectedRecipients.includes(u._id));
                                    const someSelected = members.some(u => payload.selectedRecipients.includes(u._id));
                                    const isExpanded = expandedGroups[groupName] !== false; // Default expanded
                                    
                                    const itemsToShow = groupPageSize[groupName] || 20;
                                    const truncatedMembers = members.slice(0, itemsToShow);
                                    const hasMore = members.length > itemsToShow;

                                    return (
                                        <div key={groupName} className="space-y-2">
                                            <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => toggleAccordion(groupName)}
                                                        className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                                                    >
                                                        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px] text-slate-400`}></i>
                                                    </button>
                                                    <span className="text-[10px] font-black text-slate-700 tracking-widest">{groupName}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-100">{members.length}</span>
                                                </div>
                                                <button 
                                                    onClick={() => toggleGroup(groupName)}
                                                    className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                                        allSelected ? 'bg-primary border-primary text-white' : 
                                                        someSelected ? 'bg-primary/20 border-primary/30 text-primary' :
                                                        'bg-white border-slate-300'
                                                    }`}
                                                >
                                                    {allSelected ? <Check className="w-3 h-3" strokeWidth={4} /> : someSelected ? <div className="w-2 h-0.5 bg-primary rounded-full"></div> : null}
                                                </button>
                                            </div>

                                            {isExpanded && (
                                                <div className="pl-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {truncatedMembers.map(user => (
                                                        <div 
                                                            key={user._id}
                                                            onClick={() => toggleRecipient(user._id)}
                                                            className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                                                payload.selectedRecipients.includes(user._id)
                                                                ? 'bg-primary/5 border border-primary/10'
                                                                : 'hover:bg-slate-50 border border-transparent'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-colors shrink-0 ${
                                                                    payload.selectedRecipients.includes(user._id)
                                                                    ? 'bg-primary text-white'
                                                                    : 'bg-slate-100 text-slate-400'
                                                                }`}>
                                                                    {user.name.charAt(0)}
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className={`text-[11px] font-black truncate transition-colors ${
                                                                        payload.selectedRecipients.includes(user._id) ? 'text-primary' : 'text-slate-700'
                                                                    }`}>{user.name}</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold truncate tracking-tight">{user.reg || (user.role === 'faculty_supervisor' ? 'Faculty' : 'Site Supervisor')}</p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                                payload.selectedRecipients.includes(user._id) ? 'bg-primary border-primary text-white' : 'border-slate-200'
                                                            }`}>
                                                                {payload.selectedRecipients.includes(user._id) && <Check className="w-2.5 h-2.5" strokeWidth={4} />}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {hasMore && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                showMoreInGroup(groupName);
                                                            }}
                                                            className="w-full py-2 text-[10px] font-black text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all tracking-widest"
                                                        >
                                                            + Show {members.length - itemsToShow} More
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                                    <Users className="w-10 h-10 mb-2" />
                                    <span className="text-xs font-bold">No recipients found</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                             <p className="text-[10px] font-bold text-slate-400 text-center tracking-widest italic">
                                Only selected users will receive this broadcast
                             </p>
                        </div>
                    </div>
                </div>

                {/* COMPOSE SECTION */}
                <div className="lg:col-span-9 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-100 p-6">
                             <span className="text-[10px] font-black text-slate-400 tracking-[0.2em]">Email Details</span>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Category Selector */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 tracking-widest flex items-center gap-2">
                                    Broadcast Audience Category
                                </label>
                                <div className="relative">
                                    {selectedFromNav.length > 0 ? (
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-amber-800">Custom Manual Selection</p>
                                                    <p className="text-[10px] text-amber-600 font-bold tracking-tight">Active for this broadcast only</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <SelectInput 
                                            value={payload.category}
                                            onChange={(e) => setPayload({ ...payload, category: e.target.value })}
                                            className="!rounded-2xl !bg-slate-50/50 !py-4 shadow-sm border-0 font-black text-sm text-slate-700"
                                        >
                                           {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                           ))}
                                        </SelectInput>
                                    )}
                                </div>
                            </div>

                            {/* Subject */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 tracking-widest">Subject</label>
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
                                    <label className="text-[10px] font-black text-slate-400 tracking-widest">Message Body</label>
                                    <div className="flex gap-2">
                                        {placeholders.map(p => (
                                            <button
                                              key={p.key}
                                              type="button"
                                              onClick={() => insertPlaceholder(p.key)}
                                              className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-primary transition-colors tracking-widest"
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
                            <div className="pt-4 flex justify-center">
                                <button
                                    type="submit"
                                    disabled={loading || payload.selectedRecipients.length === 0}
                                    className="w-fit px-16 py-4 bg-primary text-white rounded-2xl font-black text-base hover:bg-blue-800 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span className="tracking-[0.15em] text-sm">Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            <span className="tracking-[0.15em] text-sm">Send Email</span>
                                        </>
                                    )}
                                </button>
                                {payload.selectedRecipients.length === 0 && (
                                    <p className="text-center text-rose-500 text-[9px] font-black tracking-widest mt-3">
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
