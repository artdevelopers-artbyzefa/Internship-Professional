import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function SupervisorAssignments({ user }) {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        startDate: '',
        deadline: '',
        totalMarks: 10
    });

    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const data = await apiRequest('/supervisor/assignments');
            setAssignments(data);
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', newAssignment.title);
            formData.append('description', newAssignment.description);
            formData.append('startDate', newAssignment.startDate);
            formData.append('deadline', newAssignment.deadline);
            formData.append('totalMarks', newAssignment.totalMarks);
            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            await apiRequest('/supervisor/assignments', {
                method: 'POST',
                body: formData,
                headers: {} // Let browser set boundary for FormData
            });
            showToast.success('Industrial task synchronized successfully.');
            setShowAdd(false);
            setNewAssignment({ title: '', description: '', startDate: '', deadline: '', totalMarks: 10 });
            setSelectedFile(null);
            fetchAssignments();
        } catch (err) { }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
                <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Industrial Task Ledger</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Deploy and monitor professional milestones for your intern cohort.</p>
                </div>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-0 shadow-lg cursor-pointer ${showAdd ? 'bg-rose-50 text-rose-600 shadow-rose-100' : 'bg-primary text-white shadow-primary/20 hover:shadow-primary/40'}`}
                >
                    {showAdd ? <><i className="fas fa-times mr-2"></i> Close Panel</> : <><i className="fas fa-plus mr-2"></i> Deploy Task</>}
                </button>
            </div>

            {showAdd && (
                <Card className="animate-in slide-in-from-top-4 duration-500 border-primary/20 bg-gradient-to-br from-white to-blue-50/20 p-8 rounded-[2.5rem]">
                    <form onSubmit={handleAdd} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-8">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-left">Strategic Title</label>
                                <input
                                    className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-primary focus:bg-white bg-gray-50/50 outline-none transition-all font-bold text-gray-700"
                                    required
                                    placeholder="e.g., Q3 Systems Architecture Review"
                                    value={newAssignment.title}
                                    onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-left">Weightage (Marks)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-primary focus:bg-white bg-gray-50/50 outline-none transition-all font-bold text-gray-700 pr-12"
                                        required
                                        value={newAssignment.totalMarks}
                                        onChange={e => setNewAssignment({ ...newAssignment, totalMarks: e.target.value })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 tracking-tighter uppercase">PTS</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-left">Project Directives & Instructions</label>
                            <textarea
                                className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-primary focus:bg-white bg-gray-50/50 outline-none transition-all font-bold text-gray-700 min-h-[120px] resize-none"
                                required
                                placeholder="Describe the technical scope and expected deliverables..."
                                value={newAssignment.description}
                                onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-left">Deployment Date</label>
                                <input
                                    type="date"
                                    className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-primary focus:bg-white bg-gray-50/50 outline-none transition-all font-bold text-gray-700"
                                    required
                                    value={newAssignment.startDate}
                                    onChange={e => setNewAssignment({ ...newAssignment, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-left">Submission Deadline</label>
                                <input
                                    type="date"
                                    className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-primary focus:bg-white bg-gray-50/50 outline-none transition-all font-bold text-gray-700"
                                    required
                                    value={newAssignment.deadline}
                                    onChange={e => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-left">Supporting Documents</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={e => setSelectedFile(e.target.files[0])}
                                    />
                                    <div className={`p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-2 ${selectedFile ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50/50 border-gray-100 group-hover:border-primary/30 group-hover:bg-primary/5 text-gray-400'}`}>
                                        <i className={`fas ${selectedFile ? 'fa-file-circle-check' : 'fa-cloud-arrow-up'} text-xs`}></i>
                                        <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">
                                            {selectedFile ? selectedFile.name : 'Upload Assets'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowAdd(false)}
                                className="px-8 py-4 rounded-2xl bg-white border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-all cursor-pointer"
                            >
                                Discard
                            </button>
                            <button type="submit" className="px-12 py-4 rounded-2xl bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-black transition-all active:scale-95 border-0 cursor-pointer">
                                Sync Task to Portal <i className="fas fa-paper-plane ml-2 text-[9px]"></i>
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-20 text-center"><i className="fas fa-circle-notch fa-spin text-primary text-3xl"></i></div>
                ) : assignments.length === 0 ? (
                    <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-100 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 mx-auto mb-6 shadow-inner">
                            <i className="fas fa-folder-open text-3xl"></i>
                        </div>
                        <h3 className="text-xl font-black text-gray-800">No Industrial Tasks Deployed</h3>
                        <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">Click &quot;Deploy Task&quot; above to start managing your intern workforce milestones.</p>
                    </div>
                ) : assignments.map(assignment => (
                    <Card key={assignment._id} className="hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all p-0 overflow-hidden group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center text-xl group-hover:bg-primary group-hover:text-white transition-all shadow-inner border border-blue-100/50">
                                    <i className="fas fa-shield-halved"></i>
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="font-black text-gray-800 tracking-tight text-lg">{assignment.title}</h4>
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-100">Industrial</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                            <i className="far fa-calendar-check text-[10px]"></i>
                                            <span>Deadline: {new Date(assignment.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                                            <i className="fas fa-award text-[10px]"></i>
                                            <span className="uppercase tracking-tighter">{assignment.totalMarks} Points</span>
                                        </div>
                                        {assignment.fileUrl && (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                                                <i className="fas fa-paperclip text-[10px]"></i>
                                                <span>Asset Attached</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8 md:border-l border-gray-50 md:pl-8">
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-gray-300 tracking-widest uppercase mb-1 leading-none">Status</p>
                                    <p className="text-sm font-black text-emerald-500 flex items-center gap-2 justify-end">
                                        Active Deployment <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all text-gray-300">
                                    <i className="fas fa-chevron-right text-xs"></i>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
