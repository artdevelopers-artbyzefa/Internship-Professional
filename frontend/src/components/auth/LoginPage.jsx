import React, { useState } from 'react';
import Button from '../ui/Button.jsx';
import { FormGroup, TextInput, SelectInput } from '../ui/FormInput.jsx';
import Alert from '../ui/Alert.jsx';
import { apiRequest } from '../../utils/api.js';
import { validate } from '../../utils/validation.js';
import { showToast } from '../../utils/notifications.jsx';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', role: 'student' });
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const roles = [
    { id: 'student', label: 'Student' },
    { id: 'hod', label: 'HOD' },
    { id: 'internship_office', label: 'Internship Office' },
    { id: 'faculty_supervisor', label: 'Faculty Supervisor' },
    { id: 'site_supervisor', label: 'Site Supervisor' }
  ];

  const handleValidation = () => {
    const e = {};
    if (!validate.required(form.email)) e.email = 'Email is required';
    if (!validate.required(form.password)) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!handleValidation()) return;
    setLoading(true);
    setApiError('');

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: form
      });

      if (data.status === 'otp_required') {
        setOtpMode(true);
        showToast.info(data.message);
      } else {
        showToast.success(`Welcome back, ${data.user.name || 'User'}!`);
        onLogin(data.user);
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecondary = async () => {
    if (!otp) return showToast.error('Please enter the verification code');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/verify-secondary', {
        method: 'POST',
        body: { email: form.email, code: otp }
      });
      showToast.success(`Verified! Welcome, ${data.user.name}`);
      onLogin(data.user);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (otpMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-700 to-blue-400 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl shadow-black/20 text-center">
          <div className="mb-7">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm text-2xl">
              <i className="fas fa-shield-halved"></i>
            </div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Secondary Login</h2>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              For security, we sent a 6-digit code to <br />
              <span className="text-primary font-bold">{form.email}</span>
            </p>
          </div>

          {apiError && <Alert type="warning" className="mb-4">{apiError}</Alert>}

          <FormGroup label="Verification Code">
            <TextInput
              iconLeft="fa-key"
              placeholder="000000"
              className="text-center text-xl tracking-[1em] font-black"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </FormGroup>

          <Button variant="primary" block onClick={handleVerifySecondary} disabled={loading} className="mt-4">
            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Verify & Sign In'}
          </Button>

          <button
            className="mt-6 text-sm font-bold text-gray-400 hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
            onClick={() => { setOtpMode(false); setApiError(''); }}
          >
            <i className="fas fa-arrow-left text-[10px]"></i> Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-700 to-blue-400 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl shadow-black/20">
        <div className="text-center mb-7">
          <img src="/cuilogo.png" alt="CUI Logo" className="h-20 mx-auto mb-3"
            onError={(e) => e.target.style.display = 'none'} />
          <h1 className="text-xl font-bold text-primary">CUI Abbottabad</h1>
          <p className="text-xs text-gray-400 mt-0.5">Digital Internship Management System</p>
        </div>

        {apiError && <Alert type="warning">{apiError}</Alert>}

        <FormGroup label="Select Role">
          <SelectInput
            iconLeft="fa-id-badge"
            value={form.role}
            onChange={e => {
              setForm({ ...form, role: e.target.value });
              setApiError('');
              setErrors({});
            }}
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </SelectInput>
        </FormGroup>

        <FormGroup label="Email Address" error={errors.email}>
          <TextInput iconLeft="fa-envelope" type="email" placeholder="Enter your email"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </FormGroup>

        <FormGroup label="Password" error={errors.password}>
          <TextInput iconLeft="fa-lock" iconRight={showPw ? 'fa-eye-slash' : 'fa-eye'}
            onToggleRight={() => setShowPw(!showPw)}
            type={showPw ? 'text' : 'password'} placeholder="Enter your password"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </FormGroup>

        <div className="flex items-center justify-between mb-5">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-500">
            <input type="checkbox" className="rounded" /> Remember me
          </label>
          <button className="text-sm text-secondary underline bg-transparent border-0 cursor-pointer font-medium"
            onClick={() => window._goForgot?.()}>Forgot Password?</button>
        </div>

        <Button variant="primary" block onClick={handleLogin} disabled={loading} className="mb-8">
          {loading
            ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Verifying...</>
            : <><i className="fas fa-right-to-bracket mr-2"></i> Sign In</>}
        </Button>

        {/* ── Quick Access Testing Suite ── */}
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-orange-400 rounded-full"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Quick Access Testing</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: 'Student', role: 'student', email: 'fa23-bcs-013@cuiatd.edu.pk', icon: 'fa-user-graduate', color: 'bg-emerald-50 text-emerald-600' },
              { label: 'HOD', role: 'hod', email: 'hod@cuiatd.edu.pk', icon: 'fa-user-tie', color: 'bg-blue-50 text-blue-600' },
              { label: 'IO Office', role: 'internship_office', email: 'io@cuiatd.edu.pk', icon: 'fa-building-shield', color: 'bg-indigo-50 text-indigo-600' },
              { label: 'Faculty', role: 'faculty_supervisor', email: 'drarslanrathore@gmail.com', icon: 'fa-chalkboard-user', color: 'bg-amber-50 text-amber-600' },
              { label: 'Site Sup', role: 'site_supervisor', email: 'eathorgaming@gmail.com', icon: 'fa-user-gear', color: 'bg-rose-50 text-rose-600' }
            ].map((testUser) => (
              <button
                key={testUser.role}
                onClick={() => {
                  setForm({ email: testUser.email, password: 'Megamix@123', role: testUser.role });
                  setErrors({});
                  setApiError('');
                  showToast.info(`${testUser.label} credentials loaded.`);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border border-transparent transition-all active:scale-95 text-center cursor-pointer hover:shadow-md hover:border-gray-100 ${testUser.color}`}
              >
                <i className={`fas ${testUser.icon} text-sm mb-1`}></i>
                <span className="text-[9px] font-black uppercase tracking-tight">{testUser.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
