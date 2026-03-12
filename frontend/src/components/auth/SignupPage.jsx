import React, { useState } from 'react';
import StepWizard from '../ui/StepWizard.jsx';
import Button from '../ui/Button.jsx';
import { FormGroup, TextInput, SelectInput } from '../ui/FormInput.jsx';
import { apiRequest } from '../../utils/api.js';
import Alert from '../ui/Alert.jsx';
import { validate } from '../../utils/validation.js';
import { showToast } from '../../utils/notifications.jsx';

export default function SignupPage({ onBack }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', reg: '', semester: '1', cgpa: '',
    email: '', password: '', confirmPw: '',
    role: 'student'
  });

  const updateEmail = (email) => {
    // Correctly extract the roll number if institutional email is detected
    let extractedReg = '';
    const emailLower = email.toLowerCase().trim();
    if (emailLower.includes('@cuiatd.edu.pk')) {
      extractedReg = emailLower.split('@')[0].toUpperCase();
    }
    setForm({ ...form, email: emailLower, reg: extractedReg });
  };
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateStep1 = () => {
    const e = {};
    if (!validate.required(form.email)) {
      e.email = 'Institutional email is required';
    } else if (!validate.institutionalEmail(form.email)) {
      e.email = 'Must be an institutional email (@cuiatd.edu.pk)';
    }
    if (!validate.required(form.name)) e.name = 'Full name is required';
    if (!form.reg) e.reg = 'Registration number could not be extracted from email';
    setErrors(e); return !Object.keys(e).length;
  };

  const validateStep2 = () => {
    // Confirm Identity step - always proceeds
    return true;
  };

  const validateStep3 = () => {
    const e = {};
    if (!validate.password(form.password)) {
      e.password = 'Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character';
    }
    if (form.password !== form.confirmPw) {
      e.confirmPw = 'Passwords do not match';
    }
    setErrors(e); return !Object.keys(e).length;
  };

  const next = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) handleSignup();
  };

  const handleSignup = async () => {
    setLoading(true);
    setApiError('');
    try {
      const fullReg = `CIIT/${form.reg.trim()}/ATD`;

      await apiRequest('/auth/register', {
        method: 'POST',
        body: { ...form, reg: fullReg }
      });
      showToast.success('Registration successful! Please verify your email.');
      setDone(true);
    } catch (err) {
      // apiRequest already shows a toast, but we can set local state for inline alert if needed
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-700 to-blue-400 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl text-success">
          <i className="fas fa-paper-plane"></i>
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">Check Your Email!</h2>
        <p className="text-sm text-gray-400 mb-6">
          We've sent a verification link to <strong>{form.email}</strong>.
          Please verify your account within <strong>24 hours</strong>.
        </p>
        <Button variant="primary" onClick={onBack}><i className="fas fa-right-to-bracket"></i> Back to Login</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-700 to-blue-400 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl">
        <div className="text-center mb-7">
          <img src="/cuilogo.png" alt="CUI Logo" className="h-20 mx-auto mb-3"
            onError={(e) => e.target.style.display = 'none'} />
          <h1 className="text-xl font-bold text-primary">Student Registration</h1>
          <p className="text-xs text-gray-400">Join the DIMS Portal</p>
        </div>

        {apiError && <Alert type="danger" className="mb-4">{apiError}</Alert>}

        <StepWizard steps={['Academic', 'Credentials', 'Security']} current={step} />

        {step === 1 && <>
          <FormGroup label="Institutional Email" error={errors.email}>
            <TextInput iconLeft="fa-envelope" type="email"
              placeholder="e.g. fa23-bcs-034@cuiatd.edu.pk"
              value={form.email} onChange={e => updateEmail(e.target.value)} />
            <p className="text-[10px] text-gray-400 mt-1 leading-tight font-medium italic">
              Verification link will be sent to this institutional email.
            </p>
          </FormGroup>

          <FormGroup label="Derived Registration ID" error={errors.reg}>
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl overflow-hidden opacity-80 cursor-not-allowed">
              <span className="bg-gray-200 px-3 py-2.5 text-xs font-black text-gray-500 border-r border-gray-200 select-none">CIIT/</span>
              <input
                type="text"
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none text-gray-500 font-bold cursor-not-allowed"
                value={form.reg}
                readOnly
                disabled
              />
              <span className="bg-gray-200 px-3 py-2.5 text-xs font-black text-gray-500 border-l border-gray-200 select-none">/ATD</span>
            </div>
          </FormGroup>

          <FormGroup label="Full Name" error={errors.name}>
            <TextInput iconLeft="fa-user" placeholder="Enter full name"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Semester">
              <SelectInput iconLeft="fa-layer-group" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </SelectInput>
            </FormGroup>
            <FormGroup label="CGPA (Optional)">
              <TextInput iconLeft="fa-star" placeholder="e.g. 3.5"
                value={form.cgpa} onChange={e => setForm({ ...form, cgpa: e.target.value })} />
            </FormGroup>
          </div>
        </>}

        {step === 2 && <>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-4 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary text-2xl shadow-inner">
              <i className="fas fa-check-double"></i>
            </div>
            <p className="text-sm font-bold text-primary mb-1">Confirm Identity</p>
            <p className="text-xs text-blue-600 mb-3">You are registering as:</p>
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-blue-100 flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Assigned Registration Number</span>
              <span className="text-lg font-black text-secondary tracking-tighter">CIIT/{form.reg || '????'}/ATD</span>
            </div>
          </div>
          <div className="bg-blue-50/50 p-3 rounded-xl border border-dashed border-blue-200 mb-4">
            <p className="text-[11px] text-blue-700 font-medium">
              <i className="fas fa-circle-info mr-1 text-primary"></i>
              Only CUI Abbottabad students can register. Other accounts are managed by Admin.
            </p>
          </div>
        </>}

        {step === 3 && <>
          <FormGroup label="Password" error={errors.password}>
            <TextInput iconLeft="fa-lock" iconRight={showPw ? 'fa-eye-slash' : 'fa-eye'}
              onToggleRight={() => setShowPw(!showPw)}
              type={showPw ? 'text' : 'password'} placeholder="Min 8 chars, mixed case, symbols"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </FormGroup>
          <FormGroup label="Confirm Password" error={errors.confirmPw}>
            <TextInput iconLeft="fa-lock" iconRight={showConfirmPw ? 'fa-eye-slash' : 'fa-eye'}
              onToggleRight={() => setShowConfirmPw(!showConfirmPw)}
              type={showConfirmPw ? 'text' : 'password'} placeholder="Re-enter password"
              value={form.confirmPw} onChange={e => setForm({ ...form, confirmPw: e.target.value })} />
          </FormGroup>
          <div className="text-[10px] text-gray-400 px-1">
            Min 8 characters, with at least one uppercase, lowercase, digit, and special character.
          </div>
        </>}

        <div className="flex items-center justify-between mt-6">
          {step > 1
            ? <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}><i className="fas fa-arrow-left"></i> Back</Button>
            : <Button variant="outline" onClick={onBack} disabled={loading}><i className="fas fa-arrow-left"></i> Login</Button>}
          <Button variant="primary" onClick={next} disabled={loading}>
            {step === 3
              ? loading ? <><i className="fas fa-circle-notch fa-spin"></i> Registering...</> : <><i className="fas fa-user-plus"></i> Register</>
              : <>Next <i className="fas fa-arrow-right"></i></>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
