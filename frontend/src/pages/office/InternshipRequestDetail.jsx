import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

function CompanySection({ student, officeId, onUpdate, mouCompanies }) {
    const req = student.internshipRequest;
    const isUniversityAssigned = req?.type === 'University Assigned';
    const isFreelance = req?.mode === 'Freelance';
    const [name, setName] = useState(student.assignedCompany || req?.companyName || '');
    const [selectedMOUId, setSelectedMOUId] = useState('');
    const [saving, setSaving] = useState(false);
    const isAssigned = !!student.assignedCompany;

    useEffect(() => {
        if (isAssigned && isUniversityAssigned && mouCompanies) {
            const flat = [...(mouCompanies.mou || []), ...(mouCompanies.internal || [])];
            const match = flat.find(c => c.name === student.assignedCompany);
            if (match) setSelectedMOUId(match._id);
        }
    }, [student.assignedCompany, isUniversityAssigned, mouCompanies, isAssigned]);

    const handleAssign = async (compName) => {
        const finalName = compName || name.trim();
        if (!finalName) return;
        setSaving(true);
        try {
            await apiRequest('/office/assign-company', {
                method: 'POST',
                body: { studentId: student._id, companyName: finalName, officeId }
            });
            onUpdate({ assignedCompany: finalName });
            showToast.success('Updated');
        } catch (err) { console.error(err); } finally { setSaving(false); }
    };

    return (
        <div className="bg-white border-b border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-building text-blue-600 text-[10px]"></i>
                <h3 className="text-[10px] font-black text-blue-900 ">Placement</h3>
            </div>
            {isFreelance ? <p className="text-[11px] font-bold text-slate-400">Freelancer</p> : (
                <div className="space-y-2">
                    {isUniversityAssigned ? (
                        <select value={selectedMOUId} onChange={e => {
                            const id = e.target.value;
                            setSelectedMOUId(id);
                            const c = [...mouCompanies.mou, ...mouCompanies.internal].find(c => c._id === id);
                            if (c) handleAssign(c.name);
                        }}
                            className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg font-bold text-blue-900 focus:outline-none focus:border-blue-600">
                            <option value="">Select Company</option>
                            {(mouCompanies.mou || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    ) : (
                        <div className="flex gap-2">
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Company" className="flex-1 px-3 py-2 text-[11px] border border-slate-200 rounded-lg font-bold text-blue-900 focus:outline-none" />
                            <button onClick={() => handleAssign()} className="px-3 py-2 bg-blue-600 text-white text-[9px] font-black rounded-lg">Set</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SiteSupervisorSection({ student, officeId, onUpdate }) {
    const req = student.internshipRequest;
    const [sName, setSName] = useState(student.assignedCompanySupervisor || req?.siteSupervisorName || '');
    const [sEmail, setSEmail] = useState(student.assignedCompanySupervisorEmail || req?.siteSupervisorEmail || '');
    const [saving, setSaving] = useState(false);
    const isAssigned = !!student.assignedCompanySupervisor;

    const handleAssign = async () => {
        if (!sName) return;
        setSaving(true);
        try {
            await apiRequest('/office/assign-site-supervisor', {
                method: 'POST',
                body: { studentId: student._id, siteSupervisorName: sName.trim(), siteSupervisorEmail: sEmail.trim(), officeId }
            });
            onUpdate({ assignedCompanySupervisor: sName.trim(), assignedCompanySupervisorEmail: sEmail.trim() });
            showToast.success('Updated');
        } catch (err) { console.error(err); } finally { setSaving(false); }
    };

    return (
        <div className="bg-white border-b border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-user-tie text-blue-600 text-[10px]"></i>
                <h3 className="text-[10px] font-black text-blue-900 ">Site Supervisor</h3>
            </div>
            <div className="space-y-2">
                <input value={sName} onChange={e => setSName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg font-bold text-blue-900 focus:outline-none" />
                <div className="flex gap-2">
                    <input value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="Email" className="flex-1 px-3 py-2 text-[11px] border border-slate-200 rounded-lg font-bold text-blue-900 focus:outline-none" />
                    <button onClick={handleAssign} className="px-3 py-2 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase">Link</button>
                </div>
            </div>
        </div>
    );
}

function FacultySection({ student, officeId, faculties, onUpdate }) {
    const [facId, setFacId] = useState('');
    const handleAssign = async (id) => {
        try {
            await apiRequest('/office/assign-faculty-override', { method: 'POST', body: { studentId: student._id, facultyId: id, officeId } });
            onUpdate({ assignedFaculty: faculties.find(f => f._id === id) || id });
            showToast.success('Updated');
        } catch (err) { console.error(err); }
    };

    return (
        <div className="bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-graduation-cap text-blue-600 text-[10px]"></i>
                <h3 className="text-[10px] font-black text-blue-900 ">Faculty</h3>
            </div>
            <select value={student.assignedFaculty?._id || ''} onChange={e => handleAssign(e.target.value)}
                className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg font-bold text-blue-900 focus:outline-none">
                <option value="">Confirm Advisor</option>
                {faculties.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
        </div>
    );
}

export default function InternshipRequestDetail({ user }) {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [faculties, setFaculties] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectReason, setRejectReason] = useState('');
    const [showReject, setShowReject] = useState(false);

    const officeId = user?.id || user?._id;

    const fetchDetail = useCallback(async () => {
        try {
            const data = await apiRequest(`/office/internship-request/${studentId}`);
            if (data) setStudent(data);
        } catch (err) { navigate('/office/internship-requests'); }
        finally { setLoading(false); }
    }, [studentId, navigate]);

    useEffect(() => {
        const fetchInits = async () => {
            const [f, c] = await Promise.all([apiRequest('/auth/faculty-list'), apiRequest('/office/companies/dropdown')]);
            setFaculties(f || []);
            setCompanies(c || []);
        };
        fetchInits(); fetchDetail();
    }, [fetchDetail]);

    const mouCompanies = useMemo(() => {
        const mou = companies.filter(c => c.isMOUSigned || c.category === 'MOU Partner');
        const internal = companies.filter(c => !c.isMOUSigned && c.category !== 'MOU Partner');
        return { mou, internal };
    }, [companies]);

    const handleDecide = async (decision) => {
        try {
            await apiRequest('/office/decide-request', {
                method: 'POST',
                body: { studentId, decision, comment: rejectReason, officeId }
            });
            showToast.success(decision.toUpperCase());
            navigate('/office/internship-requests');
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="p-20 text-center font-black text-blue-600 text-[10px]">Loading</div>;
    if (!student) return null;
    const req = student.internshipRequest;

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <button
                onClick={() => navigate('/office/internship-requests')}
                className="mb-6 flex items-center gap-2 text-[11px] font-black text-slate-400  tracking-widest hover:text-blue-600 transition-colors"
            >
                <i className="fas fa-arrow-left"></i>
                Back to Requests
            </button>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Left Side: Student Info */}
                <div className="md:col-span-7 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-8 bg-blue-600 text-white">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">{student.name?.charAt(0)}</div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight leading-none">{student.name}</h1>
                                <p className="text-[10px] font-bold opacity-70 tracking-widest uppercase mt-2">{student.reg} // SEM-{student.semester}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-[9px] font-black text-slate-400  tracking-widest mb-1">Internship Type</p>
                            <p className="text-sm font-black text-blue-900 ">{req?.mode || 'TBD'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400  tracking-widest mb-1">Start Date</p>
                            <p className="text-sm font-black text-blue-900">{req?.startDate ? new Date(req.startDate).toLocaleDateString() : 'TBD'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400  tracking-widest mb-1">Internship Title</p>
                            <p className="text-sm font-black text-blue-900 uppercase">{req?.companyName || 'WAITING'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400  tracking-widest mb-1">Status</p>
                            <p className="text-sm font-black text-blue-900 ">{student.status?.split(' ').pop()}</p>
                        </div>
                    </div>

                    <div className="px-8 pb-8 flex items-center justify-between border-t border-slate-50 pt-8">
                        <button onClick={() => navigate('/office/internship-requests')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600">Back to Requests</button>
                    </div>
                </div>

                {/* Right Side: Small Vertical Stack */}
                <div className="md:col-span-5 space-y-6">
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <CompanySection student={student} officeId={officeId} mouCompanies={mouCompanies} onUpdate={u => setStudent({ ...student, ...u })} />
                        <SiteSupervisorSection student={student} officeId={officeId} onUpdate={u => setStudent({ ...student, ...u })} />
                        <FacultySection student={student} officeId={officeId} faculties={faculties} onUpdate={u => setStudent({ ...student, ...u })} />
                    </div>

                    {/* Authorization Panel: Small static buttons */}
                    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                        {showReject ? (
                            <div className="space-y-4">
                                <textarea autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..."
                                    className="w-full bg-slate-50 border border-slate-100 p-4 text-[11px] font-bold text-blue-900 focus:outline-none rounded-lg" />
                                <div className="flex gap-2">
                                    <button onClick={() => setShowReject(false)} className="px-4 py-2 text-[10px] font-black text-slate-400">Cancel</button>
                                    <button disabled={!rejectReason.trim()} onClick={() => handleDecide('reject')} className="flex-1 py-3 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg">Execute Rejection</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                <button onClick={() => setShowReject(true)} className="flex-1 py-4 border border-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-xl hover:bg-blue-50 transition-all">Reject</button>
                                <button onClick={() => handleDecide('approve')} className="flex-1 py-4 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all">Approve</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
