import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';
import Alert from '../../components/ui/Alert.jsx';

export default function StudentProfile({ user, onUpdate, isEligible, isPhase1, isPendingSetup }) {
  const isDisabled = isPhase1 && !isEligible && !isPendingSetup;

  const [form, setForm] = useState({
    fatherName: user.fatherName || '',
    section: user.section || '',
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    profilePicture: user.profilePicture || '',
    whatsappNumber: user.whatsappNumber || '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  // Secondary email OTP state
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Password visibility
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        showToast.error('File is too large! Please upload a photo smaller than 1.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setForm({ ...form, profilePicture: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      showToast.error('Passwords do not match!');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/student/update-profile', {
        method: 'PUT',
        body: form
      });
      showToast.success('Profile updated successfully');
      setForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      if (onUpdate) onUpdate(data.user);
    } catch (err) {
      // apiRequest already shows toast
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!secondaryEmail.trim()) return showToast.error('Please enter a secondary email.');

    // Must NOT be an institutional email — must be a personal backup
    const trimmed = secondaryEmail.trim().toLowerCase();
    if (trimmed.endsWith('@cuiatd.edu.pk')) {
      return showToast.error('Secondary email must be a personal email (e.g. Gmail, Yahoo). Institutional emails cannot be used as backup.');
    }
    if (trimmed === user.email.toLowerCase()) {
      return showToast.error('Secondary email cannot be the same as your primary institutional email.');
    }

    setOtpLoading(true);
    try {
      const data = await apiRequest('/student/secondary-email/send-otp', {
        method: 'POST',
        body: { secondaryEmail: trimmed }
      });
      showToast.success(data.message);
      setOtpSent(true);
    } catch (err) {
      // handled by apiRequest toast
    } finally {
      setOtpLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!otp.trim()) return showToast.error('Please enter the verification code.');
    setConfirmLoading(true);
    try {
      const data = await apiRequest('/student/secondary-email/confirm', {
        method: 'POST',
        body: { otp: otp.trim() }
      });
      showToast.success(data.message);
      setOtpSent(false);
      setSecondaryEmail('');
      setOtp('');
      if (onUpdate) onUpdate(data.user);
    } catch (err) {
      // handled
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      {isDisabled && (
        <Alert type="error" title="Profile Editing Disabled">
          You are currently marked as not eligible for the internship cycle. Profile editing is disabled until the criteria are met or the Internship Office intervenes.
        </Alert>
      )}
      {isPendingSetup && (
        <Alert type="warning" title="Complete Your Profile to Unlock the Internship Workflow">
          You meet all academic eligibility requirements! Fill in your Father&apos;s Name, Section, Date of Birth, and upload a Profile Picture to proceed to Phase 2.
        </Alert>
      )}

      <Card title="Edit My Profile" subtitle="Update your personal details and profile picture">
        <div className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-32 h-32 rounded-2xl bg-white border shadow-sm overflow-hidden flex items-center justify-center mb-4 relative group">
              {form.profilePicture ? (
                <img src={form.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-user-plus text-4xl text-gray-200"></i>
              )}
              <label className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity ${isDisabled ? 'cursor-not-allowed hidden' : 'cursor-pointer'}`}>
                <i className="fas fa-camera text-white text-xl"></i>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isDisabled} />
              </label>
            </div>
            <p className="text-xs text-gray-400 font-medium">Click image to upload profile photo (Mandatory)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup label="Father's Name">
              <TextInput
                iconLeft="fa-user-tie"
                placeholder="Enter father's name"
                value={form.fatherName}
                onChange={e => {
                  const val = e.target.value;
                  if (/\d/.test(val)) { showToast.error("Father's Name cannot contain numbers"); return; }
                  setForm({ ...form, fatherName: val });
                }}
                disabled={isDisabled}
              />
            </FormGroup>

            <FormGroup label="Current Section">
              <TextInput
                iconLeft="fa-users-rectangle"
                placeholder="e.g. A, B, C"
                value={form.section}
                onChange={e => {
                  const val = e.target.value.toUpperCase().replace(/[^A-D]/g, '').slice(0, 1);
                  setForm({ ...form, section: val });
                }}
                disabled={isDisabled}
              />
            </FormGroup>

            <FormGroup label="Date of Birth">
              <TextInput
                type="date"
                iconLeft="fa-cake-candles"
                value={form.dateOfBirth}
                onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                disabled={isDisabled}
              />
            </FormGroup>

            <FormGroup label="Registration Number">
              <TextInput
                iconLeft="fa-id-card"
                value={user.reg}
                readOnly
                className="bg-gray-100 cursor-not-allowed opacity-75 font-bold"
              />
              <p className="text-[10px] text-gray-400 mt-1 italic">Read-only field derived from email</p>
            </FormGroup>

            <FormGroup label="WhatsApp/Mobile Number">
              <TextInput
                iconLeft="fa-phone"
                placeholder="+92..."
                value={form.whatsappNumber}
                onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                disabled={isDisabled}
              />
              <p className="text-[10px] text-gray-400 mt-1 italic">Primary contact for supervisors</p>
            </FormGroup>
          </div>

          {/* Contact & Security */}
          <div className="pt-6 border-t mt-4">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Contact &amp; Security</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormGroup label="Affiliated University Email">
                <TextInput
                  iconLeft="fa-university"
                  value={user.email}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed opacity-80 font-bold text-gray-600"
                />
                <p className="text-[10px] text-gray-400 mt-1 italic font-medium">Primary institutional account (Permanent)</p>
              </FormGroup>

              {/* Secondary Email — OTP Flow */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    Secondary Email
                    {user.secondaryEmail && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase tracking-tighter border border-emerald-200 shadow-sm">
                        <i className="fas fa-lock mr-1"></i> Verified
                      </span>
                    )}
                  </label>
                </div>

                {user.secondaryEmail ? (
                  <>
                    <TextInput
                      iconLeft="fa-envelope"
                      value={user.secondaryEmail}
                      readOnly
                      className="bg-slate-100/80 cursor-not-allowed opacity-90 font-bold text-gray-700 border-slate-200"
                    />
                    <p className="text-[10px] text-gray-400 mt-2 italic font-medium leading-relaxed">
                      Registered for dual-access and OTP recovery. Cannot be modified for security reasons.
                    </p>
                  </>
                ) : !otpSent ? (
                  <>
                    <div className="flex gap-2">
                      <TextInput
                        iconLeft="fa-envelope"
                        placeholder="your.personal@gmail.com"
                        type="email"
                        value={secondaryEmail}
                        onChange={e => setSecondaryEmail(e.target.value)}
                        disabled={isDisabled}
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2 w-full text-xs py-2"
                      onClick={handleSendOtp}
                      disabled={isDisabled || otpLoading || !secondaryEmail.trim()}
                    >
                      {otpLoading
                        ? <><i className="fas fa-circle-notch fa-spin mr-2"></i>Sending Code...</>
                        : <><i className="fas fa-paper-plane mr-2"></i>Send Verification Code</>}
                    </Button>
                    <p className="text-[10px] text-gray-400 mt-2 italic leading-relaxed">
                      A 6-digit code will be sent to verify this email. Can only be set once.
                    </p>
                  </>
                ) : (
                  <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                      <i className="fas fa-envelope-open-text"></i>
                      Code sent to <span className="text-emerald-800 font-black">{secondaryEmail}</span>
                    </div>
                    <TextInput
                      iconLeft="fa-key"
                      placeholder="000000"
                      className="text-center text-xl tracking-[1em] font-black"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleConfirmOtp}
                        disabled={confirmLoading || otp.length < 6}
                      >
                        {confirmLoading
                          ? <><i className="fas fa-circle-notch fa-spin mr-2"></i>Confirming...</>
                          : <><i className="fas fa-check-circle mr-2"></i>Confirm &amp; Link</>}
                      </Button>
                      <button
                        className="text-xs text-gray-400 hover:text-gray-600 font-medium px-3 border border-gray-200 rounded-lg transition-colors bg-white"
                        onClick={() => { setOtpSent(false); setOtp(''); }}
                      >
                        <i className="fas fa-arrow-left mr-1"></i>Back
                      </button>
                    </div>
                    <button
                      className="text-[10px] text-emerald-600 hover:underline w-full text-center font-medium"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                    >
                      {otpLoading ? 'Resending...' : 'Resend code'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Password Change */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-4 border-t border-dashed">
              <FormGroup label="New Password">
                <TextInput
                  type={showPw ? 'text' : 'password'}
                  iconLeft="fa-lock"
                  iconRight={showPw ? 'fa-eye-slash' : 'fa-eye'}
                  onToggleRight={() => setShowPw(!showPw)}
                  placeholder="••••••••"
                  value={form.newPassword}
                  onChange={e => setForm({ ...form, newPassword: e.target.value })}
                  disabled={isDisabled}
                />
                <p className="text-[10px] text-gray-400 mt-1 italic">Leave blank to keep current password</p>
              </FormGroup>
              <FormGroup label="Confirm Password">
                <TextInput
                  type={showConfirmPw ? 'text' : 'password'}
                  iconLeft="fa-shield"
                  iconRight={showConfirmPw ? 'fa-eye-slash' : 'fa-eye'}
                  onToggleRight={() => setShowConfirmPw(!showConfirmPw)}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  disabled={isDisabled}
                />
              </FormGroup>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="primary" onClick={handleSave} disabled={loading || isDisabled}>
              {loading ? <><i className="fas fa-circle-notch fa-spin mr-2"></i>Saving...</> : <><i className="fas fa-save mr-2"></i>Save Changes</>}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
