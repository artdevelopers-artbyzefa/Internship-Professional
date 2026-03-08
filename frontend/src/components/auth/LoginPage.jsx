import React, { useState } from 'react';
import Button from '../ui/Button.jsx';
import { FormGroup, TextInput, SelectInput } from '../ui/FormInput.jsx';
import Alert from '../ui/Alert.jsx';
import { apiRequest } from '../../utils/api.js';
import { validate } from '../../utils/validation.js';
import { showToast } from '../../utils/notifications.jsx';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', role: 'student' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const roles = [
    { id: 'student', label: 'Student' },
    { id: 'hod', label: 'HOD' },
    { id: 'internship_office', label: 'Internship Office' },
    { id: 'faculty_supervisor', label: 'Faculty Supervisor' }
  ];

  const handleValidation = () => {
    const e = {};
    if (!validate.required(form.email)) e.email = 'Email is required';
    else if (!validate.email(form.email)) e.email = 'Invalid email format';

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
      showToast.success(`Welcome back, ${data.user.name || 'User'}!`);
      onLogin(data.user);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };


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

        <Button variant="primary" block onClick={handleLogin} disabled={loading}>
          {loading
            ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Verifying...</>
            : <><i className="fas fa-right-to-bracket mr-2"></i> Sign In</>}
        </Button>
      </div>
    </div>
  );
}
