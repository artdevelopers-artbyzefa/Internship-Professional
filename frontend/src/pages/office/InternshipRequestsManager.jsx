import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

const SkeletonRow = () => (
    <tr className="animate-pulse border-b border-gray-50">
        <td className="py-5 px-4"><div className="h-5 w-5 bg-slate-100 rounded-lg"></div></td>
        <td className="py-5 px-4"><div className="h-5 w-36 bg-slate-100 rounded-lg"></div></td>
        <td className="py-5 px-4"><div className="h-4 w-24 bg-slate-50 rounded"></div></td>
        <td className="py-5 px-4"><div className="h-4 w-28 bg-slate-50 rounded"></div></td>
        <td className="py-5 px-4"><div className="h-6 w-16 bg-slate-100 rounded-full"></div></td>
        <td className="py-5 px-4"><div className="h-6 w-20 bg-slate-100 rounded-full"></div></td>
        <td className="py-5 px-4"><div className="h-4 w-16 bg-slate-50 rounded"></div></td>
    </tr>
);

function CompanyStep({ student, officeId, onRefresh, mouCompanies }) {
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
        if (!finalName) return showToast.error('Company name is required');
        setSaving(true);
        try {
            await apiRequest('/office/assign-company', {
                method: 'POST',
                body: { studentId: student._id, companyName: finalName, officeId }
            });
            showToast.success('Company assigned.');
            onRefresh();
        } catch { } finally { setSaving(false); }
    };

    if (isFreelance) return (
        <div className="space-y-3">
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">Freelance Details</p>
                <p className="text-sm font-bold text-blue-800">{req?.companyName || 'Freelance Project'}</p>
                <p className="text-[10px] text-blue-400 font-medium mt-1">Platform: {req?.freelancePlatform || 'Direct'}</p>
                {req?.freelanceProfileLink && (
                    <a href={req.freelanceProfileLink} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary font-bold underline block mt-1 truncate">{req.freelanceProfileLink}</a>
                )}
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <i className="fas fa-circle-check text-emerald-500 text-xs"></i>
                <p className="text-[10px] font-bold text-emerald-600">No company mapping needed for freelance.</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {req?.companyName && !isUniversityAssigned && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Submitted By Student</p>
                    <p className="text-sm font-bold text-slate-700">{req.companyName}</p>
                </div>
            )}

            {isAssigned && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <i className="fas fa-circle-check text-emerald-500 text-sm"></i>
                    <div>
                        <p className="text-xs font-black text-emerald-700">{student.assignedCompany}</p>
                        <p className="text-[9px] text-emerald-500 font-medium">{isUniversityAssigned ? 'MOU Partner' : 'Self-Arranged'}</p>
                    </div>
                </div>
            )}

            {isUniversityAssigned ? (
                <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select MOU Company</label>
                    <div className="relative">
                        <select value={selectedMOUId} onChange={e => { 
                            const id = e.target.value; 
                            setSelectedMOUId(id); 
                            const c = [...mouCompanies.mou, ...mouCompanies.internal].find(c => c._id === id); 
                            if (c) handleAssign(c.name); 
                        }}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700 bg-white appearance-none">
                            <option value="">Select registry company...</option>
                            {(mouCompanies.mou || []).length > 0 && (
                                <optgroup label="MOU Partners">
                                    {(mouCompanies.mou || []).map((c, i) => <option key={c._id || `mou-${i}`} value={c._id}>{c.name}</option>)}
                                </optgroup>
                            )}
                            {(mouCompanies.internal || []).length > 0 && (
                                <optgroup label="Other Companies">
                                    {(mouCompanies.internal || []).map((c, i) => <option key={c._id || `int-${i}`} value={c._id}>{c.name}</option>)}
                                </optgroup>
                            )}
                            {(mouCompanies.mou || []).length === 0 && (mouCompanies.internal || []).length === 0 && (
                                <option disabled>No companies found in registry</option>
                            )}
                        </select>
                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assign Company</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Company name..."
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700 placeholder-slate-300" />
                    <button disabled={saving || !name.trim()} onClick={() => handleAssign()}
                        className="w-full py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 disabled:opacity-40 transition-all">
                        {saving ? <i className="fas fa-circle-notch fa-spin"></i> : isAssigned ? 'Update Company' : 'Assign Company'}
                    </button>
                </div>
            )}
        </div>
    );
}

