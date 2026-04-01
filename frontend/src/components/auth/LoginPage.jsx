import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  UserCircle, 
  ArrowLeft, 
  ShieldCheck, 
  Loader2, 
  Eye, 
  EyeOff,
  ChevronRight,
  LogIn,
  University,
  BadgeCheck
} from 'lucide-react';
import Button from '../ui/Button.jsx';
import { FormGroup, TextInput, SelectInput } from '../ui/FormInput.jsx';
import Alert from '../ui/Alert.jsx';
import { apiRequest } from '../../utils/api.js';
import { validate } from '../../utils/validation.js';
import { showToast } from '../../utils/notifications.jsx';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'student' });
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const roles = [
    { id: 'student', label: 'Student', icon: <UserCircle className="w-4 h-4" /> },
    { id: 'hod', label: 'HOD', icon: <BadgeCheck className="w-4 h-4" /> },
    { id: 'internship_office', label: 'Internship Office', icon: <University className="w-4 h-4" /> },
    { id: 'faculty_supervisor', label: 'Faculty Supervisor', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'site_supervisor', label: 'Site Supervisor', icon: <ShieldCheck className="w-4 h-4" /> }
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
        onLogin(data);
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
      onLogin(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (otpMode) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-200/40 rounded-full blur-[120px]" />

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-white relative z-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-indigo-100/50 shadow-xl border border-indigo-100">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Security Check</h2>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">
              We've sent a 6-digit confirmation code to <br />
              <span className="text-indigo-600 font-semibold">{form.email}</span>
            </p>
          </div>

          {apiError && <Alert type="warning" className="mb-6 rounded-2xl">{apiError}</Alert>}

          <FormGroup label="Verification Code">
            <div className="relative">
              <input
                type="text"
                placeholder="000000"
                className="w-full bg-white/50 border border-neutral-200 rounded-2xl py-4 px-4 text-center text-3xl tracking-[12px] font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:tracking-normal placeholder:text-gray-300"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
          </FormGroup>

          <button
            onClick={handleVerifySecondary}
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-semibold text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Confirm & Continue
          </button>

          <button
            className="mt-8 text-sm font-semibold text-gray-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 mx-auto"
            onClick={() => { setOtpMode(false); setApiError(''); }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Mesh Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-100/50 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-[480px] relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-white">
          
          {/* Back Action */}
          <button
            onClick={() => navigate('/')}
            className="group absolute top-8 left-10 flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Home
          </button>

          <div className="text-center mb-10 pt-4">
            <div className="inline-block relative mb-4">
              <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-10 rounded-full scale-150" />
              <img src="/cuilogo.png" alt="CUI Logo" className="h-20 w-auto relative z-10 drop-shadow-xl"
                onError={(e) => e.target.style.display = 'none'} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">CUI Abbottabad</h1>
            <p className="text-sm font-medium text-gray-500 max-w-[280px] mx-auto leading-relaxed">
              Digital Internship Management System
            </p>
          </div>

          {apiError && <Alert type="warning" className="mb-6 rounded-2xl">{apiError}</Alert>}

          <div className="space-y-6">
            <FormGroup label="Select Role">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <UserCircle className="w-5 h-5" />
                </div>
                <select
                  value={form.role}
                  onChange={e => {
                    setForm({ ...form, role: e.target.value });
                    setApiError('');
                    setErrors({});
                  }}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-10 text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 appearance-none cursor-pointer transition-all"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </FormGroup>

            <FormGroup label="Email Address" error={errors.email}>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-gray-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
            </FormGroup>

            <FormGroup label="Password" error={errors.password}>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-medium text-gray-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </FormGroup>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer group">
                <div className="relative flex items-center">
                  <input type="checkbox" className="peer appearance-none w-5 h-5 border border-gray-300 rounded-md checked:bg-indigo-600 checked:border-indigo-600 transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
                <span className="text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Remember me</span>
              </label>
              <button 
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-indigo-600 font-bold hover:text-indigo-700 underline-offset-4 hover:underline transition-all"
              >
                Forgot Password?
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-bold text-base hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-xl shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying account...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center mt-10 text-gray-400 text-sm font-medium">
          Protected by COMSATS Security System
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      ` }} />
    </div>
  );
}

