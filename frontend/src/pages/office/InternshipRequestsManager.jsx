import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

const ITEMS_PER_PAGE = 10;

const statusConfig = {
    'Internship Request Submitted': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending Review' },
    'Internship Approved': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
    'Internship Rejected': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', label: 'Rejected' },
};

const facultyStatusConfig = {
    'Pending': { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Pending' },
    'Accepted': { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Accepted' },
    'Rejected': { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Rejected' },
};

// ───────────────────────────────────────────────
// Column 1: Company Assignment
// ───────────────────────────────────────────────
function CompanyColumn({ student, officeId, onRefresh, mouCompanies }) {
    const req = student.internshipRequest;
    const isUniversityAssigned = req?.type === 'University Assigned';
    const [name, setName] = useState(student.assignedCompany || req?.companyName || '');
    const [selectedMOUId, setSelectedMOUId] = useState('');
    const [saving, setSaving] = useState(false);
    const isAssigned = !!student.assignedCompany;

    useEffect(() => {
        if (isAssigned && isUniversityAssigned) {
            const match = mouCompanies.find(c => c.name === student.assignedCompany);
            if (match) setSelectedMOUId(match._id);
        }
    }, [student.assignedCompany, isUniversityAssigned, mouCompanies, isAssigned]);

    const handleAssign = async (compName) => {
        const finalName = compName || name.trim();
        if (!finalName) return showToast.error('Company name is required');
        try {
            setSaving(true);
            await apiRequest('/office/assign-company', {
                method: 'POST',
                body: { studentId: student._id, companyName: finalName, officeId }
            });
            showToast.success('Company assigned and added to registry.');
            onRefresh();
        } catch (err) { /* handled */ } finally { setSaving(false); }
    };

    return (
        <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {req?.mode === 'Freelance' ? 'Freelance Platform / Client' : 'Company'}
                </p>
                {isAssigned && req?.mode !== 'Freelance' && (
                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">Assigned</span>
                )}
            </div>

            {req?.mode === 'Freelance' ? (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mt-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Freelance details submitted by student</p>
                    <div className="space-y-2">
                        <div className="text-xs">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-medium">Project / Client</span>
                            <span className="font-bold text-gray-800">{req.companyName || 'Freelance Project'}</span>
                        </div>
                        <div className="text-xs">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-medium">Platform</span>
                            <span className="font-bold text-gray-800">{req.freelancePlatform || 'Internal / Direct Call'}</span>
                        </div>
                        <div className="text-xs">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-medium">Profile Link</span>
                            {req.freelanceProfileLink ? (
                                <a href={req.freelanceProfileLink} target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline truncate block max-w-full">
                                    {req.freelanceProfileLink}
                                </a>
                            ) : <span className="text-gray-400 italic text-[10px]">No profile link provided</span>}
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-white/60 rounded-xl border border-blue-100/50 flex items-center gap-2">
                        <i className="fas fa-info-circle text-blue-400 text-[10px]"></i>
                        <p className="text-[9px] font-bold text-blue-500 italic">Freelance internships do not require manual company mapping by the office.</p>
                    </div>
                </div>
            ) : (
                <>
                    {req?.companyName && !isUniversityAssigned && (
                        <div className="text-xs text-gray-400 font-medium bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-1">Submitted by Student</span>
                            {req.companyName}
                        </div>
                    )}

                    {isUniversityAssigned ? (
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Select MOU Company</label>
                            <div className="relative">
                                <select
                                    value={selectedMOUId}
                                    onChange={e => {
                                        const id = e.target.value;
                                        setSelectedMOUId(id);
                                        const comp = mouCompanies.find(c => c._id === id);
                                        if (comp) handleAssign(comp.name);
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-gray-700 bg-white appearance-none h-10"
                                >
                                    <option value="">Select Company...</option>
                                    {mouCompanies.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                                <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Assign Company</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Company name..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-gray-700 placeholder-gray-300 h-10"
                                />
                            </div>

                            <button
                                disabled={saving || !name.trim()}
                                onClick={() => handleAssign()}
                                className="w-full py-2.5 h-10 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-sm shadow-primary/20"
                            >
                                {saving ? <i className="fas fa-circle-notch fa-spin"></i> : isAssigned ? 'Update Company' : 'Assign Company'}
                            </button>
                        </div>
                    )}

                    {isAssigned && (
                        <p className="text-[9px] text-emerald-600 font-semibold text-center mt-2">
                            <i className="fas fa-circle-check mr-1 text-[8px]"></i>
                            {isUniversityAssigned ? 'MOU Verified Placement' : 'Student Self-Assigned Placement'}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

// ───────────────────────────────────────────────
// Column 2: Site Supervisor Assignment
// ───────────────────────────────────────────────
function SiteSupervisorColumn({ student, officeId, onRefresh, mouCompanies }) {
    const req = student.internshipRequest;
    const isUniversityAssigned = req?.type === 'University Assigned';
    const [sName, setSName] = useState(student.assignedCompanySupervisor || req?.siteSupervisorName || '');
    const [sEmail, setSEmail] = useState(student.assignedCompanySupervisorEmail || req?.siteSupervisorEmail || '');
    const [sPhone, setSPhone] = useState(req?.siteSupervisorPhone || '');

    const [checkResult, setCheckResult] = useState(null);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const isAssigned = !!student.assignedCompanySupervisor;

    // Derived: if assigned to an MOU company, get its supervisors
    const currentCompany = mouCompanies.find(c => c.name === student.assignedCompany);
    const availableSupervisors = currentCompany?.siteSupervisors || [];

    useEffect(() => {
        if (sEmail && !isAssigned) {
            checkSupervisor(sEmail);
        }
    }, [sEmail, isAssigned]);

    const checkSupervisor = async (email) => {
        try {
            setChecking(true);
            const res = await apiRequest(`/office/check-site-supervisor-by-email?email=${encodeURIComponent(email)}`);
            setCheckResult(res);
        } catch { setCheckResult({ found: false }); } finally { setChecking(false); }
    };

    const handleAssign = async (manualSup) => {
        const payload = manualSup ? {
            studentId: student._id,
            siteSupervisorName: manualSup.name,
            siteSupervisorEmail: manualSup.email,
            siteSupervisorPhone: manualSup.whatsappNumber || manualSup.phone || '',
            officeId
        } : {
            studentId: student._id,
            siteSupervisorName: sName.trim(),
            siteSupervisorEmail: sEmail.trim(),
            siteSupervisorPhone: sPhone,
            officeId
        };

        if (!payload.siteSupervisorName) return showToast.error('Supervisor name is required');
        try {
            setSaving(true);
            await apiRequest('/office/assign-site-supervisor', {
                method: 'POST',
                body: payload
            });
            showToast.success('Site supervisor assigned.');
            onRefresh();
        } catch (err) { /* handled */ } finally { setSaving(false); }
    };

    const handleOnboardAndAssign = async () => {
        const cName = student.assignedCompany || req?.companyName;
        if (!cName) return showToast.error('A company must be specified to link the supervisor.');
        if (!sName.trim() || !sEmail.trim()) return showToast.error('Name and Email are required to register a supervisor.');
        try {
            setSaving(true);
            await apiRequest('/office/onboard-and-assign-site-supervisor', {
                method: 'POST',
                body: { studentId: student._id, siteSupervisorName: sName.trim(), siteSupervisorEmail: sEmail.trim(), siteSupervisorPhone: sPhone, companyName: cName, officeId }
            });
            showToast.success('Supervisor created, linked to company, and assigned.');
            onRefresh();
        } catch (err) { /* handled */ } finally { setSaving(false); }
    };

    return (
        <div className="p-6 flex flex-col gap-4 border-l border-gray-100">
            <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Site Supervisor</p>
                {isAssigned && (
                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">Assigned</span>
                )}
            </div>

            {/* If assigned to MOU company, show registered supervisors first */}
            {currentCompany && availableSupervisors.length > 0 && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-2">Registered Supervisors at {currentCompany.name}</label>
                    <div className="relative">
                        <select
                            onChange={e => {
                                const idx = e.target.value;
                                if (idx !== "") handleAssign(availableSupervisors[idx]);
                            }}
                            className="w-full px-3 py-2 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium text-blue-800 bg-white/50 appearance-none h-10"
                        >
                            <option value="">Select registered...</option>
                            {availableSupervisors.map((s, idx) => (
                                <option key={idx} value={idx}>{s.name} ({s.email})</option>
                            ))}
                        </select>
                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-[10px] pointer-events-none"></i>
                    </div>
                    <p className="text-[8px] text-blue-400 font-medium mt-1.5 px-1 uppercase tracking-tighter">Choose from existing or add new below</p>
                </div>
            )}

            {req?.siteSupervisorName && !isAssigned && (
                <div className="text-[10px] text-gray-400 font-medium bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-1 text-center">Student Proposed Details</span>
                    <div className="grid grid-cols-1 gap-1">
                        <p className="truncate"><i className="fas fa-user w-4 text-gray-300"></i> {req.siteSupervisorName}</p>
                        {req.siteSupervisorEmail && <p className="truncate"><i className="fas fa-envelope w-4 text-gray-300"></i> {req.siteSupervisorEmail}</p>}
                        {req.siteSupervisorPhone && <p className="truncate"><i className="fas fa-phone w-4 text-gray-300"></i> {req.siteSupervisorPhone}</p>}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {[
                    { label: 'Name', val: sName, set: setSName, icon: 'fa-user', ph: 'Supervisor name' },
                    { label: 'Email', val: sEmail, set: setSEmail, icon: 'fa-envelope', ph: 'Email address' },
                    { label: 'Phone', val: sPhone, set: setSPhone, icon: 'fa-phone', ph: '+92...' },
                ].map(({ label, val, set, icon, ph }) => (
                    <div key={label}>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
                        <div className="relative">
                            <i className={`fas ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs`}></i>
                            <input
                                value={val}
                                onChange={e => set(e.target.value)}
                                placeholder={ph}
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-gray-700 placeholder-gray-300 h-10"
                            />
                        </div>
                    </div>
                ))}
            </div>

            {sEmail && !isAssigned && (
                <div>
                    {checking ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium py-2">
                            <i className="fas fa-circle-notch fa-spin text-primary"></i> Checking database...
                        </div>
                    ) : checkResult ? (
                        checkResult.found ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <i className="fas fa-database text-blue-400 text-sm"></i>
                                    <div>
                                        <p className="text-xs font-black text-blue-700">Found in Database</p>
                                        <p className="text-[9px] text-blue-500 font-semibold">{checkResult.supervisor.name} · {checkResult.supervisor.status}</p>
                                    </div>
                                </div>
                                <button
                                    disabled={saving || !sName.trim()}
                                    onClick={() => handleAssign()}
                                    className="w-full py-2.5 h-10 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-sm shadow-primary/20"
                                >
                                    {saving ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-link mr-1.5"></i>Assign Existing Supervisor</>}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-black text-amber-700 mb-1"><i className="fas fa-user-plus mr-1.5"></i>Not in Database</p>
                                    <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                                        This supervisor is not registered yet. This action will create an account, email their login credentials, and link them to the assigned company.
                                    </p>
                                </div>
                                <button
                                    disabled={saving || !sName.trim() || !sEmail.trim() || !(student.assignedCompany || req?.companyName)}
                                    onClick={handleOnboardAndAssign}
                                    className="w-full py-2.5 h-10 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 disabled:opacity-40 transition-colors shadow-sm shadow-amber-200"
                                >
                                    {saving ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-envelope mr-1.5"></i>Register &amp; Assign</>}
                                </button>
                            </div>
                        )
                    ) : (
                        <button
                            onClick={() => checkSupervisor(sEmail)}
                            className="w-full py-2 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors h-10"
                        >
                            <i className="fas fa-magnifying-glass mr-1.5"></i>Check Database
                        </button>
                    )}
                </div>
            )}

            {isAssigned && (
                <button
                    disabled={saving || !sName.trim()}
                    onClick={() => handleAssign()}
                    className="w-full py-2.5 h-10 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 disabled:opacity-40 transition-colors"
                >
                    {saving ? <i className="fas fa-circle-notch fa-spin"></i> : 'Update Details'}
                </button>
            )}
        </div>
    );
}


// ───────────────────────────────────────────────
// Column 3: Faculty Supervisor Assignment
// ───────────────────────────────────────────────
function FacultyColumn({ student, officeId, faculties, onRefresh }) {
    const req = student.internshipRequest;
    const [checkResult, setCheckResult] = useState(null); // {found, faculty}
    const [checking, setChecking] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [manualFacultyId, setManualFacultyId] = useState('');
    const isAssigned = !!student.assignedFaculty;
    const fStatus = req?.facultyStatus || 'Pending';
    const fCfg = facultyStatusConfig[fStatus] || facultyStatusConfig['Pending'];

    // Auto-check proposed email on mount
    const proposedEmail = req?.newFacultyDetails?.email || null;
    const proposedName = req?.newFacultyDetails?.name || null;
    const proposedDept = req?.newFacultyDetails?.department || null;
    const isNewFaculty = req?.facultyType === 'Identify New';

    useEffect(() => {
        if (isNewFaculty && proposedEmail) {
            checkFaculty(proposedEmail);
        }
    }, [proposedEmail]);

    const checkFaculty = async (email) => {
        try {
            setChecking(true);
            const res = await apiRequest(`/office/check-faculty-by-email?email=${encodeURIComponent(email)}`);
            setCheckResult(res);
        } catch { setCheckResult({ found: false }); } finally { setChecking(false); }
    };

    const handleAssign = async (facultyIdToAssign) => {
        const id = typeof facultyIdToAssign === 'string' ? facultyIdToAssign : checkResult?.faculty?.id;
        if (!id) return;
        try {
            setAssigning(true);
            await apiRequest('/office/assign-faculty-override', {
                method: 'POST',
                body: { studentId: student._id, facultyId: id, officeId }
            });
            showToast.success('Faculty supervisor assigned.');
            onRefresh();
        } catch (err) { /* handled */ } finally { setAssigning(false); }
    };

    const handleOnboardAndAssign = async () => {
        try {
            setAssigning(true);
            await apiRequest('/office/onboard-and-assign-faculty', {
                method: 'POST',
                body: { studentId: student._id, name: proposedName, email: proposedEmail, department: proposedDept, officeId }
            });
            showToast.success('Faculty created and assigned. Email invitation sent.');
            onRefresh();
        } catch (err) { /* handled */ } finally { setAssigning(false); }
    };

    return (
        <div className="p-6 flex flex-col gap-4 border-l border-gray-100">
            <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Faculty Supervisor</p>
                <span className={`text-[9px] font-black px-2 py-1 rounded-full ${fCfg.bg} ${fCfg.text}`}>{fStatus}</span>
            </div>

            {/* Currently assigned */}
            {isAssigned && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <i className="fas fa-circle-check text-emerald-500 text-sm"></i>
                    <div>
                        <p className="text-xs font-black text-emerald-700">{typeof student.assignedFaculty === 'object' ? student.assignedFaculty.name : 'Assigned'}</p>
                        <p className="text-[9px] text-emerald-500 font-semibold">Faculty confirmed</p>
                    </div>
                </div>
            )}

            {/* Proposed details */}
            {isNewFaculty && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1 text-xs">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-1">Student's Proposed Faculty</span>
                    {proposedName && <p className="font-semibold text-gray-700"><i className="fas fa-user w-3 mr-1 text-gray-300"></i>{proposedName}</p>}
                    {proposedEmail && <p className="text-gray-500 font-medium"><i className="fas fa-envelope w-3 mr-1 text-gray-300"></i>{proposedEmail}</p>}
                    {proposedDept && <p className="text-gray-400"><i className="fas fa-building w-3 mr-1 text-gray-300"></i>{proposedDept}</p>}
                </div>
            )}

            {/* DB check result */}
            {isNewFaculty && proposedEmail && !isAssigned && (
                <div>
                    {checking ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium py-2">
                            <i className="fas fa-circle-notch fa-spin text-primary"></i> Checking database...
                        </div>
                    ) : checkResult ? (
                        checkResult.found ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <i className="fas fa-database text-blue-400 text-sm"></i>
                                    <div>
                                        <p className="text-xs font-black text-blue-700">Found in Database</p>
                                        <p className="text-[9px] text-blue-500 font-semibold">{checkResult.faculty.name} · {checkResult.faculty.status}</p>
                                    </div>
                                </div>
                                <button
                                    disabled={assigning}
                                    onClick={handleAssign}
                                    className="w-full py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-sm shadow-primary/20"
                                >
                                    {assigning ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-link mr-1.5"></i>Assign This Faculty</>}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-black text-amber-700 mb-1"><i className="fas fa-user-plus mr-1.5"></i>Not in Database</p>
                                    <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                                        Faculty is not registered. This will create an account, email their login credentials, and assign them immediately.
                                    </p>
                                </div>
                                <button
                                    disabled={assigning}
                                    onClick={handleOnboardAndAssign}
                                    className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 disabled:opacity-40 transition-colors shadow-sm shadow-amber-200"
                                >
                                    {assigning ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-envelope mr-1.5"></i>Register &amp; Assign</>}
                                </button>
                            </div>
                        )
                    ) : (
                        <button
                            onClick={() => checkFaculty(proposedEmail)}
                            className="w-full py-2 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
                        >
                            <i className="fas fa-magnifying-glass mr-1.5"></i>Check Database
                        </button>
                    )}
                </div>
            )}

            {req?.facultyType === 'Registered' && !isAssigned && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs font-black text-amber-700 mb-1"><i className="fas fa-hourglass-half mr-1.5"></i>Awaiting Faculty Response</p>
                    <p className="text-[10px] text-amber-600 font-medium">A registered faculty was selected. Waiting for their acceptance.</p>
                </div>
            )}

            {req?.facultyStatus === 'Rejected' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 mb-2">
                    <p className="text-xs font-black text-rose-700 mb-1"><i className="fas fa-xmark-circle mr-1.5"></i>Faculty Rejected</p>
                    <p className="text-[10px] text-rose-600 font-medium">Student needs to select a new supervisor, or you can manually assign one below.</p>
                </div>
            )}

            {/* Manual Assignment / Update Dropdown — Only if not assigned or if they want to override */}
            <div className="pt-2 border-t border-gray-100 mt-2">
                <details className="group">
                    <summary className="cursor-pointer list-none flex items-center justify-between">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block py-1">
                            {isAssigned ? 'Override / Reassign' : 'Manual Assign'}
                        </label>
                        <i className="fas fa-chevron-down text-[8px] text-gray-300 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="relative">
                            <i className="fas fa-chalkboard-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                            <select
                                value={manualFacultyId}
                                onChange={e => setManualFacultyId(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-gray-700 appearance-none bg-white"
                            >
                                <option value="">Select Faculty...</option>
                                {faculties?.map(f => (
                                    <option key={f._id} value={f._id}>{f.name} ({f.email})</option>
                                ))}
                            </select>
                            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
                        </div>
                        <button
                            disabled={assigning || !manualFacultyId}
                            onClick={() => handleAssign(manualFacultyId)}
                            className="w-full py-2.5 rounded-xl bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 disabled:opacity-40 transition-colors shadow-sm"
                        >
                            {assigning ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-user-check mr-1.5"></i>Map Faculty</>}
                        </button>
                    </div>
                </details>
            </div>
        </div>
    );
}

// ───────────────────────────────────────────────
// Expanded Row
// ───────────────────────────────────────────────
function ExpandedRow({ student, officeId, onDecide, deciding, onRefresh, faculties, mouCompanies }) {
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectBox, setShowRejectBox] = useState(false);
    const isPending = student.status === 'Internship Request Submitted';
    const req = student.internshipRequest;
    const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    return (
        <tr>
            <td colSpan={8} className="px-2 pb-4">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">

                    {/* Quick info bar */}
                    <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-gray-100 bg-white text-xs text-gray-400 font-medium">
                        <span><strong className="text-gray-600">Semester:</strong> {student.semester || '—'}</span>
                        <span><strong className="text-gray-600">Mode:</strong> {req?.mode || '—'}</span>
                        <span><strong className="text-gray-600">Duration:</strong> {req?.duration || '—'}</span>
                        <span><strong className="text-gray-600">Start:</strong> {fmt(req?.startDate)}</span>
                        <span><strong className="text-gray-600">End:</strong> {fmt(req?.endDate)}</span>
                        <span><strong className="text-gray-600">Submitted:</strong> {fmt(req?.submittedAt)}</span>
                        {req?.description && <span className="flex-1 truncate"><strong className="text-gray-600">Desc:</strong> {req.description}</span>}
                    </div>

                    {/* 3 independent assignment columns */}
                    <div className={`grid grid-cols-1 ${req?.mode === 'Freelance' ? 'md:grid-cols-2' : 'md:grid-cols-3'} divide-y md:divide-y-0 md:divide-x divide-gray-100`}>
                        <CompanyColumn student={student} officeId={officeId} onRefresh={onRefresh} mouCompanies={mouCompanies} />
                        {req?.mode !== 'Freelance' && (
                            <SiteSupervisorColumn student={student} officeId={officeId} onRefresh={onRefresh} mouCompanies={mouCompanies} />
                        )}
                        <FacultyColumn student={student} officeId={officeId} faculties={faculties} onRefresh={onRefresh} />
                    </div>

                    {/* Approve / Reject footer — only for pending */}
                    {isPending && (
                        <div className="px-6 py-4 border-t border-gray-100 bg-white">
                            {showRejectBox ? (
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Rejection Reason</label>
                                        <textarea
                                            rows={2}
                                            value={rejectReason}
                                            onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Reason for rejection..."
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none font-medium text-gray-700 placeholder-gray-300"
                                        />
                                    </div>
                                    <button onClick={() => setShowRejectBox(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50">
                                        Cancel
                                    </button>
                                    <button
                                        disabled={!rejectReason.trim() || deciding}
                                        onClick={() => onDecide(student._id, 'reject', rejectReason)}
                                        className="px-6 py-2.5 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 disabled:opacity-40 transition-colors"
                                    >
                                        {deciding ? <i className="fas fa-circle-notch fa-spin"></i> : 'Confirm Reject'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-400 font-medium">
                                        <i className="fas fa-info-circle mr-1.5"></i>
                                        The above 3 sections can be processed independently before or after this decision.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowRejectBox(true)}
                                            className="px-5 py-2.5 rounded-xl border-2 border-rose-200 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
                                        >
                                            <i className="fas fa-xmark mr-1.5"></i>Reject
                                        </button>
                                        <button
                                            disabled={deciding}
                                            onClick={() => onDecide(student._id, 'approve')}
                                            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-40 shadow-md shadow-emerald-100 transition-colors"
                                        >
                                            {deciding ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-check mr-1.5"></i>Approve Request</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rejection reason display */}
                    {student.status === 'Internship Rejected' && req?.rejectionReason && (
                        <div className="px-6 py-4 border-t border-rose-100 bg-rose-50">
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Rejection Reason</p>
                            <p className="text-sm font-medium text-rose-600">{req.rejectionReason}</p>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ───────────────────────────────────────────────
// Main Page Component
// ───────────────────────────────────────────────
export default function InternshipRequestsManager({ user }) {
    const [students, setStudents] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState(null);
    const [deciding, setDeciding] = useState(false);

    const officeId = user?.id || user?._id;

    const mouCompanies = useMemo(() =>
        companies.filter(c => c.isMOUSigned && c.status === 'Active'),
        [companies]);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const [stuData, fData, cData] = await Promise.all([
                apiRequest('/office/internship-request-students'),
                apiRequest('/auth/faculty-list'),
                apiRequest('/office/companies')
            ]);
            setStudents(stuData || []);
            setFaculties(Array.isArray(fData) ? fData : []);
            setCompanies(Array.isArray(cData) ? cData : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDecide = async (studentId, decision, comment) => {
        try {
            setDeciding(true);
            await apiRequest('/office/decide-request', {
                method: 'POST',
                body: { studentId, decision, comment }
            });
            showToast.success(`Request ${decision === 'approve' ? 'approved' : 'rejected'}.`);
            setExpandedId(null);
            fetchRequests();
        } catch (err) { /* handled */ } finally { setDeciding(false); }
    };

    const filtered = useMemo(() => {
        let list = students;
        if (filter === 'pending') list = list.filter(s => s.status === 'Internship Request Submitted');
        if (filter === 'approved') list = list.filter(s => s.status === 'Internship Approved');
        if (filter === 'rejected') list = list.filter(s => s.status === 'Internship Rejected');
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.name?.toLowerCase().includes(q) ||
                s.reg?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q) ||
                s.internshipRequest?.companyName?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [students, filter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const counts = {
        all: students.length,
        pending: students.filter(s => s.status === 'Internship Request Submitted').length,
        approved: students.filter(s => s.status === 'Internship Approved').length,
        rejected: students.filter(s => s.status === 'Internship Rejected').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PROGRAMME PROGRESSION</p>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Internship Requests</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">Review, assign, and action all student AppEx-A submissions.</p>
                </div>
                <div className="flex items-center gap-3">
                    {counts.pending > 0 && (
                        <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span className="text-xs font-black text-amber-700">{counts.pending} Pending</span>
                        </div>
                    )}
                    <button onClick={fetchRequests} className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                        <i className="fas fa-rotate-right text-sm"></i>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                {/* Tabs + Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit">
                        {[
                            { key: 'all', label: 'All', count: counts.all },
                            { key: 'pending', label: 'Pending', count: counts.pending },
                            { key: 'approved', label: 'Approved', count: counts.approved },
                            { key: 'rejected', label: 'Rejected', count: counts.rejected },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => { setFilter(t.key); setPage(1); setExpandedId(null); }}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filter === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {t.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${filter === t.key ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); setExpandedId(null); }}
                            placeholder="Search name, reg, company..."
                            className="pl-9 pr-4 py-2.5 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                        />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="py-16 text-center"><i className="fas fa-circle-notch fa-spin text-2xl text-primary opacity-40"></i></div>
                ) : paginated.length === 0 ? (
                    <div className="py-16 text-center text-gray-300">
                        <i className="fas fa-inbox text-4xl mb-3 block"></i>
                        <p className="text-sm font-semibold">No requests found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    {['', 'Student', 'Reg #', 'Company', 'Type', 'Faculty', 'Status', 'Submitted'].map((h, i) => (
                                        <th key={i} className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest pb-3 pr-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map(s => {
                                    const isExpanded = expandedId === s._id;
                                    const req = s.internshipRequest;
                                    const sCfg = statusConfig[s.status] || { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-100', label: s.status };
                                    const fCfg = facultyStatusConfig[req?.facultyStatus] || facultyStatusConfig['Pending'];
                                    const submittedDate = req?.submittedAt
                                        ? new Date(req.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                        : '—';

                                    return (
                                        <React.Fragment key={s._id}>
                                            <tr
                                                className={`border-b border-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50/80' : 'hover:bg-gray-50/40'}`}
                                                onClick={() => setExpandedId(prev => prev === s._id ? null : s._id)}
                                            >
                                                <td className="py-4 pr-2 w-8">
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[9px]`}></i>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-800 leading-tight">{s.name}</span>
                                                        {s.secondaryEmail && (
                                                            <span className="text-[9px] text-primary/70 font-bold italic mt-0.5" title="Secondary Email: Alternative access enabled">
                                                                <i className="fas fa-envelope-open-text mr-1 text-[8px]"></i>
                                                                {s.secondaryEmail}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4 text-gray-400 font-mono text-xs whitespace-nowrap">{s.reg}</td>
                                                <td className="py-4 pr-4 text-gray-600 font-medium max-w-[130px] truncate">{req?.companyName || <span className="text-gray-300 italic">N/A</span>}</td>
                                                <td className="py-4 pr-4 text-gray-500 font-medium text-xs whitespace-nowrap">{req?.type === 'Self' ? 'Self' : req?.type || '—'}</td>
                                                <td className="py-4 pr-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[9px] font-black px-2 py-1 rounded-full w-fit ${fCfg.bg} ${fCfg.text}`}>{req?.facultyStatus || 'N/A'}</span>
                                                        {s.assignedFaculty && (
                                                            <span className="text-[10px] font-bold text-gray-700 truncate max-w-[120px]">
                                                                {typeof s.assignedFaculty === 'object' ? s.assignedFaculty.name : 'Assigned'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}>{sCfg.label}</span>
                                                    {s.status === 'Internship Request Submitted' && (s.assignedCompany || s.assignedFaculty) && (
                                                        <span className="ml-1 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-blue-500 text-white uppercase tracking-tighter shadow-sm" title="This student updated their request after a previous approval/assignment.">Update</span>
                                                    )}
                                                </td>
                                                <td className="py-4 text-xs text-gray-400 font-medium whitespace-nowrap">{submittedDate}</td>
                                            </tr>
                                            {isExpanded && (
                                                <ExpandedRow
                                                    student={s}
                                                    officeId={officeId}
                                                    onDecide={handleDecide}
                                                    deciding={deciding}
                                                    onRefresh={fetchRequests}
                                                    faculties={faculties}
                                                    mouCompanies={mouCompanies}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 mt-4 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-medium">
                            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="w-8 h-8 rounded-lg border border-gray-100 text-gray-400 text-xs font-bold hover:bg-gray-50 disabled:opacity-30">
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-xs font-black transition-colors ${p === page ? 'bg-primary text-white' : 'border border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="w-8 h-8 rounded-lg border border-gray-100 text-gray-400 text-xs font-bold hover:bg-gray-50 disabled:opacity-30">
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