function SiteSupervisorStep({ student, officeId, onRefresh, mouCompanies }) {
    const req = student.internshipRequest;
    const isFreelance = req?.mode === 'Freelance';
    const [sName, setSName] = useState(student.assignedCompanySupervisor || req?.siteSupervisorName || '');
    const [sEmail, setSEmail] = useState(student.assignedCompanySupervisorEmail || req?.siteSupervisorEmail || '');
    const [sPhone, setSPhone] = useState(req?.siteSupervisorPhone || '');
    const [checkResult, setCheckResult] = useState(null);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const isAssigned = !!student.assignedCompanySupervisor;
    const [foundSupervisor, setFoundSupervisor] = useState(null);

    useEffect(() => {
        const proposed = student.internshipRequest?.siteSupervisorEmail;
        if (proposed && proposed.includes('@')) {
            checkEmail(proposed);
        }
    }, [student]);

    const checkEmail = async (em) => {
        if (!em || !em.includes('@')) return;
        setChecking(true);
        try {
            const res = await apiRequest(`/office/check-site-supervisor-by-email?email=${em}`);
            if (res.found) {
                setFoundSupervisor(res.supervisor);
                if (!sName) setSName(res.supervisor.name);
                if (!sEmail) setSEmail(res.supervisor.email);
                if (!sPhone && res.supervisor.whatsappNumber) setSPhone(res.supervisor.whatsappNumber);
            } else {
                setFoundSupervisor(null);
            }
            setCheckResult(res);
        } catch (e) {
            console.error('Email check failed', e);
            setCheckResult({ found: false });
            setFoundSupervisor(null);
        } finally {
            setChecking(false);
        }
    };

    const flat = [...(mouCompanies.mou || []), ...(mouCompanies.internal || [])];
    const currentCompany = flat.find(c => c.name === student.assignedCompany);
    const linkedSupervisors = currentCompany?.siteSupervisors || [];
    const hasLinkedSupervisors = linkedSupervisors.length > 0;

    if (isFreelance) return (
        <div className="flex items-center justify-center py-6">
            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest text-center">
                <i className="fas fa-ban mr-2"></i>Not required for freelance
            </p>
        </div>
    );

    const handleAssign = async (manualSup) => {
        const payload = manualSup
            ? { studentId: student._id, siteSupervisorName: manualSup.name, siteSupervisorEmail: manualSup.email, siteSupervisorPhone: manualSup.whatsappNumber || '', officeId }
            : { studentId: student._id, siteSupervisorName: sName.trim(), siteSupervisorEmail: sEmail.trim(), siteSupervisorPhone: sPhone, officeId };

        if (!payload.siteSupervisorName) return showToast.error('Supervisor name is required');
        setSaving(true);
        try {
            await apiRequest('/office/assign-site-supervisor', { method: 'POST', body: payload });
            showToast.success('Site supervisor assigned.');
            onRefresh();
        } catch { } finally { setSaving(false); }
    };

    const handleOnboardAndAssign = async () => {
        const cName = student.assignedCompany || req?.companyName;
        if (!cName) return showToast.error('Assign a company first before creating a supervisor.');
        if (!sName.trim() || !sEmail.trim()) return showToast.error('Name & Email required.');
        setSaving(true);
        try {
            await apiRequest('/office/onboard-and-assign-site-supervisor', {
                method: 'POST',
                body: { studentId: student._id, siteSupervisorName: sName.trim(), siteSupervisorEmail: sEmail.trim(), siteSupervisorPhone: sPhone, companyName: cName, officeId }
            });
            showToast.success('Site supervisor created and assigned.');
            onRefresh();
        } catch { } finally { setSaving(false); }
    };

    return (
        <div className="space-y-4">
            {isAssigned && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <i className="fas fa-circle-check text-emerald-500 text-sm"></i>
                    <div>
                        <p className="text-xs font-black text-emerald-700">{student.assignedCompanySupervisor}</p>
                        <p className="text-[9px] text-emerald-500 font-medium">{student.assignedCompanySupervisorEmail}</p>
                    </div>
                </div>
            )}

            {hasLinkedSupervisors && (
                <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-2">
                        <i className="fas fa-link mr-1.5"></i>Linked to {currentCompany.name}
                    </label>
                    <div className="relative">
                        <select onChange={e => { const idx = e.target.value; if (idx !== '') handleAssign(linkedSupervisors[idx]); }}
                            className="w-full px-3 py-2.5 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium text-blue-800 bg-white/60 appearance-none">
                            <option value="">Select registered supervisor...</option>
                            {linkedSupervisors.map((s, idx) => <option key={idx} value={idx}>{s.name} · {s.email}</option>)}
                        </select>
                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-[10px] pointer-events-none"></i>
                    </div>
                    <p className="text-[9px] text-blue-400 font-medium mt-1.5">Or enter details manually below</p>
                </div>
            )}

            {req?.siteSupervisorName && !isAssigned && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Proposed</p>
                    <p className="text-xs font-bold text-slate-700"><i className="fas fa-user w-4 text-slate-300"></i> {req.siteSupervisorName}</p>
                    {req.siteSupervisorEmail && <p className="text-[10px] text-slate-500"><i className="fas fa-envelope w-4 text-slate-300"></i> {req.siteSupervisorEmail}</p>}
                    {req.siteSupervisorPhone && <p className="text-[10px] text-slate-500"><i className="fas fa-phone w-4 text-slate-300"></i> {req.siteSupervisorPhone}</p>}
                </div>
            )}

            <div className="space-y-2">
                {[{ label: 'Name', val: sName, set: setSName, ph: 'Supervisor name' },
                  { label: 'Email', val: sEmail, set: setSEmail, ph: 'Email address' },
                  { label: 'Phone', val: sPhone, set: setSPhone, ph: '+92...' }
                ].map(({ label, val, set, ph }) => (
                    <div key={label}>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
                        <input value={val} onChange={e => { set(e.target.value); if (label === 'Email') setCheckResult(null); setFoundSupervisor(null); }}
                            placeholder={ph}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700 placeholder-slate-300" />
                    </div>
                ))}
            </div>

            {sEmail && !isAssigned && (
                <div>
                    {checking ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                            <i className="fas fa-circle-notch fa-spin text-primary text-sm"></i> Checking database...
                        </div>
                    ) : checkResult ? (
                        checkResult.found ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <i className="fas fa-database text-blue-400 text-xs"></i>
                                    <p className="text-xs font-black text-blue-700">Found: {checkResult.supervisor.name}</p>
                                </div>
                                <button disabled={saving || !sName.trim()} onClick={() => handleAssign()}
                                    className="w-full py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 disabled:opacity-40 transition-all">
                                    {saving ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-link mr-1.5"></i>Assign Existing</>}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-black text-amber-700"><i className="fas fa-user-plus mr-1.5"></i>Not in Database</p>
                                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">Will be onboarded and assigned.</p>
                                </div>
                                <button disabled={saving || !sName.trim() || !sEmail.trim()} onClick={handleOnboardAndAssign}
                                    className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 disabled:opacity-40 transition-all">
                                    {saving ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-envelope mr-1.5"></i>Register & Assign</>}
                                </button>
                            </div>
                        )
                    ) : (
                        <button onClick={() => checkEmail(sEmail)}
                            className="w-full py-2 rounded-xl border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                            <i className="fas fa-magnifying-glass mr-1.5"></i>Check Database
                        </button>
                    )}
                </div>
            )}

            {isAssigned && (
                <button disabled={saving || !sName.trim()} onClick={() => handleAssign()}
                    className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 disabled:opacity-40 transition-all">
                    {saving ? <i className="fas fa-circle-notch fa-spin"></i> : 'Update Details'}
                </button>
            )}
        </div>
    );
}

