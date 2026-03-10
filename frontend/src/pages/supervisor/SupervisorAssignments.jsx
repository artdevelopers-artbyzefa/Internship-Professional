import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

export default function SupervisorAssignments({ user }) {
    const [assignments, setAssignments] = useState([]);
    const [interns, setInterns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const navigate = useNavigate();
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        startDate: '',
        deadline: '',
        totalMarks: 10,
        targetStudents: [] // Empty means all
    });

    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        fetchAssignments();
        fetchInterns();
    }, []);

    const fetchInterns = async () => {
        try {
            const data = await apiRequest('/supervisor/interns');
            setInterns(data);
        } catch (err) { }
    };

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

            // Append target students
            if (newAssignment.targetStudents.length > 0) {
                newAssignment.targetStudents.forEach(id => {
                    formData.append('targetStudents[]', id);
                });
            }

            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            await apiRequest('/supervisor/assignments', {
                method: 'POST',
                body: formData
            });
            showToast.success('Technical task assigned successfully.');
            setShowAdd(false);
            setNewAssignment({ title: '', description: '', startDate: '', deadline: '', totalMarks: 10, targetStudents: [] });
            setSelectedFile(null);
            fetchAssignments();
        } catch (err) { }
    };

    const toggleStudent = (id) => {
        setNewAssignment(prev => {
            const current = [...prev.targetStudents];
            if (current.includes(id)) {
                return { ...prev, targetStudents: current.filter(sid => sid !== id) };
            } else {
                return { ...prev, targetStudents: [...current, id] };
            }
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Assignment Management</h2>
                </div>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 border-0 shadow-lg cursor-pointer flex items-center gap-2 ${showAdd ? 'bg-gray-100 text-gray-600 shadow-none' : 'bg-primary text-white shadow-primary/20'}`}
                >
                    {showAdd ? <><i className="fas fa-times"></i> Close Panel</> : <><i className="fas fa-plus"></i> Assign New Task</>}
                </button>
            </div>

            {showAdd && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg animate-in slide-in-from-top-4 duration-300 mb-8">
                    <form onSubmit={handleAdd} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assignment Title</label>
                                <input
                                    className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-sm text-gray-700 bg-gray-50/50"
                                    required
                                    placeholder="e.g., Weekly Technical Report - Week 1"
                                    value={newAssignment.title}
                                    onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Total Marks</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-primary outline-none transition-all font-bold text-sm text-gray-700 bg-gray-50/50"
                                    required
                                    value={newAssignment.totalMarks}
                                    onChange={e => setNewAssignment({ ...newAssignment, totalMarks: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Task Description & Instructions</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-primary bg-gray-50/50 outline-none transition-all font-bold text-sm text-gray-700 min-h-[100px] resize-none"
                                required
                                placeholder="Details of the task..."
                                value={newAssignment.description}
                                onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 focus:border-primary bg-gray-50/50 outline-none transition-all font-bold text-xs text-gray-700"
                                    required
                                    value={newAssignment.startDate}
                                    onChange={e => setNewAssignment({ ...newAssignment, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Submission Deadline</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 focus:border-primary bg-gray-50/50 outline-none transition-all font-bold text-xs text-gray-700"
                                    required
                                    value={newAssignment.deadline}
                                    onChange={e => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Associated Document</label>
                                <div className="relative border-2 border-dashed border-gray-100 rounded-xl px-4 h-[44px] hover:border-primary transition-all flex items-center justify-center gap-3 cursor-pointer group bg-gray-50/50 overflow-hidden">
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={e => setSelectedFile(e.target.files[0])}
                                    />
                                    <i className={`fas ${selectedFile ? 'fa-file-check text-emerald-500' : 'fa-paperclip text-gray-300'} group-hover:text-primary transition-colors`}></i>
                                    <span className="text-[10px] font-bold text-gray-500 truncate">
                                        {selectedFile ? selectedFile.name : 'Attach Instruction File'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Student Selection */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Target Specific Interns (Optional)</label>
                            <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-wrap gap-2">
                                {interns.length === 0 ? (
                                    <p className="text-xs text-gray-400 font-medium italic">No interns currently assigned to your profile.</p>
                                ) : (
                                    interns.map(intern => (
                                        <div
                                            key={intern._id}
                                            onClick={() => toggleStudent(intern._id)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all border flex items-center gap-2 ${newAssignment.targetStudents.includes(intern._id)
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary shadow-sm'
                                                }`}
                                        >
                                            <i className={`fas ${newAssignment.targetStudents.includes(intern._id) ? 'fa-check-circle' : 'fa-user-graduate opacity-30'}`}></i>
                                            {intern.name} <span className="opacity-50 font-medium font-mono">{intern.reg}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-2">
                                <i className="fas fa-info-circle mr-1 text-primary"></i>
                                {newAssignment.targetStudents.length > 0
                                    ? `Assigned to ${newAssignment.targetStudents.length} selected intern(s)`
                                    : 'Leave empty to assign to all your interns'}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowAdd(false)}
                                className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-500 font-bold text-xs hover:text-gray-900 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button type="submit" className="px-10 py-3 rounded-xl bg-gray-900 text-white font-bold text-xs shadow-lg shadow-gray-200 hover:bg-black transition-all active:scale-95 border-0 cursor-pointer">
                                Submit Task
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Assignments List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-20 text-center"><i className="fas fa-circle-notch fa-spin text-primary text-3xl"></i></div>
                ) : assignments.length === 0 ? (
                    <div className="bg-white p-20 rounded-2xl border border-gray-100 text-center space-y-4 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto">
                            <i className="fas fa-inbox text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">No Assignments Yet</h3>
                            <p className="text-sm text-gray-500 font-medium">You haven't assigned any industrial tasks to your interns yet.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assignment</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deadline</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weightage</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map(a => (
                                    <tr key={a._id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold text-gray-800">{a.title}</p>
                                            <p className="text-[11px] text-gray-400 font-medium mt-0.5 line-clamp-1">{a.description}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <i className="far fa-calendar text-gray-300 text-[11px]"></i>
                                                <span className="text-xs font-bold text-gray-700">{new Date(a.deadline).toLocaleDateString('en-GB')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-xs font-bold text-gray-700">
                                            {a.totalMarks} Marks
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={async () => {
                                                        const confirmed = await showAlert.confirm(
                                                            'Purge Assignment',
                                                            'Are you sure you want to permanently delete this assignment? All student submissions and grades for this task will be purged.',
                                                            'Yes, Purge Assignment'
                                                        );
                                                        if (confirmed) {
                                                            try {
                                                                await apiRequest(`/supervisor/assignments/${a._id}`, { method: 'DELETE' });
                                                                showToast.success('Assignment purged successfully.');
                                                                fetchAssignments();
                                                            } catch (err) { }
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border-0 cursor-pointer"
                                                    title="Delete Assignment"
                                                >
                                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
