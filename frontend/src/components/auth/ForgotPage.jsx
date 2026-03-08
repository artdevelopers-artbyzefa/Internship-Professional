import React, { useState } from 'react';
import Button from '../ui/Button.jsx';
import { FormGroup, TextInput } from '../ui/FormInput.jsx';
import { apiRequest } from '../../utils/api.js';
import { validate } from '../../utils/validation.js';
import Alert from '../ui/Alert.jsx';

export default function ForgotPage({ onBack }) {
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async () => {
    if (!validate.email(email)) return setError('Please enter a valid institutional email.');
    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) return setError('Code must be 6 digits.');
    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/verify-reset-code', {
        method: 'POST',
        body: { email, code }
      });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validate.password(password)) {
      return setError('Password must be 8+ chars with uppercase, digit and symbol.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/reset-password-final', {
        method: 'POST',
        body: { email, code, newPassword: password }
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(onBack, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-700 to-blue-400 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl inline-flex items-center justify-center mb-4 text-2xl">
            <i className={`fas ${step === 1 ? 'fa-envelope-open-text' : step === 2 ? 'fa-shield-halved' : 'fa-lock-open'}`}></i>
          </div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Security Recovery</h1>
          <p className="text-xs text-gray-400 font-medium">Step {step} of 3 • Protected Recovery</p>
        </div>

        {error && <Alert type="danger" className="mb-6">{error}</Alert>}
        {success && <Alert type="success" className="mb-6">{success}</Alert>}

        {!success && (
          <div className="space-y-6">
            {step === 1 && (
              <>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Enter your registered institutional email to receive a **6-digit security code**.
                </p>
                <FormGroup label="Institutional Email">
                  <TextInput
                    iconLeft="fa-envelope"
                    type="email"
                    placeholder="name@cuiatd.edu.pk"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </FormGroup>
                <Button variant="primary" block onClick={handleSendCode} loading={loading}>
                  Request Security Code <i className="fas fa-arrow-right ml-2"></i>
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-gray-500 leading-relaxed">
                  A verification code has been sent to **{email}**. Please enter it below.
                </p>
                <FormGroup label="6-Digit Code">
                  <TextInput
                    iconLeft="fa-key"
                    placeholder="Enter Code"
                    maxLength={6}
                    className="text-center text-xl font-bold tracking-[0.5em]"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                </FormGroup>
                <Button variant="primary" block onClick={handleVerifyCode} loading={loading}>
                  Verify Identity <i className="fas fa-check-double ml-2"></i>
                </Button>
                <button
                  className="w-full text-xs text-secondary font-bold hover:underline bg-transparent border-0 cursor-pointer"
                  onClick={() => setStep(1)}
                >
                  Resend Code or Change Email
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your identity is verified. Please set a strong new password for your account.
                </p>
                <FormGroup label="New Password">
                  <TextInput
                    iconLeft="fa-lock"
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </FormGroup>
                <FormGroup label="Confirm Password">
                  <TextInput
                    iconLeft="fa-shield-halved"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </FormGroup>
                <Button variant="primary" block onClick={handleResetPassword} loading={loading}>
                  Set New Password <i className="fas fa-save ml-2"></i>
                </Button>
              </>
            )}
          </div>
        )}

        <div className="text-center mt-8 pt-6 border-t border-gray-50">
          <button className="text-xs font-bold text-gray-400 hover:text-primary transition-colors bg-transparent border-0 cursor-pointer" onClick={onBack}>
            <i className="fas fa-arrow-left mr-2"></i> Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
