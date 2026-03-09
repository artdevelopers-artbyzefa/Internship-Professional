import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function SupervisorGrading({ user }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const data = await apiRequest('/supervisor/interns');
            setStudents(data);
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student Grading</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Review performance and grade your assigned interns.</p>
            </div>

            {loading ? (
                <div className="p-10 text-center"><i className="fas fa-circle-notch fa-spin text-primary text-2xl"></i></div>
            ) : students.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 text-center">
                    <h3 className="text-lg font-black text-gray-800">No Interns Assigned</h3>
                    <p className="text-sm text-gray-400">Students will appear here once they are officially assigned to you.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {students.map(student => (
                        <Card key={student._id} className="p-0 overflow-hidden">
                            <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden flex items-center justify-center font-black text-primary">
                                        {student.profilePicture ? <img src={student.profilePicture} className="w-full h-full object-cover" /> : student.name[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-800 tracking-tight">{student.name}</h4>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{student.reg}</p>
                                    </div>
                                </div>
                                <button className="px-5 py-2.5 bg-gray-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-black transition-all border-0 cursor-pointer shadow-lg shadow-gray-200">
                                    Grade Intern <i className="fas fa-pen-nib ml-2"></i>
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="flex gap-12">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1">Status</p>
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                                            {student.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1">Company Supervisor Marks</p>
                                        <p className="text-lg font-black text-gray-800">N/A / 150</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1">Industrial Remarks</p>
                                        <p className="text-xs text-gray-400 italic">No remarks provided yet.</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
