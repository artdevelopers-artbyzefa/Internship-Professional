import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import { SelectInput, TextInput } from '../../components/ui/FormInput.jsx';

export default function AddMarks({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
        fetchStudents();
    }
  }, [selectedAssignmentId]);

  const fetchAssignments = async () => {
    try {
      const data = await apiRequest('/faculty/assignments');
      setAssignments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/faculty/assignment-students/${selectedAssignmentId}`);
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMarks = (studentId, val) => {
      setStudents(prev => prev.map(s => s._id === studentId ? { ...s, marks: val } : s));
  };

  const handleSaveAll = async () => {
    // Confirmation
    if (!window.confirm('Are you sure you want to save all marks?')) return;

    setSubmitting(true);
    try {
        const marksData = students
            .filter(s => s.marks !== null && s.marks !== '')
            .map(s => ({
                studentId: s._id,
                marks: Number(s.marks)
            }));

        if (marksData.length === 0) {
            alert('No marks entered to save.');
            setSubmitting(false);
            return;
        }

        await apiRequest('/faculty/bulk-submit-marks', {
            method: 'POST',
            body: {
                assignmentId: selectedAssignmentId,
                marksData
            }
        });
        alert('All marks saved successfully.');
        fetchStudents();
    } catch (err) {
        alert(err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const selectedAssignment = assignments.find(a => a._id === selectedAssignmentId);
  const deadlinePassed = selectedAssignment ? new Date() > new Date(selectedAssignment.effectiveDeadline) : false;

  const columns = [
    { key: 'reg', label: 'Reg #' },
    { key: 'name', label: 'Student Name' },
    { key: 'semester', label: 'Sem' },
    { 
        key: 'marks', 
        label: `Marks (Max: ${selectedAssignment?.totalMarks || 100})`,
        render: (val, row) => (
            <div className="flex flex-col items-center">
                <TextInput 
                    type="number"
                    max={selectedAssignment?.totalMarks || 100}
                    value={val ?? ''}
                    onChange={(e) => handleUpdateMarks(row._id, e.target.value)}
                    disabled={deadlinePassed}
                    placeholder="00"
                    className={`w-20 text-center font-bold ${Number(val) > (selectedAssignment?.totalMarks || 100) ? 'border-red-500 text-red-600 bg-red-50' : ''}`}
                />
                {Number(val) > (selectedAssignment?.totalMarks || 100) && (
                    <span className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">Exceeds Max</span>
                )}
            </div>
        )
    },
    {
        key: 'lastUpdated',
        label: 'Last Modified',
        render: (val) => val ? (
            <div className="text-[10px] text-gray-400 font-medium">
                <i className="fas fa-clock mr-1"></i>
                {new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
        ) : <span className="text-[10px] text-gray-300 italic">No record</span>
    }
  ];

  const anyMarksExist = students.some(s => s.markId);
  const totalEnteredMarksValid = students.every(s => !s.marks || Number(s.marks) <= (selectedAssignment?.totalMarks || 100));

  if (loading && assignments.length === 0) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-50">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Academic Evaluation</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Submit marks for all assigned students at once.</p>
        </div>

        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Select Task:</label>
            <SelectInput 
                className="text-xs font-bold py-2 min-w-[200px]"
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
            >
                <option value="">Choose Assignment...</option>
                {assignments.map(a => (
                    <option key={a._id} value={a._id}>{a.title}</option>
                ))}
            </SelectInput>
        </div>
      </div>

      {!selectedAssignmentId ? (
          <div className="text-center py-20 text-gray-400 font-medium bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
              <i className="fas fa-arrow-pointer text-4xl mb-4"></i>
              <p>Please select an assignment from the dropdown to start grading.</p>
          </div>
      ) : (
          <>
            {selectedAssignment && (
                <div className={`mb-8 p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        deadlinePassed 
                        ? 'bg-red-50 border-red-100 text-red-600' 
                        : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                }`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                            deadlinePassed ? 'bg-white text-red-500' : 'bg-white text-indigo-500'
                        }`}>
                            <i className={`fas ${deadlinePassed ? 'fa-lock' : 'fa-calendar-check'} text-xl`}></i>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-widest opacity-70">
                                {selectedAssignment.title} (Weight: {selectedAssignment.totalMarks})
                            </p>
                            <h3 className="text-lg font-black tracking-tight leading-none mt-1">
                                {deadlinePassed 
                                    ? 'Deadline Passed – Editing Locked' 
                                    : `Window: ${new Date(selectedAssignment.startDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })} - ${new Date(selectedAssignment.effectiveDeadline).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}`
                                }
                            </h3>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {selectedAssignment.isOverridden && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full uppercase border border-amber-200">
                                <i className="fas fa-bolt mr-1"></i> Individual Extension Active
                            </span>
                        )}
                        {deadlinePassed && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-[9px] font-black rounded-full uppercase border border-red-200">
                                System Locked
                            </span>
                        )}
                    </div>
                </div>
            )}

            {error && <Alert type="danger" className="mb-6">{error}</Alert>}
            
            {loading ? (
                <div className="text-center py-20"><i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i></div>
            ) : students.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-medium bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
                    <i className="fas fa-user-slash text-4xl mb-4"></i>
                    <p>No students assigned to you for evaluation.</p>
                </div>
            ) : (
                <>
                    <DataTable columns={columns} data={students} />
                    
                    {!deadlinePassed && (
                        <div className="mt-10 flex flex-col items-center">
                            <Button 
                                variant="primary" 
                                size="lg" 
                                className={`px-12 py-4 rounded-2xl shadow-xl ${totalEnteredMarksValid ? 'shadow-primary/20' : 'opacity-50 cursor-not-allowed'}`}
                                onClick={totalEnteredMarksValid ? handleSaveAll : null}
                                loading={submitting}
                            >
                                <i className={`fas ${anyMarksExist ? 'fa-rotate' : 'fa-cloud-arrow-up'} mr-3`}></i> 
                                {anyMarksExist ? 'Update Marks' : 'Save Marks'}
                            </Button>
                        </div>
                    )}
                </>
            )}
          </>
      )}
    </div>
  );
}
