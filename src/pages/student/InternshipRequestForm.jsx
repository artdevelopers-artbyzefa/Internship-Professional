import React, { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { FormGroup, TextInput, SelectInput, TextareaInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { apiRequest } from '../../utils/api.js';

export default function InternshipRequestForm({ user }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    internshipType: 'Self',
    companyName: '',
    duration: '6 Weeks',
    startDate: '',
    endDate: '',
    mode: 'Onsite',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await apiRequest('/student/submit-request', {
        method: 'POST',
        body: { userId: user.id || user._id, ...form }
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user.status === 'Internship Request Submitted' || success) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <i className="fas fa-clock-rotate-left animate-spin-slow"></i>
        </div>
        <h2 className="text-2xl font-black text-gray-800 tracking-tight mb-2">Request Under Review</h2>
        <p className="text-gray-500 text-sm">
          Your internship form has been submitted successfully. 
          Please wait for approval from the Internship Office.
        </p>
        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left border border-dashed border-gray-200">
          <h4 className="text-xs font-bold text-gray-400 tracking-widest mb-2">Workflow Status</h4>
          <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
            <i className="fas fa-circle-dot animate-pulse"></i>
            Waiting for Internship Office Decision
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Internship Approval Request</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Provide details about your planned internship for institutional approval (AppEx-A).</p>
        </div>
      </div>

      {error && <Alert type="danger" className="mb-6">{error}</Alert>}
      {user.status === 'Internship Rejected' && (
        <Alert type="danger" title="Previous Request Rejected" className="mb-6">
          Reason: {user.internshipRequest?.rejectionReason || 'Not specified'}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormGroup label="Internship Type">
            <SelectInput 
              value={form.internshipType} 
              onChange={e => setForm({...form, internshipType: e.target.value})}
              iconLeft="fa-building-columns"
            >
              <option value="Self">Self Arranged</option>
              <option value="University Assigned">University Assigned</option>
            </SelectInput>
          </FormGroup>

          {form.internshipType === 'Self' && (
            <FormGroup label="Company Name">
              <TextInput 
                placeholder="Name of the organization"
                value={form.companyName}
                onChange={e => setForm({...form, companyName: e.target.value})}
                iconLeft="fa-building"
                required
              />
            </FormGroup>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormGroup label="Internship Duration">
            <SelectInput 
              value={form.duration} 
              onChange={e => setForm({...form, duration: e.target.value})}
              iconLeft="fa-calendar-day"
            >
              <option value="4 Weeks">4 Weeks</option>
              <option value="6 Weeks">6 Weeks</option>
              <option value="8 Weeks">8 Weeks</option>
              <option value="Above 8 Weeks">Above 8 Weeks</option>
            </SelectInput>
          </FormGroup>

          <FormGroup label="Start Date">
            <TextInput 
              type="date"
              value={form.startDate}
              onChange={e => setForm({...form, startDate: e.target.value})}
              required
            />
          </FormGroup>

          <FormGroup label="End Date">
            <TextInput 
              type="date"
              value={form.endDate}
              onChange={e => setForm({...form, endDate: e.target.value})}
              required
            />
          </FormGroup>
        </div>

        <FormGroup label="Internship Mode">
          <div className="flex flex-wrap gap-3">
            {['Onsite', 'Remote', 'Hybrid', 'Freelance'].map(m => (
              <label key={m} className={`
                flex-1 min-w-[120px] p-3 border rounded-xl cursor-pointer text-center transition-all
                ${form.mode === m ? 'border-secondary bg-blue-50 text-secondary font-bold' : 'border-gray-200 text-gray-500 hover:border-gray-300'}
              `}>
                <input 
                  type="radio" 
                  name="mode" 
                  className="hidden" 
                  checked={form.mode === m}
                  onChange={() => setForm({...form, mode: m})}
                />
                {m}
              </label>
            ))}
          </div>
        </FormGroup>

        <FormGroup label="Description of Internship / Roles">
          <TextareaInput 
            placeholder="Briefly describe what you will be doing during this internship..."
            rows={4}
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />
        </FormGroup>

        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" loading={loading} className="px-10">
            Submit Request <i className="fas fa-paper-plane ml-2"></i>
          </Button>
        </div>
      </form>
    </div>
  );
}