function FacultyStep({ student, officeId, faculties, onRefresh }) {
    const req = student.internshipRequest;
    const [checkResult, setCheckResult] = useState(null);
    const [checking, setChecking] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [manualFacultyId, setManualFacultyId] = useState('');
    const [showOverride, setShowOverride] = useState(false);
    const isAssigned = !!student.assignedFaculty;
    const isNewFaculty = req?.facultyType === 'Identify New';
    const proposedEmail = req?.newFacultyDetails?.email || null;
    const proposedName = req?.newFacultyDetails?.name || null;
    const proposedDept = req?.newFacultyDetails?.department || null;
    const [foundFaculty, setFoundFaculty] = useState(null);

    useEffect(() => {
        const proposed = student.internshipRequest?.newFacultyDetails?.email;
        if (proposed && proposed.includes('@')) {
            checkEmail(proposed);
        }
    }, [student]);

    const checkEmail = async (em) => {
        if (!em || !em.includes('@')) return;
        setChecking(true);
        try {
            const res = await apiRequest(`/office/check-faculty-by-email?email=${em}`);
            if (res.found) {
                setFoundFaculty(res.faculty);
            } else {
                setFoundFaculty(null);
            }
            setCheckResult(res);
        } catch (e) {
            console.error('Faculty check failed', e);
            setCheckResult({ found: false });
            setFoundFaculty(null);
        } finally {
            setChecking(false);
        }
    };

    const fStatus = req?.facultyStatus || 'Pending';
    const fStatusStyle = fStatus === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
        : fStatus === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100'
        : 'bg-amber-50 text-amber-600 border-amber-100';

    const handleAssign = async (id) => {
        const facultyId = id || checkResult?.faculty?.id;
        if (!facultyId) return;
        setAssigning(true);
        try {
            await apiRequest('/office/assign-faculty-override', {
                method: 'POST',
                body: { studentId: student._id, facultyId, officeId }
            });
            showToast.success('Faculty supervisor assigned.');
            onRefresh();
        } catch { } finally { setAssigning(false); }
    };

    const handleOnboardAndAssign = async () => {
        setAssigning(true);
        try {
            await apiRequest('/office/onboard-and-assign-faculty', {
                method: 'POST',
                body: { studentId: student._id, name: proposedName, email: proposedEmail, department: proposedDept, officeId }
            });
            showToast.success('Faculty created and assigned. Email invitation sent.');
            onRefresh();
        } catch { } finally { setAssigning(false); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${fStatusStyle}`}>{fStatus}</span>
                {isAssigned && (
                    <button onClick={() => setShowOverride(s => !s)} className="text-[9px] text-slate-400 hover:text-primary font-black uppercase tracking-widest transition-colors">
                        <i className="fas fa-pen-to-square mr-1"></i>Override
                    </button>
                )}
            </div>

            {isAssigned && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <i className="fas fa-circle-check text-emerald-500 text-sm"></i>
                    <div>
                        <p className="text-xs font-black text-emerald-700">
                            {typeof student.assignedFaculty === 'object' ? student.assignedFaculty.name : 'Assigned'}
                        </p>
                        <p className="text-[9px] text-emerald-500 font-medium">Faculty confirmed</p>
                    </div>
                </div>
            )}

            {isNewFaculty && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Student's Proposed Faculty</p>
                    {proposedName && <p className="text-xs font-bold text-slate-700"><i className="fas fa-user w-4 text-slate-300"></i> {proposedName}</p>}
                    {proposedEmail && <p className="text-[10px] text-slate-500 font-medium"><i className="fas fa-envelope w-4 text-slate-300"></i> {proposedEmail}</p>}
                    {proposedDept && <p className="text-[10px] text-slate-400"><i className="fas fa-building w-4 text-slate-300"></i> {proposedDept}</p>}
                </div>
            )}

            {isNewFaculty && proposedEmail && !isAssigned && (
                <div>
                    {checking ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                            <i className="fas fa-circle-notch fa-spin text-primary text-sm"></i> Checking faculty database...
                        </div>
                    ) : checkResult ? (
                        checkResult.found ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <i className="fas fa-database text-blue-400 text-xs"></i>
                                    <div>
                                        <p className="text-xs font-black text-blue-700">Already in Registry</p>
                                        <p className="text-[9px] text-blue-500 font-semibold">{checkResult.faculty.name} · {checkResult.faculty.status}</p>
                                    </div>
                                </div>
                                <button disabled={assigning} onClick={() => handleAssign()}
                                    className="w-full py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 disabled:opacity-40 transition-all">
                                    {assigning ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-link mr-1.5"></i>Assign This Faculty</>}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-black text-amber-700"><i className="fas fa-user-plus mr-1.5"></i>Not Registered Yet</p>
                                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">Will create account, send email invite, and assign.</p>
                                </div>
                                <button disabled={assigning} onClick={handleOnboardAndAssign}
                                    className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 disabled:opacity-40 transition-all">
                                    {assigning ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-envelope mr-1.5"></i>Register & Assign</>}
                                </button>
                            </div>
                        )
                    ) : (
                        <button onClick={() => checkEmail(proposedEmail)} className="w-full py-2 rounded-xl border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">
                            <i className="fas fa-magnifying-glass mr-1.5"></i>Check Database
                        </button>
                    )}
                </div>
            )}

            {req?.facultyType === 'Registered' && !isAssigned && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs font-black text-amber-700"><i className="fas fa-hourglass-half mr-1.5"></i>Awaiting Faculty Response</p>
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">Student selected a registered faculty. Override below if needed.</p>
                </div>
            )}

            {req?.facultyStatus === 'Rejected' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-xs font-black text-rose-700"><i className="fas fa-times-circle mr-1.5"></i>Faculty Rejected</p>
                    <p className="text-[10px] text-rose-600 font-medium mt-0.5">Manually assign a replacement below.</p>
                </div>
            )}

            {(!isAssigned || showOverride) && (
                <div className={`space-y-2 ${showOverride ? 'pt-2 border-t border-slate-100' : ''}`}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isAssigned ? 'Override Faculty' : 'Manual Assign'}</label>
                    <div className="relative">
                        <i className="fas fa-chalkboard-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none"></i>
                        <select value={manualFacultyId} onChange={e => setManualFacultyId(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700 appearance-none bg-white">
                            <option value="">Select faculty...</option>
                            {faculties?.map(f => <option key={f._id} value={f._id}>{f.name} ({f.email})</option>)}
                        </select>
                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                    </div>
                    <button disabled={assigning || !manualFacultyId} onClick={() => handleAssign(manualFacultyId)}
                        className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 transition-all">
                        {assigning ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-user-check mr-1.5"></i>Map Faculty</>}
                    </button>
                </div>
            )}
        </div>
    );
}

const ExpandedRow = memo(({ student, officeId, onDecide, deciding, onRefresh, faculties, mouCompanies }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectBox, setShowRejectBox] = useState(false);
    const req = student.internshipRequest;
    const isPending = student.status === 'Internship Request Submitted';
    const isFreelance = req?.mode === 'Freelance';
    const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const steps = isFreelance
        ? [{ label: 'Company', icon: 'fa-building' }, { label: 'Faculty', icon: 'fa-chalkboard-user' }]
        : [{ label: 'Company', icon: 'fa-building' }, { label: 'Site Supervisor', icon: 'fa-user-tie' }, { label: 'Faculty', icon: 'fa-chalkboard-user' }];

    const stepDone = isFreelance
        ? [true, !!student.assignedFaculty]
        : [!!student.assignedCompany, !!student.assignedCompanySupervisor, !!student.assignedFaculty];

    return (
        <tr>
            <td colSpan={7} className="px-3 pb-4">
                <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-lg shadow-slate-100/50">
                    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-400 font-medium">
                        <span><strong className="text-slate-600">Mode:</strong> {req?.mode || '—'}</span>
                        <span><strong className="text-slate-600">Type:</strong> {req?.type || '—'}</span>
                        <span><strong className="text-slate-600">Duration:</strong> {req?.duration || '—'}</span>
                        <span><strong className="text-slate-600">Start:</strong> {fmt(req?.startDate)}</span>
                        <span><strong className="text-slate-600">End:</strong> {fmt(req?.endDate)}</span>
                        <span><strong className="text-slate-600">Submitted:</strong> {fmt(req?.submittedAt)}</span>
                        {req?.description && <span className="flex-1 truncate"><strong className="text-slate-600">Desc:</strong> {req.description}</span>}
                    </div>

                    <div className="flex border-b border-slate-100 bg-white">
                        {steps.map((step, i) => (
                            <button key={i} onClick={() => setActiveStep(i)}
                                className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeStep === i
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${stepDone[i] ? 'bg-emerald-500 text-white' : activeStep === i ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {stepDone[i] ? <i className="fas fa-check"></i> : i + 1}
                                </div>
                                <i className={`fas ${step.icon} text-[10px]`}></i>
                                {step.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {activeStep === 0 && (
                            <CompanyStep student={student} officeId={officeId} onRefresh={onRefresh} mouCompanies={mouCompanies} />
                        )}
                        {activeStep === 1 && !isFreelance && (
                            <SiteSupervisorStep student={student} officeId={officeId} onRefresh={onRefresh} mouCompanies={mouCompanies} />
                        )}
                        {((activeStep === 1 && isFreelance) || (activeStep === 2 && !isFreelance)) && (
                            <FacultyStep student={student} officeId={officeId} faculties={faculties} onRefresh={onRefresh} />
                        )}
                    </div>

                    {isPending && (
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                            {showRejectBox ? (
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Rejection Reason</label>
                                        <textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Provide a clear reason for rejection..."
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none font-medium text-slate-700 placeholder-slate-300" />
                                    </div>
                                    <button onClick={() => setShowRejectBox(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100">Cancel</button>
                                    <button disabled={!rejectReason.trim() || deciding} onClick={() => onDecide(student._id, 'reject', rejectReason)}
                                        className="px-6 py-2.5 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 disabled:opacity-40 transition-all">
                                        {deciding ? <i className="fas fa-circle-notch fa-spin"></i> : 'Confirm Reject'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        <i className="fas fa-info-circle mr-1.5"></i>
                                        Steps can be completed independently before or after approval.
                                    </p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowRejectBox(true)}
                                            className="px-5 py-2.5 rounded-xl border-2 border-rose-200 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all">
                                            <i className="fas fa-xmark mr-1.5"></i>Reject
                                        </button>
                                        <button disabled={deciding} onClick={() => onDecide(student._id, 'approve')}
                                            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-40 shadow-md shadow-emerald-100 transition-all">
                                            {deciding ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-check mr-1.5"></i>Approve Request</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {student.status === 'Internship Rejected' && req?.rejectionReason && (
                        <div className="px-6 py-4 border-t border-rose-100 bg-rose-50/50">
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Rejection Reason</p>
                            <p className="text-sm font-medium text-rose-600">{req.rejectionReason}</p>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
});

const STATUS_CONFIG = {
    'Internship Request Submitted': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending' },
    'Internship Approved': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
    'Internship Rejected': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Rejected' },
};
const FACULTY_STATUS_CONFIG = {
    'Pending': { bg: 'bg-amber-50', text: 'text-amber-600' },
    'Accepted': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    'Rejected': { bg: 'bg-rose-50', text: 'text-rose-600' },
};

export default function InternshipRequestsManager({ user }) {
    const [students, setStudents] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const [deciding, setDeciding] = useState(false);
    const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

    const officeId = user?.id || user?._id;

    const groupedCompanies = useMemo(() => {
        const mou = companies.filter(c => c.isMOUSigned || c.category === 'MOU Partner');
        const internal = companies.filter(c => !c.isMOUSigned && c.category !== 'MOU Partner');
        return { mou, internal };
    }, [companies]);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const fetchRequests = useCallback(async (resetPage = false) => {
        setLoading(true);
        const currentPage = resetPage ? 1 : page;
        try {
            const [stuResp, fData, cData] = await Promise.all([
                apiRequest(`/office/internship-request-students?page=${currentPage}&search=${debouncedSearch}&filter=${filter}`),
                apiRequest('/auth/faculty-list'),
                apiRequest('/office/companies/dropdown')
            ]);

            const stuData = stuResp?.data || stuResp || [];
            setStudents(Array.isArray(stuData) ? stuData : []);
            setTotal(stuResp?.total || stuData.length);
            setTotalPages(stuResp?.pages || 1);
            setFaculties(Array.isArray(fData) ? fData : []);
            setCompanies(Array.isArray(cData) ? cData : []);

            if (filter === 'all' && !debouncedSearch) {
                setCounts({
                    all: stuResp?.total || 0,
                    pending: 0, approved: 0, rejected: 0
                });
            }
        } catch (err) {
            console.error('[FETCH REQUESTS ERROR]', err);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, filter]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const [all, pending, approved, rejected] = await Promise.all([
                    apiRequest('/office/internship-request-students?page=1&filter=all'),
                    apiRequest('/office/internship-request-students?page=1&filter=pending'),
                    apiRequest('/office/internship-request-students?page=1&filter=approved'),
                    apiRequest('/office/internship-request-students?page=1&filter=rejected'),
                ]);
                setCounts({
                    all: all?.total || 0,
                    pending: pending?.total || 0,
                    approved: approved?.total || 0,
                    rejected: rejected?.total || 0,
                });
            } catch { }
        };
        fetchCounts();
    }, []);

    const handleDecide = async (studentId, decision, comment) => {
        setDeciding(true);
        try {
            await apiRequest('/office/decide-request', {
                method: 'POST',
                body: { studentId, decision, comment, officeId }
            });
            showToast.success(`Request ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`);
            setExpandedId(null);
            fetchRequests();
        } catch { } finally { setDeciding(false); }
    };

    const LIMIT = 15;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-lg shadow-slate-100/50 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Internship Requests</h2>
                    <p className="text-sm text-slate-600 font-medium mt-1">Review, assign, and action all student AppEx-A submissions.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
                        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-400 hover:text-slate-600'}`}>All</button>
                        <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'pending' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600'}`}>Pending</button>
                        <button onClick={() => setFilter('approved')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'approved' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-600'}`}>Approved</button>
                    </div>
                    <div className="relative group w-full sm:w-64">
                        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search name, reg, company..."
                            className="pl-10 pr-4 py-2.5 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[28px] border border-slate-100 shadow-lg shadow-slate-100/50 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex gap-1 bg-slate-50 rounded-2xl p-1 w-fit">
                        {[
                            { key: 'all', label: 'All', count: counts.all },
                            { key: 'pending', label: 'Pending', count: counts.pending },
                            { key: 'approved', label: 'Approved', count: counts.approved },
                            { key: 'rejected', label: 'Rejected', count: counts.rejected },
                        ].map(t => (
                            <button key={t.key}
                                onClick={() => { setFilter(t.key); setPage(1); setExpandedId(null); }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filter === t.key ? 'bg-white shadow-md text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                                {t.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${filter === t.key ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search name, reg, company..."
                            className="w-full px-10 pr-4 py-2.5 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                </div>

                {loading ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Info</th>
                                </tr>
                            </thead>
                            <tbody>{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
                        </table>
                    </div>
                ) : students.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-inbox text-slate-200 text-3xl"></i>
                        </div>
                        <p className="text-slate-400 font-black text-sm">No requests found</p>
                        <p className="text-slate-300 text-xs font-medium mt-1">Try adjusting filters or search term</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="py-4 pr-2 w-8"></th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Info</th>
                                    {['Reg #', 'Company', 'Type', 'Status', 'Submitted'].map((h, i) => (
                                        <th key={i} className="text-left text-[9px] font-black text-slate-400 uppercase tracking-widest pb-4 pr-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(s => {
                                    const isExpanded = expandedId === s._id;
                                    const req = s.internshipRequest;
                                    const sCfg = STATUS_CONFIG[s.status] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', label: s.status };
                                    const submittedDate = req?.submittedAt
                                        ? new Date(req.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                        : '—';

                                    const isFreelance = req?.mode === 'Freelance';
                                    const totalSteps = isFreelance ? 2 : 3;
                                    const doneSteps = [
                                        isFreelance || !!s.assignedCompany,
                                        isFreelance ? !!s.assignedFaculty : !!s.assignedCompanySupervisor,
                                        !isFreelance && !!s.assignedFaculty
                                    ].filter(Boolean).length;

                                    return (
                                        <React.Fragment key={s._id}>
                                            <tr className={`border-b border-slate-50 cursor-pointer transition-all ${isExpanded ? 'bg-slate-50/60' : 'hover:bg-slate-50/40'}`}
                                                onClick={() => setExpandedId(prev => prev === s._id ? null : s._id)}>
                                                <td className="py-4 pr-2 w-8">
                                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[9px]`}></i>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                            {s.name?.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800 leading-tight text-sm">{s.name}</span>
                                                            {s.secondaryEmail && (
                                                                <span className="text-[9px] text-primary/60 font-bold mt-0.5">
                                                                    <i className="fas fa-envelope-open-text mr-1 text-[8px]"></i>{s.secondaryEmail}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4 text-slate-400 font-mono text-xs whitespace-nowrap">{s.reg}</td>
                                                <td className="py-4 pr-4 text-slate-600 font-medium max-w-[130px] truncate text-xs">
                                                    {req?.companyName || <span className="text-slate-300 italic">N/A</span>}
                                                </td>
                                                <td className="py-4 pr-4 text-xs">
                                                    <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider
                                                        ${req?.type === 'University Assigned' ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                        : req?.mode === 'Freelance' ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                        : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                                        {req?.mode === 'Freelance' ? 'Freelance' : req?.type === 'University Assigned' ? 'Uni Assigned' : 'Self'}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border w-fit ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}>{sCfg.label}</span>
                                                        <div className="flex gap-1">
                                                            {[...Array(totalSteps)].map((_, i) => (
                                                                <div key={i} className={`h-1 flex-1 rounded-full ${i < doneSteps ? 'bg-emerald-400' : 'bg-slate-100'}`}></div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-xs text-slate-400 font-medium whitespace-nowrap">{submittedDate}</td>
                                            </tr>
                                            {isExpanded && (
                                                <ExpandedRow
                                                    student={s}
                                                    officeId={officeId}
                                                    onDecide={handleDecide}
                                                    deciding={deciding}
                                                    onRefresh={fetchRequests}
                                                    faculties={faculties}
                                                    mouCompanies={groupedCompanies}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-50">
                        <p className="text-xs text-slate-600 font-medium">
                            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} requests
                        </p>
                        <div className="flex gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                aria-label="Previous Page"
                                className="w-9 h-9 rounded-xl border border-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-50 disabled:opacity-30 transition-all">
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    aria-label={`Page ${p}`}
                                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${p === page ? 'bg-primary text-white shadow-md shadow-primary/20' : 'border border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                aria-label="Next Page"
                                className="w-9 h-9 rounded-xl border border-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-50 disabled:opacity-30 transition-all">
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
