import React, { useState } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';

export default function ForcePasswordChange({ onComplete }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) return setError('Password must be at least 8 characters long.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: { newPassword }
      });
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-halved text-2xl"></i>
          </div>
          <h1 className="text-2xl font-black text-gray-800">Security Update Required</h1>
          <p className="text-gray-500 text-sm mt-2">Your password was recently reset. Please set a new secure password to continue.</p>
        </div>

        {error && <Alert type="danger" className="mb-6">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormGroup label="New Secure Password">
            <TextInput 
              type={showPw ? 'text' : 'password'}
              iconLeft="fa-lock"
              iconRight={showPw ? 'fa-eye-slash' : 'fa-eye'}
              onToggleRight={() => setShowPw(!showPw)}
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </FormGroup>

          <FormGroup label="Confirm New Password">
            <TextInput 
              type={showPw ? 'text' : 'password'}
              iconLeft="fa-circle-check"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
            />
          </FormGroup>

          <Button variant="primary" block type="submit" loading={loading} className="py-4 text-base shadow-lg shadow-primary/20">
            Activate My Account
          </Button>
        </form>

        <p className="text-center text-[10px] text-gray-400 mt-8 tracking-widest font-bold">
            Controlled by University Security Policy
        </p>
      </div>
    </div>
  );
}
