import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextInput, SelectInput } from '../../components/ui/FormInput.jsx';

export default function ManageAssignments({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    deadline: '',
    totalMarks: 100,
    status: 'Active'
  });

  const [overrideForm, setOverrideForm] = useState({
    assignmentId: '',
    facultyId: '',
    newDeadline: ''
  });

  const [editingAssignment, setEditingAssignment] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignData, facData] = await Promise.all([
        apiRequest('/office/assignments'),
        apiRequest('/auth/faculty-list')
      ]);
      setAssignments(assignData);
      setFaculty(facData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/office/create-assignment', {
        method: 'POST',
        body: { 
          ...form, 
          // Ensure startDate and deadline are sent correctly as date objects if needed, 
          // or just string ISO from datetime-local
          officeId: user.id || user._id 
        }
      });
      setShowAddModal(false);
      setForm({ title: '', description: '', startDate: '', deadline: '', totalMarks: 100, status: 'Active' });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest(`/office/update-assignment/${editingAssignment._id}`, {
        method: 'PUT',
        body: { ...form, officeId: user.id || user._id }
      });
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyOverride = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
        await apiRequest('/office/override-deadline', {
            method: 'POST',
            body: { ...overrideForm, officeId: user.id || user._id }
        });
        setShowOverrideModal(false);
        setOverrideForm({ assignmentId: '', facultyId: '', newDeadline: '' });
        fetchData();
    } catch (err) {
        alert(err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Assignment Title' },
    { key: 'totalMarks', label: 'Total Marks', render: (val) => <span className="font-bold text-primary">{val}</span> },
    { 
      key: 'startDate', 
      label: 'Scheduled Start',
      render: (val) => new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    },
    { 
      key: 'deadline', 
      label: 'Global Deadline',
      render: (val) => (
        <span className="font-bold text-gray-700">
            {new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          val === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button 
            size="sm" variant="outline" 
            onClick={() => {
                setOverrideForm({ ...overrideForm, assignmentId: row._id });
                setShowOverrideModal(true);
            }}
            className="text-[10px] py-1 h-8"
          >
            <i className="fas fa-clock mr-1"></i> Override
          </Button>
          <button 
            onClick={() => {
                setEditingAssignment(row);
                setForm({
                    title: row.title,
                    description: row.description || '',
                    startDate: new Date(row.startDate).toISOString().slice(0, 16),
                    deadline: new Date(row.deadline).toISOString().slice(0, 16),
                    totalMarks: row.totalMarks || 100,
                    status: row.status
                });
                setShowEditModal(true);
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary cursor-pointer transition-all"
          >
            <i className="fas fa-pen-to-square text-xs"></i>
          </button>
        </div>
      )
    }
  ];

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Assignment Management</h2>
          <p className="text-sm text-gray-500 font-medium">Create and regulate academic evaluations for Internship.</p>
        </div>
        <Button variant="primary" onClick={() => {
            setForm({ title: '', description: '', startDate: '', deadline: '', totalMarks: 100, status: 'Active' });
            setShowAddModal(true);
        }}>
          <i className="fas fa-plus mr-2"></i> Create Assignment
        </Button>
      </div>

      {error && <Alert type="danger" className="mb-4">{error}</Alert>}

      <DataTable columns={columns} data={assignments} />

      {/* Create Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <ModalTitle>New Assignment</ModalTitle>
          <ModalSub>Define evaluation criteria and precise deadline (PKT)</ModalSub>

          <form onSubmit={handleCreate} className="mt-6 space-y-5">
            <FormGroup label="Assignment Title">
              <TextInput required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Monthly Report - June" />
            </FormGroup>
            
            <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Start Date & Time">
                    <TextInput type="datetime-local" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </FormGroup>
                <FormGroup label="Deadline Date & Time">
                    <TextInput type="datetime-local" required value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Total Marks">
                    <TextInput type="number" required value={form.totalMarks} onChange={e => setForm({...form, totalMarks: Number(e.target.value)})} placeholder="100" />
                </FormGroup>
            </div>

            <FormGroup label="Description (Optional)">
              <TextInput value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Instructions for supervisors..." />
            </FormGroup>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" block onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" block type="submit" loading={submitting}>Create Globally</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)}>
          <ModalTitle>Update Assignment</ModalTitle>
          <ModalSub>Modify details or global timeline (PKT)</ModalSub>

          <form onSubmit={handleUpdate} className="mt-6 space-y-5">
            <FormGroup label="Assignment Title">
              <TextInput required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </FormGroup>
            
            <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Start Date & Time">
                    <TextInput type="datetime-local" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </FormGroup>
                <FormGroup label="Deadline Date & Time">
                    <TextInput type="datetime-local" required value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Total Marks">
                    <TextInput type="number" required value={form.totalMarks} onChange={e => setForm({...form, totalMarks: Number(e.target.value)})} />
                </FormGroup>
                <FormGroup label="Status">
                    <SelectInput value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </SelectInput>
                </FormGroup>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" block onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" block type="submit" loading={submitting}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <Modal onClose={() => setShowOverrideModal(false)}>
          <ModalTitle>Deadline Override</ModalTitle>
          <ModalSub>Grant extra time to a specific Faculty Supervisor (PKT)</ModalSub>

          <form onSubmit={handleApplyOverride} className="mt-6 space-y-5">
            <FormGroup label="Select Faculty Advisor">
                <SelectInput required value={overrideForm.facultyId} onChange={e => setOverrideForm({...overrideForm, facultyId: e.target.value})}>
                    <option value="">Choose Supervisor...</option>
                    {faculty.map(f => <option key={f._id} value={f._id}>{f.name} ({f.email})</option>)}
                </SelectInput>
            </FormGroup>

            <FormGroup label="Extension Date & Time">
              <TextInput type="datetime-local" required value={overrideForm.newDeadline} onChange={e => setOverrideForm({...overrideForm, newDeadline: e.target.value})} />
            </FormGroup>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" block onClick={() => setShowOverrideModal(false)}>Cancel</Button>
              <Button variant="primary" block type="submit" loading={submitting}>Apply Override</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
