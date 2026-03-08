import React, { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { FormGroup, TextInput, SelectInput, TextareaInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { apiRequest } from '../../utils/api.js';
import { validate } from '../../utils/validation.js';

export default function StudentAgreementForm({ user }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Initialize with 'Self' or 'University' based on previous approval step
  const [formType, setFormType] = useState(user.internshipRequest?.type || 'Self');

  const [form, setForm] = useState({
    // Student Information Block
    fullName: user.name || '',
    regNo: user.reg || '',
    degreeProgram: '',
    semester: user.semester || '',
    contactNumber: '',
    emailAddress: user.email || '',
    preferredField: '',

    // Placement Block (Conditional)
    companyName: user.internshipRequest?.companyName || '',
    companyAddress: '',
    companyRegNo: '',
    companyScope: '',
    companyHREmail: '',
    companySupervisorName: '',
    companySupervisorEmail: '',
    whatsappNumber: '',
    duration: user.internshipRequest?.duration || '6 Weeks',

    agreed: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agreed) {
      setError('You must accept the Internship Agreement Statement to proceed.');
      return;
    }

    if (!validate.phone(form.contactNumber)) {
      setError('Invalid Student Contact Number format (e.g. +923001234567)');
      return;
    }

    if (formType === 'Self' && !validate.phone(form.whatsappNumber)) {
      setError('Invalid Company WhatsApp Number format (e.g. +923001234567)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiRequest('/student/submit-agreement', {
        method: 'POST',
        body: {
          userId: user.id || user._id,
          agreementData: {
            ...form,
            formType // Pass the selected type
          }
        }
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPending = user.status.includes('Agreement Submitted');

  if (isPending || success) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-green-50 text-success rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <i className="fas fa-file-signature animate-pulse"></i>
        </div>
        <h2 className="text-2xl font-black text-gray-800 tracking-tight mb-2">Agreement Submitted</h2>
        <p className="text-gray-500 text-sm">
          Your final Internship Agreement has been submitted.
          The Internship Office will now verify these details and assign an official supervisor.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Internship Agreement Form</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Institutional placement verification and commitment portal (AppEx-B).</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

        <div className="p-8">
          {error && <Alert type="danger" className="mb-6">{error}</Alert>}

          {user.status === 'Agreement Rejected' && (
            <Alert type="danger" title="Previous Agreement Rejected" className="mb-6">
              Reason: {user.internshipAgreement?.rejectionComments || 'Not specified'}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Form Type Selection */}
            <div className="p-1.5 bg-gray-100 rounded-xl flex gap-1">
              <button
                type="button"
                onClick={() => setFormType('Self')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${formType === 'Self' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <i className="fas fa-user-tie mr-2"></i> Self-Arranged Internship
              </button>
              <button
                type="button"
                onClick={() => setFormType('University Assigned')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${formType === 'University Assigned' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <i className="fas fa-university mr-2"></i> University-Assigned
              </button>
            </div>

            {/* Section 1: Student Information */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center font-bold text-sm">01</div>
                <h3 className="text-sm font-black text-gray-800 tracking-widest">Student Information</h3>
                <div className="h-[1px] bg-gray-100 flex-1 ml-2"></div>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-50 px-2 py-1 rounded">MANDATORY</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup label="Full Name">
                  <TextInput value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} iconLeft="fa-user" required />
                </FormGroup>
                <FormGroup label="Registration Number">
                  <TextInput value={form.regNo} onChange={e => setForm({ ...form, regNo: e.target.value })} iconLeft="fa-id-card" required />
                </FormGroup>
                <FormGroup label="Degree Program">
                  <TextInput placeholder="e.g. BSCS, BSSE" value={form.degreeProgram} onChange={e => setForm({ ...form, degreeProgram: e.target.value })} iconLeft="fa-graduation-cap" required />
                </FormGroup>
                <FormGroup label="Semester">
                  <SelectInput value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} iconLeft="fa-calendar">
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </SelectInput>
                </FormGroup>
                <FormGroup label="Contact Number">
                  <TextInput placeholder="Mobile/WhatsApp" value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} iconLeft="fa-phone" required />
                </FormGroup>
                <FormGroup label="Email Address">
                  <TextInput value={form.emailAddress} onChange={e => setForm({ ...form, emailAddress: e.target.value })} iconLeft="fa-envelope" disabled required />
                </FormGroup>
                <div className="md:col-span-2">
                  <FormGroup label="Preferred Internship Field/Domain">
                    <TextInput placeholder="e.g. Web Dev, AI, Cyber Security" value={form.preferredField} onChange={e => setForm({ ...form, preferredField: e.target.value })} iconLeft="fa-magnifying-glass" required />
                  </FormGroup>
                </div>
              </div>
            </section>

            {/* Section 2: Placement Details - ONLY for Self Arranged */}
            {formType === 'Self' ? (
              <section className="animate-in slide-in-from-bottom-5 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">02</div>
                  <h3 className="text-sm font-black text-gray-800 tracking-widest">Self-Placement Details</h3>
                  <div className="h-[1px] bg-gray-100 flex-1 ml-2"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="Company/Organization Name">
                    <TextInput value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} iconLeft="fa-building" required />
                  </FormGroup>
                  <FormGroup label="Internship Duration">
                    <SelectInput value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} iconLeft="fa-clock">
                      <option value="4 Weeks">4 Weeks</option>
                      <option value="6 Weeks">6 Weeks</option>
                      <option value="8 Weeks">8 Weeks</option>
                      <option value="Above 8 Weeks">Above 8 Weeks</option>
                    </SelectInput>
                  </FormGroup>
                  <FormGroup label="Company Address">
                    <TextInput required value={form.companyAddress} onChange={e => setForm({ ...form, companyAddress: e.target.value })} iconLeft="fa-location-dot" />
                  </FormGroup>
                  <FormGroup label="Company Registration #">
                    <TextInput required value={form.companyRegNo} onChange={e => setForm({ ...form, companyRegNo: e.target.value })} iconLeft="fa-hashtag" />
                  </FormGroup>
                  <FormGroup label="HR Email Address">
                    <TextInput type="email" required value={form.companyHREmail} onChange={e => setForm({ ...form, companyHREmail: e.target.value })} iconLeft="fa-envelope-circle-check" />
                  </FormGroup>
                  <FormGroup label="Company Supervisor Name">
                    <TextInput required value={form.companySupervisorName} onChange={e => setForm({ ...form, companySupervisorName: e.target.value })} iconLeft="fa-user-tie" />
                  </FormGroup>
                  <FormGroup label="Supervisor Email">
                    <TextInput type="email" required value={form.companySupervisorEmail} onChange={e => setForm({ ...form, companySupervisorEmail: e.target.value })} iconLeft="fa-at" />
                  </FormGroup>
                  <FormGroup label="Official WhatsApp Number">
                    <TextInput required value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} iconLeft="fa-brands fa-whatsapp" />
                  </FormGroup>
                </div>
              </section>
            ) : (
              <section className="animate-in fade-in duration-500">
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100/50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                    <i className="fas fa-circle-info"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">University Assigned Workflow</h4>
                    <p className="text-xs text-blue-700/80 leading-relaxed">
                      Since you have chosen university-assigned internship, you only need to provide your personal and domain preference data.
                      The <strong>Internship Office</strong> will fill the placement details (Company, Role, and Supervisors) after official allocation.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 3: Agreement Statement */}
            <section className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h3 className="text-xs font-black text-gray-400 tracking-[0.2em] mb-4 text-center">Student Internship Agreement Statement</h3>

              <div className="bg-white p-6 rounded-xl border border-gray-100 text-xs leading-relaxed text-gray-700 italic shadow-sm mb-6">
                I, <span className="font-bold text-primary border-b border-primary/20">{form.fullName || '_________'}</span>,
                a student of <span className="font-bold text-primary border-b border-primary/20">{form.degreeProgram || '_________'}</span> at
                <span className="font-bold text-primary"> COMSATS University Islamabad, Abbottabad Campus</span>,
                hereby acknowledge and accept the internship opportunity {formType === 'Self' ? `at ${form.companyName || '[Organization Name]'}` : 'assigned to me'}.
                I agree to:
                <ol className="list-decimal ml-6 mt-3 space-y-2 not-italic">
                  <li>Abide by the rules, regulations, and code of conduct of the host organization.</li>
                  <li>Maintain punctuality, discipline, and professionalism throughout the internship period.</li>
                  <li>Complete the tasks and responsibilities assigned to me to the best of my ability.</li>
                  <li>Communicate regularly with my academic supervisor and provide updates on my progress.</li>
                  <li>Maintain confidentiality of any sensitive information encountered during the internship.</li>
                  <li>Submit all required internship reports, evaluations, and documents by the specified deadlines.</li>
                </ol>
                <p className="mt-4 not-italic font-medium">
                  I understand that this internship is a vital part of my academic and professional development, and I will uphold the standards expected by my university and the host organization.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded-lg text-primary focus:ring-primary border-gray-300 transition-all cursor-pointer"
                  checked={form.agreed}
                  onChange={e => setForm({ ...form, agreed: e.target.checked })}
                />
                <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">I accept the above agreement conditions</span>
              </label>
            </section>

            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" loading={loading} className="px-16 py-4 h-auto text-lg rounded-2xl shadow-lg shadow-primary/20">
                Submit Final Agreement <i className="fas fa-check-double ml-2"></i>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
