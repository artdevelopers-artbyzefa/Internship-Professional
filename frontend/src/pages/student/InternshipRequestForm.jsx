import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button.jsx';
import { FormGroup, TextInput, SelectInput, TextareaInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { apiRequest } from '../../utils/api.js';

export default function InternshipRequestForm({ user }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [facultyList, setFacultyList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const isOfficiallyAssigned = user.status === 'Assigned' || (user.assignedCompany && user.assignedFaculty && user.assignedCompanySupervisor);
  const hasOfficialCompany = !!user.assignedCompany;
  const hasOfficialFaculty = !!user.assignedFaculty;
  const hasOfficialSupervisor = !!user.assignedCompanySupervisor;

  const [form, setForm] = useState({
    internshipType: user.internshipRequest?.type || 'Self',
    companyName: user.internshipRequest?.companyName || '',
    siteSupervisorName: user.internshipRequest?.siteSupervisorName || '',
    siteSupervisorEmail: user.internshipRequest?.siteSupervisorEmail || '',
    siteSupervisorPhone: user.internshipRequest?.siteSupervisorPhone || '',

    // Faculty Supervisor Selection
    facultyType: user.internshipRequest?.facultyType || 'Registered', // 'Registered' or 'Identify New'
    selectedFacultyId: user.internshipRequest?.selectedFacultyId || '',
    newFacultyDetails: {
      name: user.internshipRequest?.newFacultyDetails?.name || '',
      email: user.internshipRequest?.newFacultyDetails?.email || '',
      department: user.internshipRequest?.newFacultyDetails?.department || 'Computer Science'
    },

    duration: user.internshipRequest?.duration || '6 Weeks',
    startDate: user.internshipRequest?.startDate ? new Date(user.internshipRequest.startDate).toISOString().split('T')[0] : '',
    endDate: user.internshipRequest?.endDate ? new Date(user.internshipRequest.endDate).toISOString().split('T')[0] : '',
    mode: user.internshipRequest?.mode || 'Onsite',
    description: user.internshipRequest?.description || '',
    freelancePlatform: user.internshipRequest?.freelancePlatform || '',
    freelanceProfileLink: user.internshipRequest?.freelanceProfileLink || ''
  });

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const data = await apiRequest('/student/available-supervisors');
        if (data) setFacultyList(data);
      } catch (err) {
        console.error('Faculty Fetch Error:', err);
      }
    };
    fetchFaculty();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.facultyType === 'Registered' && !form.selectedFacultyId) {
      setError('Please select a Faculty Supervisor from the list or invite a new one.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiRequest('/student/submit-request', {
        method: 'POST',
        body: { userId: user.id || user._id, ...form }
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const req = user.internshipRequest;
  const facultyStatus = req?.facultyStatus;
  const facultyRejected = facultyStatus === 'Rejected';

  // Toggle View/Edit
  if (((user.status === 'Internship Request Submitted' || user.status === 'Internship Approved' || success) && !facultyRejected) && !isEditing) {
    const facultyBadge = {
      Pending: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: 'fa-hourglass-half', label: 'Awaiting Response' },
      Accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'fa-circle-check', label: 'Accepted' },
      Rejected: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: 'fa-circle-xmark', label: 'Rejected' },
    };
    const fb = facultyBadge[facultyStatus] || facultyBadge.Pending;

    const Field = ({ label, value, wide }) => (
      <div className={`flex flex-col gap-1 ${wide ? 'md:col-span-2' : ''}`}>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{value || <span className="text-gray-300 italic">—</span>}</span>
      </div>
    );

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Internship Assessment</p>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              {user.status === 'Internship Approved' ? 'Approved Request Details' : 'Submitted Request Details'}
            </h2>
            <p className="text-sm text-gray-400 font-medium mt-1">
              {user.status === 'Internship Approved'
                ? 'Your AppEx-A form has been officially approved by the Internship Office.'
                : 'Your AppEx-A form has been submitted and is currently under review.'}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
              <span className={`w-2 h-2 rounded-full ${isOfficiallyAssigned ? 'bg-primary' : user.status === 'Internship Approved' ? 'bg-emerald-500' : 'bg-blue-500'} animate-pulse`}></span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isOfficiallyAssigned ? 'text-primary' : user.status === 'Internship Approved' ? 'text-emerald-600' : 'text-blue-600'}`}>
                {isOfficiallyAssigned ? 'Final Placement Confirmed' : user.status === 'Internship Approved' ? 'Internship Approved' : 'Under Review'}
              </span>
            </div>
            {!isOfficiallyAssigned && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm flex items-center gap-2"
              >
                <i className="fas fa-edit"></i> Edit Request
              </button>
            )}
          </div>
        </div>

        {isOfficiallyAssigned && (
          <Alert
            type="success"
            title="Enrollment Confirmed"
            icon="fa-certificate"
            className="mb-6"
          >
            Your final internship placement has been locked by the Internship Office. Details below are official.
          </Alert>
        )}

        {/* Placement Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 pb-3 border-b border-gray-50">Placement Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Field label="Internship Type" value={req?.type === 'Self' ? 'Self Arranged' : req?.type} />
            <Field label="Mode" value={req?.mode} />
            <Field label="Duration" value={req?.duration} />
            <Field label="Start Date" value={req?.startDate ? new Date(req.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
            <Field label="End Date" value={req?.endDate ? new Date(req.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
            <Field label="Submitted On" value={req?.submittedAt ? new Date(req.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
            {(user.assignedCompany || req?.companyName) && (
              <Field
                label={req?.mode === 'Freelance' ? 'Project / Client' : 'Official Organization'}
                value={user.assignedCompany || req.companyName}
                wide
              />
            )}
            {req?.mode === 'Freelance' && req?.freelancePlatform && (
              <Field label="Freelance Platform" value={req.freelancePlatform} />
            )}
            {req?.mode === 'Freelance' && req?.freelanceProfileLink && (
              <Field
                label="Profile Link"
                value={
                  <a href={req.freelanceProfileLink} target="_blank" rel="noopener noreferrer"
                    className="text-primary font-bold underline underline-offset-2 text-xs">
                    {req.freelanceProfileLink}
                  </a>
                }
                wide
              />
            )}
          </div>
          {req?.description && (
            <div className="mt-6 pt-4 border-t border-gray-50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Description</span>
              <p className="text-sm text-gray-600 font-medium leading-relaxed">{req.description}</p>
            </div>
          )}
        </div>

        {/* Site Supervisor (Self-arranged only) */}
        {(req?.siteSupervisorName || req?.siteSupervisorEmail) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 pb-3 border-b border-gray-50">Site Supervisor</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Field label="Name" value={user.assignedCompanySupervisor || req.siteSupervisorName} />
              <Field label="Email" value={req.siteSupervisorEmail} />
              <Field label="Phone" value={req.siteSupervisorPhone} />
            </div>
          </div>
        )}

        {/* Faculty Supervisor */}
        <div className={`rounded-2xl border-2 shadow-sm p-8 ${fb.border} ${fb.bg}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Faculty Supervisor</h3>
            <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${fb.bg} ${fb.text} ${fb.border}`}>
              <i className={`fas ${fb.icon}`}></i> {fb.label}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {user.assignedFaculty ? (
              <>
                <Field label="Assigned Faculty" value={user.assignedFaculty.name} />
                <Field label="Faculty Email" value={user.assignedFaculty.email} />
                <Field label="Status" value="Officially Mapped" />
              </>
            ) : req?.facultyType === 'Registered' ? (
              <Field label="Selection Method" value="Registered Faculty" />
            ) : (
              <>
                <Field label="Proposed Name" value={req?.newFacultyDetails?.name} />
                <Field label="Proposed Email" value={req?.newFacultyDetails?.email} />
                <Field label="Department" value={req?.newFacultyDetails?.department} />
              </>
            )}
          </div>
          {facultyStatus === 'Pending' && !user.assignedFaculty && (
            <p className="mt-4 text-xs text-amber-700 font-medium">
              Your supervision request has been sent. The faculty member will respond shortly.
            </p>
          )}
          {(facultyStatus === 'Accepted' || user.assignedFaculty) && (
            <p className="mt-4 text-xs text-emerald-700 font-medium">
              <i className="fas fa-circle-check mr-1"></i> Supervision confirmed. {user.assignedFaculty ? 'Your faculty supervisor has been officially assigned.' : 'Your faculty supervisor has accepted your request.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Internship Approval Request</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Provide details about your planned internship for institutional approval (AppEx-A).</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Phase 2: Workflow Activation</span>
        </div>
      </div>

      {error && <Alert type="danger" className="mb-6">{error}</Alert>}

      {user.internshipRequest && (
        <Alert type="info" className="mb-6 border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-history text-primary"></i>
              <p className="text-xs font-bold text-gray-700 leading-none">Showing your existing request details. You can update and re-submit if needed.</p>
            </div>
            {isEditing && (
              <button onClick={() => setIsEditing(false)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Cancel Edit</button>
            )}
          </div>
        </Alert>
      )}

      {user.status === 'Internship Rejected' && (
        <Alert type="danger" title="Previous Request Rejected" className="mb-6">
          Reason: {user.internshipRequest?.rejectionReason || 'Not specified'}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* ── SECTION 01: PLACEMENT LOGIC ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-primary/20">01</div>
            <h3 className="text-sm font-black text-gray-800 tracking-widest uppercase">Placement Configuration</h3>
            <div className="h-[1px] bg-gray-100 flex-1 ml-2"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormGroup label="Internship Category">
              <SelectInput
                value={form.internshipType}
                disabled={hasOfficialCompany}
                onChange={e => {
                  const type = e.target.value;
                  const updates = { internshipType: type };
                  if (type === 'University Assigned') updates.mode = 'Onsite';
                  setForm({ ...form, ...updates });
                }}
                iconLeft="fa-building-columns"
              >
                <option value="Self">Self Arranged (Private)</option>
                <option value="University Assigned" disabled={form.mode === 'Freelance'}>
                  {form.mode === 'Freelance' ? 'Not available for Freelance' : 'University Assigned'}
                </option>
              </SelectInput>
            </FormGroup>

            <FormGroup label="Internship Mode">
              <div className="flex flex-wrap gap-2">
                {['Onsite', 'Remote', 'Hybrid', 'Freelance']
                  .filter(m => form.internshipType !== 'University Assigned' || m === 'Onsite')
                  .map(m => (
                    <label key={m} className={`
                            flex-1 min-w-[100px] p-2.5 border-2 rounded-xl cursor-pointer text-center transition-all text-xs
                            ${form.mode === m ? 'border-primary bg-primary/5 text-primary font-black shadow-sm' : 'border-gray-100 text-gray-400 hover:border-gray-200'}
                        `}>
                      <input
                        type="radio"
                        name="mode"
                        className="hidden"
                        checked={form.mode === m}
                        onChange={() => {
                          const updates = { mode: m };
                          if (m === 'Freelance') updates.internshipType = 'Self';
                          setForm({ ...form, ...updates });
                        }}
                      />
                      {m}
                    </label>
                  ))}
              </div>
              {form.mode === 'Freelance' && (
                <p className="text-[9px] font-bold text-amber-600 mt-2 italic px-1">
                  <i className="fas fa-info-circle mr-1"></i> Freelance projects are restricted to Self-Arranged only.
                </p>
              )}
              {form.internshipType === 'University Assigned' && (
                <p className="text-[9px] font-bold text-blue-600 mt-2 italic px-1">
                  <i className="fas fa-info-circle mr-1"></i> University placements are strictly Onsite.
                </p>
              )}
            </FormGroup>
          </div>

          {(form.internshipType === 'Self' || form.mode === 'Freelance') && (
            <div className={`grid grid-cols-1 gap-8 mt-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 animate-in fade-in duration-500 ${form.mode === 'Freelance' ? 'md:grid-cols-1 max-w-sm' : 'md:grid-cols-3'}`}>
              <FormGroup label={form.mode === 'Freelance' ? 'Project / Client Name' : 'Organization / Project Name'}>
                <TextInput
                  placeholder={form.mode === 'Freelance' ? 'e.g. Upwork Project, Fiverr Client' : 'e.g. Google, Private Venture'}
                  value={form.companyName}
                  disabled={hasOfficialCompany}
                  onChange={e => setForm({ ...form, companyName: e.target.value })}
                  iconLeft={form.mode === 'Freelance' ? 'fa-laptop-code' : 'fa-building'}
                  required
                />
              </FormGroup>

              {/* External Mentor details — NOT shown for Freelance (Faculty Supervisor is sufficient) */}
              {form.mode !== 'Freelance' && (
                <>
                  <FormGroup label="External Mentor Name">
                    <TextInput
                      placeholder="Supervisor Name"
                      value={form.siteSupervisorName}
                      disabled={hasOfficialSupervisor}
                      onChange={e => setForm({ ...form, siteSupervisorName: e.target.value })}
                      iconLeft="fa-user-tie"
                      required
                    />
                  </FormGroup>
                  <FormGroup label="Supervisor Contact Details">
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput
                        type="email"
                        placeholder="Email Address"
                        value={form.siteSupervisorEmail}
                        disabled={hasOfficialSupervisor}
                        onChange={e => setForm({ ...form, siteSupervisorEmail: e.target.value })}
                        required
                      />
                      <TextInput
                        placeholder="Phone/WhatsApp"
                        value={form.siteSupervisorPhone}
                        disabled={hasOfficialSupervisor}
                        onChange={e => setForm({ ...form, siteSupervisorPhone: e.target.value })}
                        required
                      />
                    </div>
                  </FormGroup>
                </>
              )}

              {form.mode === 'Freelance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <FormGroup label="Freelance Platform">
                    <SelectInput
                      value={form.freelancePlatform}
                      onChange={e => setForm({ ...form, freelancePlatform: e.target.value })}
                      iconLeft="fa-globe"
                      required
                    >
                      <option value="">Select Platform...</option>
                      <option value="Fiverr">Fiverr</option>
                      <option value="Upwork">Upwork</option>
                      <option value="Freelancer">Freelancer.com</option>
                      <option value="Toptal">Toptal</option>
                      <option value="PeoplePerHour">PeoplePerHour</option>
                      <option value="99designs">99designs</option>
                      <option value="Other">Other</option>
                    </SelectInput>
                  </FormGroup>
                  <FormGroup label={form.freelancePlatform ? `${form.freelancePlatform} Profile Link` : 'Profile Link'}>
                    <TextInput
                      type="url"
                      placeholder={
                        form.freelancePlatform === 'Fiverr' ? 'https://fiverr.com/yourusername' :
                          form.freelancePlatform === 'Upwork' ? 'https://upwork.com/freelancers/~yourprofile' :
                            form.freelancePlatform === 'Freelancer' ? 'https://freelancer.com/u/yourusername' :
                              'https://platform.com/yourprofile'
                      }
                      value={form.freelanceProfileLink}
                      onChange={e => setForm({ ...form, freelanceProfileLink: e.target.value })}
                      iconLeft="fa-link"
                      required
                    />
                  </FormGroup>
                  <p className="md:col-span-2 text-[9px] font-bold text-blue-600 italic px-1">
                    <i className="fas fa-circle-info mr-1"></i>
                    Your Faculty Supervisor will be the primary academic contact. No external site mentor details are required for Freelance mode.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── SECTION 02: FACULTY SUPERVISOR SELECTION ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-emerald-200">02</div>
            <h3 className="text-sm font-black text-gray-800 tracking-widest uppercase">Faculty Supervisor Assignment</h3>
            <div className="h-[1px] bg-gray-100 flex-1 ml-2"></div>
          </div>

          <div className="p-1.5 bg-gray-100 rounded-2xl flex gap-1 mb-8 max-w-lg">
            <button
              type="button"
              onClick={() => setForm({ ...form, facultyType: 'Registered' })}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.facultyType === 'Registered' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-university mr-2"></i> CUI Registered
            </button>
            <button
              type="button"
              disabled={hasOfficialFaculty}
              onClick={() => setForm({ ...form, facultyType: 'Identify New' })}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${hasOfficialFaculty ? 'opacity-50 cursor-not-allowed' : ''} ${form.facultyType === 'Identify New' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-plus mr-2"></i> Identify Other
            </button>
          </div>

          {hasOfficialFaculty && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
              <i className="fas fa-lock text-emerald-500"></i>
              <p className="text-[10px] text-emerald-800 font-bold tracking-tight uppercase">Faculty Selection Locked: Supervisor has been officially assigned by the department.</p>
            </div>
          )}

          {form.facultyType === 'Registered' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
              <FormGroup label="Choose Faculty Supervisor">
                <SelectInput
                  value={form.selectedFacultyId}
                  disabled={hasOfficialFaculty}
                  onChange={e => setForm({ ...form, selectedFacultyId: e.target.value })}
                  iconLeft="fa-chalkboard-user"
                  required
                >
                  <option value="">Select an available faculty members...</option>
                  {facultyList.map(f => (
                    <option key={f._id} value={f._id}>
                      {f.name} ({f.email}) — {5 - (f.currentLoad || 0)} Slots Available
                    </option>
                  ))}
                </SelectInput>
              </FormGroup>
              <div className="bg-emerald-50/50 p-5 rounded-2xl border-2 border-emerald-100/50 flex items-start gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                  <i className="fas fa-shield-halved"></i>
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest mb-1">Reservation Policy</h4>
                  <p className="text-[10px] text-emerald-700/80 leading-relaxed font-medium">
                    Selection is final upon departmental approval. Each faculty member can supervise a maximum of 5 students per cycle. Reservations are logged on a <strong>First Come First Serve</strong> basis.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-500 bg-gray-50/30 p-6 rounded-2xl border border-dashed border-gray-200">
              <FormGroup label="Faculty Full Name">
                <TextInput
                  placeholder="Proposed Supervisor Name"
                  value={form.newFacultyDetails.name}
                  onChange={e => setForm({ ...form, newFacultyDetails: { ...form.newFacultyDetails, name: e.target.value } })}
                  iconLeft="fa-user"
                  required
                />
              </FormGroup>
              <FormGroup label="Institutional Email">
                <TextInput
                  type="email"
                  placeholder="f.name@cuiatd.edu.pk"
                  value={form.newFacultyDetails.email}
                  onChange={e => setForm({ ...form, newFacultyDetails: { ...form.newFacultyDetails, email: e.target.value } })}
                  iconLeft="fa-envelope"
                  required
                />
              </FormGroup>
              <FormGroup label="Department">
                <SelectInput
                  value={form.newFacultyDetails.department}
                  onChange={e => setForm({ ...form, newFacultyDetails: { ...form.newFacultyDetails, department: e.target.value } })}
                  iconLeft="fa-building-ngo"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Management Sciences">Management Sciences</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                </SelectInput>
              </FormGroup>
              <div className="md:col-span-3 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
                <i className="fas fa-circle-exclamation text-amber-500"></i>
                <p className="text-[10px] text-amber-800 font-bold tracking-tight">
                  Note: If the identified faculty is not in the system, a formal invitation will be transmitted. Approval remains pending until they log in and accept your request.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── SECTION 03: SCHEDULE & LOGISTICS ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-rose-200">03</div>
            <h3 className="text-sm font-black text-gray-800 tracking-widest uppercase">Schedule & Logistics</h3>
            <div className="h-[1px] bg-gray-100 flex-1 ml-2"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <FormGroup label="Total Duration">
              <SelectInput
                value={form.duration}
                onChange={e => setForm({ ...form, duration: e.target.value })}
                iconLeft="fa-calendar-day"
              >
                <option value="4 Weeks">4 Weeks</option>
                <option value="6 Weeks">6 Weeks</option>
                <option value="8 Weeks">8 Weeks</option>
                <option value="Above 8 Weeks">Above 8 Weeks</option>
              </SelectInput>
            </FormGroup>

            <FormGroup label="Start Date">
              <TextInput
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup label="End Date">
              <TextInput
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup label="Submission Policy">
              <div className="h-full flex items-center px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-tighter text-center">
                Dates must be consistent with the 6-week academic window.
              </div>
            </FormGroup>
          </div>

          <div className="mt-8">
            <FormGroup label="Internship Scope & Project Description">
              <TextareaInput
                placeholder="Detail your typical daily operations, assigned technology stack, and intended project outcomes..."
                rows={5}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </FormGroup>
          </div>
        </section>

        <div className="flex justify-end pt-8 border-t border-gray-100">
          <Button type="submit" variant="primary" loading={loading} className="px-12 py-5 rounded-2xl shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-[0.2em] border-0 cursor-pointer">
            Transmit Approval Form <i className="fas fa-paper-plane ml-2"></i>
          </Button>
        </div>
      </form>
    </div>
  );
}
