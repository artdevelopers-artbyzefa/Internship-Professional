import React, { useState } from 'react';
import Button from '../ui/Button.jsx';
import { FormGroup, TextInput } from '../ui/FormInput.jsx';

export default function ForgotPage({ onBack }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-700 to-blue-400 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl">
        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-primary rounded-2xl inline-flex items-center justify-center mb-3">
            <i className="fas fa-key text-white text-2xl"></i>
          </div>
          <h1 className="text-xl font-bold text-primary">Reset Password</h1>
          <p className="text-xs text-gray-400">CUI DIMS Portal</p>
        </div>

        {!sent ? <>
          <p className="text-sm text-gray-400 mb-5">Enter your email and we'll send you a reset link.</p>
          <FormGroup label="Email Address">
            <TextInput iconLeft="fa-envelope" type="email" placeholder="Enter your email"
              value={email} onChange={e => setEmail(e.target.value)} />
          </FormGroup>
          <Button variant="primary" block onClick={() => email && setSent(true)}>
            <i className="fas fa-paper-plane"></i> Send Reset Link
          </Button>
        </> : (
          <div className="text-center">
            <div className="text-5xl text-success mb-3"><i className="fas fa-check-circle"></i></div>
            <p className="font-semibold mb-2">Reset Link Sent!</p>
            <p className="text-sm text-gray-400">Check your email inbox for the password reset instructions.</p>
          </div>
        )}

        <div className="text-center mt-4">
          <button className="text-sm text-secondary underline bg-transparent border-0 cursor-pointer" onClick={onBack}>
            <i className="fas fa-arrow-left"></i> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
