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
  LogIn,
  BadgeCheck,
  University
} from 'lucide-react';
import { FormGroup } from '../ui/FormInput.jsx';
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
      <div className="min-h-screen bg-[#1e3a8a] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-50 text-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Security Check</h2>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">
              We've sent a 6-digit confirmation code to <br />
              <span className="text-blue-700 font-semibold">{form.email}</span>
            </p>
          </div>

          {apiError && <Alert type="warning" className="mb-6">{apiError}</Alert>}

          <FormGroup label="Verification Code" uppercase>
            <input
              type="text"
              placeholder="000000"
              className="w-full border border-gray-200 rounded-xl py-3.5 px-4 text-center text-3xl tracking-[12px] font-bold text-gray-900 outline-none focus:border-blue-600 transition-all placeholder:tracking-normal placeholder:text-gray-300"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </FormGroup>

          <button
            onClick={handleVerifySecondary}
            disabled={loading}
            className="w-full bg-[#1e3a8a] text-white rounded-xl py-4 font-semibold text-base hover:bg-blue-900 transition-all disabled:opacity-70 flex items-center justify-center gap-3 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Confirm & Continue
          </button>

          <button
            className="mt-8 text-sm font-semibold text-gray-400 hover:text-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
            onClick={() => { setOtpMode(false); setApiError(''); }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#1e3a8a] flex items-center justify-center p-6">
      <div className="w-full max-w-[480px]">
        <div className="bg-white rounded-3xl p-10 shadow-2xl">

          {/* Back Action */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-700 transition-colors mb-6"
              aria-label="Back to home page"
            >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>

          <div className="text-center mb-8">
            <img
              src="/cuilogo.png"
              alt="COMSATS University Islamabad Logo"
              width={80}
              height={80}
              fetchpriority="high"
              loading="eager"
              decoding="sync"
              className="h-20 w-auto mx-auto mb-4 drop-shadow"
              onError={(e) => e.target.style.display = 'none'}
            />
            <h1 className="text-2xl font-black text-[#1e3a8a] tracking-tight mb-1">CUI Abbottabad</h1>
            <p className="text-sm font-medium text-gray-500">Digital Internship Management System</p>
          </div>

          {apiError && <Alert type="warning" className="mb-5">{apiError}</Alert>}

          <form 
            onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
            className="space-y-4"
          >
            <FormGroup label="Select Role" htmlFor="login-role">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <UserCircle className="w-4 h-4" />
                </div>
                <select
                  id="login-role"
                  value={form.role}
                  onChange={e => {
                    setForm({ ...form, role: e.target.value });
                    setApiError('');
                    setErrors({});
                  }}
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-8 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600 appearance-none cursor-pointer transition-all"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">-</div>
              </div>
            </FormGroup>

            <FormGroup label="Email Address" error={errors.email} htmlFor="login-email">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-gray-700 outline-none focus:border-blue-600 transition-all"
                />
              </div>
            </FormGroup>

            <FormGroup label="Password" error={errors.password} htmlFor="login-password">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-10 text-sm font-medium text-gray-700 outline-none focus:border-blue-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-700 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormGroup>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="w-4 h-4 border border-gray-300 rounded accent-blue-700" />
                <span className="text-gray-500 font-medium">Remember me</span>
              </label>
              <button
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-blue-700 font-bold hover:underline transition-all"
              >
                Forgot Password?
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#1e3a8a] text-white rounded-xl py-3.5 font-bold text-base hover:bg-blue-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-2"
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
          </form>
        </div>
      </div>
    </main>
  );
}
