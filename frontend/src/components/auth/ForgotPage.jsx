import React, { useState } from 'react';
import Button from '../ui/Button.jsx';
import { FormGroup, TextInput } from '../ui/FormInput.jsx';
import { apiRequest } from '../../utils/api.js';
import Alert from '../ui/Alert.jsx';

// Steps:
// 1 → Enter primary email
// 2 → Choose which email to receive code (primary or secondary)
// 3 → Enter 6-digit OTP
// 4 → Set new password

export default function ForgotPage({ onBack }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [sentToEmail, setSentToEmail] = useState(''); // the email the code was actually sent to
  const [emailOptions, setEmailOptions] = useState(null); // { primaryEmail, secondaryEmail }
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requiresSecondary, setRequiresSecondary] = useState(false);

  const maskEmail = (e) => {
    if (!e) return '';
    const [local, domain] = e.split('@');
    return local.slice(0, 2) + '***@' + domain;
  };

  // Step 1: Lookup account & check secondary email
  const handleLookup = async () => {
    if (!email.trim()) return setError('Please enter your registered email.');
    setLoading(true);
    setError('');
    setRequiresSecondary(false);
    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
        silent: true
      });

      if (data.requiresSecondaryEmail) {
        setRequiresSecondary(true);
        setError(data.message);
        return;
      }

      if (data.status === 'choose_email') {
        setEmailOptions({ primaryEmail: data.primaryEmail, secondaryEmail: data.secondaryEmail });
        setStep(2);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Send code to chosen email
  const handleSendCode = async (sendTo) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim(), sendTo },
        silent: true
      });

      setSentToEmail(data.sentTo || '');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP
  const handleVerifyCode = async () => {
    if (code.length !== 6) return setError('Please enter the full 6-digit code.');
    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/verify-reset-code', {
        method: 'POST',
        body: { email: sentToEmail || email.trim(), code },
        silent: true
      });
      setStep(4);
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Set new password
  const handleResetPassword = async () => {
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/reset-password-final', {
        method: 'POST',
        body: { email: sentToEmail || email.trim(), code, newPassword: password },
        silent: true
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(onBack, 3000);
    } catch (err) {
      setError(err.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const stepIcons = ['fa-envelope-open-text', 'fa-at', 'fa-shield-halved', 'fa-lock-open'];
  const stepTitles = ['Account Lookup', 'Choose Delivery', 'Verify Identity', 'Set New Password'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-700 to-blue-400 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl inline-flex items-center justify-center mb-4 text-2xl shadow-inner">
            <i className={`fas ${stepIcons[step - 1]}`}></i>
          </div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Security Recovery</h1>
          {!success && (
            <p className="text-xs text-gray-400 font-medium mt-1">
              Step {step} of 4 — {stepTitles[step - 1]}
            </p>
          )}
          {/* Step dots */}
          {!success && (
            <div className="flex justify-center gap-2 mt-3">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-primary' : s < step ? 'w-4 bg-blue-200' : 'w-4 bg-gray-100'}`}
                />
              ))}
            </div>
          )}
        </div>

        {error && !requiresSecondary && <Alert type="danger" className="mb-5">{error}</Alert>}
        {success && <Alert type="success" className="mb-5">{success}</Alert>}

        {!success && (
          <div className="space-y-5">

            {/* STEP 1 — Email lookup */}
            {step === 1 && (
              <>
                {requiresSecondary ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl inline-flex items-center justify-center text-xl mx-auto">
                      <i className="fas fa-triangle-exclamation"></i>
                    </div>
                    <h3 className="font-black text-amber-800 text-sm">Secondary Email Required</h3>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Password reset requires a verified secondary email. Please log in, go to{' '}
                      <strong>My Profile → Contact &amp; Security</strong>, and link a secondary email first.
                    </p>
                    <Button variant="primary" block onClick={onBack} className="mt-2 bg-amber-600 hover:bg-amber-700 border-0">
                      <i className="fas fa-arrow-left mr-2"></i>Back to Login
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Enter your registered institutional email to begin the secure recovery process.
                    </p>
                    <FormGroup label="Registered Email">
                      <TextInput
                        iconLeft="fa-envelope"
                        type="email"
                        placeholder="name@cuiatd.edu.pk"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleLookup()}
                      />
                    </FormGroup>
                    <Button variant="primary" block onClick={handleLookup} loading={loading}>
                      Continue <i className="fas fa-arrow-right ml-2"></i>
                    </Button>
                  </>
                )}
              </>
            )}

            {/* STEP 2 — Choose email */}
            {step === 2 && emailOptions && (
              <>
                <p className="text-sm text-gray-500 leading-relaxed">
                  A 6-digit verification code will be sent to your chosen email. Select where you'd like to receive it:
                </p>
                {error && <Alert type="danger">{error}</Alert>}
                <div className="space-y-3">
                  <button
                    className="w-full flex items-center gap-4 p-4 border-2 border-blue-100 hover:border-primary hover:bg-blue-50 rounded-2xl transition-all group text-left"
                    onClick={() => handleSendCode('primary')}
                    disabled={loading}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <i className="fas fa-university text-sm"></i>
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-700 uppercase tracking-wide">Primary (Institutional)</div>
                      <div className="text-sm font-bold text-primary">{maskEmail(emailOptions.primaryEmail)}</div>
                    </div>
                    {loading ? (
                      <i className="fas fa-circle-notch fa-spin text-gray-300 ml-auto"></i>
                    ) : (
                      <i className="fas fa-arrow-right text-gray-300 group-hover:text-primary ml-auto transition-colors"></i>
                    )}
                  </button>

                  <button
                    className="w-full flex items-center gap-4 p-4 border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all group text-left"
                    onClick={() => handleSendCode('secondary')}
                    disabled={loading}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <i className="fas fa-envelope text-sm"></i>
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-700 uppercase tracking-wide">Secondary (Personal)</div>
                      <div className="text-sm font-bold text-emerald-600">{maskEmail(emailOptions.secondaryEmail)}</div>
                    </div>
                    {loading ? (
                      <i className="fas fa-circle-notch fa-spin text-gray-300 ml-auto"></i>
                    ) : (
                      <i className="fas fa-arrow-right text-gray-300 group-hover:text-emerald-500 ml-auto transition-colors"></i>
                    )}
                  </button>
                </div>
                <button className="w-full text-xs text-gray-400 hover:text-primary font-bold text-center mt-2 transition-colors" onClick={() => setStep(1)}>
                  <i className="fas fa-arrow-left mr-1"></i> Change email
                </button>
              </>
            )}

            {/* STEP 3 — OTP entry */}
            {step === 3 && (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                  <i className="fas fa-circle-info text-primary mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    A 6-digit code was sent to <strong>{sentToEmail}</strong>. It expires in <strong>10 minutes</strong>.
                  </p>
                </div>
                <FormGroup label="Verification Code">
                  <TextInput
                    iconLeft="fa-key"
                    placeholder="0  0  0  0  0  0"
                    maxLength={6}
                    className="text-center text-2xl font-black tracking-[0.6em]"
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                  />
                </FormGroup>
                {error && <Alert type="danger">{error}</Alert>}
                <Button variant="primary" block onClick={handleVerifyCode} loading={loading} disabled={code.length < 6}>
                  Verify Identity <i className="fas fa-check-double ml-2"></i>
                </Button>
                <div className="flex justify-between text-xs font-bold text-gray-400 mt-1">
                  <button className="hover:text-primary transition-colors" onClick={() => setStep(2)}>
                    <i className="fas fa-arrow-left mr-1"></i> Change email
                  </button>
                  <button className="hover:text-primary transition-colors" onClick={() => handleSendCode(sentToEmail === emailOptions?.secondaryEmail ? 'secondary' : 'primary')}>
                    Resend code
                  </button>
                </div>
              </>
            )}

            {/* STEP 4 — New password */}
            {step === 4 && (
              <>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Identity verified. Set a strong new password for your account.
                </p>
                <FormGroup label="New Password">
                  <TextInput
                    iconLeft="fa-lock"
                    iconRight={showPw ? 'fa-eye-slash' : 'fa-eye'}
                    onToggleRight={() => setShowPw(!showPw)}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                  />
                </FormGroup>
                <FormGroup label="Confirm New Password">
                  <TextInput
                    iconLeft="fa-shield-halved"
                    iconRight={showConfirmPw ? 'fa-eye-slash' : 'fa-eye'}
                    onToggleRight={() => setShowConfirmPw(!showConfirmPw)}
                    type={showConfirmPw ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                  />
                </FormGroup>
                {/* Strength hint */}
                {password.length > 0 && (
                  <div className="flex gap-1.5">
                    {[
                      password.length >= 8,
                      /[A-Z]/.test(password),
                      /[0-9]/.test(password),
                      /[^A-Za-z0-9]/.test(password)
                    ].map((ok, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-emerald-400' : 'bg-gray-100'}`} />
                    ))}
                  </div>
                )}
                {error && <Alert type="danger">{error}</Alert>}
                <Button variant="primary" block onClick={handleResetPassword} loading={loading} disabled={password.length < 8 || password !== confirmPassword}>
                  Set New Password <i className="fas fa-save ml-2"></i>
                </Button>
              </>
            )}
          </div>
        )}

        <div className="text-center mt-8 pt-6 border-t border-gray-50">
          <button className="text-xs font-bold text-gray-400 hover:text-primary transition-colors bg-transparent border-0 cursor-pointer" onClick={onBack}>
            <i className="fas fa-arrow-left mr-2"></i>Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
