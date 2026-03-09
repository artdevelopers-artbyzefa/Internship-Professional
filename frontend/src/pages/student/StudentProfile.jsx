import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

import Alert from '../../components/ui/Alert.jsx';

export default function StudentProfile({ user, onUpdate, isEligible, isPhase1, isPendingSetup }) {
  // Disabled ONLY when student genuinely failed hard criteria (semester/CGPA/registration/email)
  // Never disabled for pending-setup students — they NEED to edit to complete onboarding
  const isDisabled = isPhase1 && !isEligible && !isPendingSetup;
  const [form, setForm] = useState({
    fatherName: user.fatherName || '',
    section: user.section || '',
    secondaryEmail: user.secondaryEmail || '',
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    profilePicture: user.profilePicture || '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 1MB limit for quick UI feedback, though server now supports more
      if (file.size > 1.5 * 1024 * 1024) {
        showToast.error('File is too large! Please upload a photo smaller than 1.5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, profilePicture: reader.result });
      };
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
      setForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' })); // Clear passwords
      if (onUpdate) onUpdate(data.user);
    } catch (err) {
      // showToast.error(err.message); // apiRequest already handles this
    } finally {
      setLoading(false);
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
                onChange={e => setForm({ ...form, fatherName: e.target.value })}
                disabled={isDisabled}
              />
            </FormGroup>

            <FormGroup label="Current Section">
              <TextInput
                iconLeft="fa-users-rectangle"
                placeholder="e.g. A, B, C"
                value={form.section}
                onChange={e => setForm({ ...form, section: e.target.value })}
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
          </div>

          <div className="pt-6 border-t mt-4">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Contact & Security</h4>

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

              <FormGroup label="Secondary Email (Alternative Login)">
                <TextInput
                  iconLeft="fa-envelope"
                  placeholder="personal.email@gmail.com"
                  name="secondaryEmail"
                  value={form.secondaryEmail}
                  onChange={e => setForm({ ...form, secondaryEmail: e.target.value })}
                  disabled={isDisabled || !!user.secondaryEmail}
                  className={user.secondaryEmail ? 'bg-gray-100 cursor-not-allowed opacity-80 font-bold text-gray-600' : ''}
                />
                <p className="text-[10px] text-gray-400 mt-1 italic font-medium">
                  {user.secondaryEmail
                    ? 'Successfully registered and verified for alternative access.'
                    : 'Add a personal email for OTP recovery only once.'}
                </p>
              </FormGroup>
            </div>

            {!user.secondaryEmail && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-4 border-t border-dashed">
                <FormGroup label="New Password">
                  <TextInput
                    type="password"
                    iconLeft="fa-lock"
                    placeholder="••••••••"
                    value={form.newPassword}
                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                    disabled={isDisabled}
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">Leave blank if you don't want to change</p>
                </FormGroup>
                <FormGroup label="Confirm Password">
                  <TextInput
                    type="password"
                    iconLeft="fa-shield"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    disabled={isDisabled}
                  />
                </FormGroup>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="primary" onClick={handleSave} disabled={loading || isDisabled}>
              {loading ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Saving...</> : <><i className="fas fa-save mr-2"></i> Save Changes</>}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
