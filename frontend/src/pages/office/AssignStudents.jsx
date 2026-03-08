import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import { SelectInput, TextInput } from '../../components/ui/FormInput.jsx';

export default function AssignStudents({ user }) {
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [mouCompanies, setMouCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(null);
  
  // Assignment form state per row (locally tracked)
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stuData, facData, compData] = await Promise.all([
        apiRequest('/office/approved-students'),
        apiRequest('/auth/faculty-list'),
        apiRequest('/office/companies')
      ]);
      setStudents(stuData);
      setFaculty(facData);
      
      // Filter for MOU/Manual companies for assignment pool
      setMouCompanies(compData.filter(c => c.isMOUSigned && c.status === 'Active'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = (stuId, field, value) => {
    setAssignments(prev => {
        const current = prev[stuId] || {};
        // Reset site supervisor if company changes
        if (field === 'companyId') {
            return {
                ...prev,
                [stuId]: { ...current, [field]: value, siteSupervisorIndex: '' }
            };
        }
        return {
            ...prev,
            [stuId]: { ...current, [field]: value }
        };
    });
  };

  const handleAssign = async (student) => {
    const data = assignments[student._id] || {};
    const isSelf = student.internshipRequest?.type === 'Self';

    if (!data.facultyId) return alert('Please select a Faculty Supervisor');

    let payload = {
        studentId: student._id,
        facultyId: data.facultyId,
        officeId: user.id || user._id
    };

    if (isSelf) {
        // For Self: Company and Supervisor are already verified in Agreement
        payload.companyName = student.internshipAgreement.companyName;
        payload.siteSupervisor = {
            name: student.internshipAgreement.companySupervisorName,
            email: student.internshipAgreement.companySupervisorEmail,
            whatsappNumber: student.internshipAgreement.whatsappNumber
        };
    } else {
        // For MOU: Must select from dropdowns
        if (!data.companyId) return alert('Please select an MOU Company');
        if (data.siteSupervisorIndex === '') return alert('Please select a Site Supervisor');

        const company = mouCompanies.find(c => c._id === data.companyId);
        const supervisor = company.siteSupervisors[data.siteSupervisorIndex];

        payload.companyName = company.name;
        payload.siteSupervisor = supervisor;
    }

    setSubmitting(student._id);
    try {
      await apiRequest('/office/assign-student', {
        method: 'POST',
        body: payload
      });
      fetchData();
      // Remove local state for this student
      const newAssigns = { ...assignments };
      delete newAssigns[student._id];
      setAssignments(newAssigns);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const columns = [
    { key: 'reg', label: 'Student Reg' },
    { key: 'name', label: 'Student Name' },
    { 
        key: 'type', 
        label: 'Flow',
        render: (_, row) => (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                row.internshipRequest?.type === 'Self' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
            }`}>
                {row.internshipRequest?.type === 'Self' ? 'Self Arranged' : 'MOU Based'}
            </span>
        )
    },
    {
      key: 'assign_comp',
      label: 'Internship Placement (Company)',
      render: (_, row) => {
        const isSelf = row.internshipRequest?.type === 'Self';
        if (isSelf) {
            return (
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-gray-700">{row.internshipAgreement?.companyName}</p>
                    <span className="text-[9px] text-success italic">Locked (Agreement Approved)</span>
                </div>
            );
        }
        return (
            <SelectInput 
                className="text-[11px] py-1.5 min-w-[150px]"
                value={assignments[row._id]?.companyId || ''}
                onChange={e => handleUpdateAssignment(row._id, 'companyId', e.target.value)}
            >
                <option value="">Select MOU Company</option>
                {mouCompanies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </SelectInput>
        );
      }
    },
    {
      key: 'assign_comp_sup',
      label: 'Site Supervisor',
      render: (_, row) => {
        const isSelf = row.internshipRequest?.type === 'Self';
        if (isSelf) {
            return (
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-gray-700">{row.internshipAgreement?.companySupervisorName}</p>
                    <span className="text-[9px] text-success italic">Locked (Site Confirmed)</span>
                </div>
            );
        }
        
        const selectedCompanyId = assignments[row._id]?.companyId;
        const company = mouCompanies.find(c => c._id === selectedCompanyId);
        
        return (
            <SelectInput 
                className="text-[11px] py-1.5 min-w-[150px]"
                disabled={!selectedCompanyId}
                value={assignments[row._id]?.siteSupervisorIndex ?? ''}
                onChange={e => handleUpdateAssignment(row._id, 'siteSupervisorIndex', e.target.value)}
            >
                <option value="">{selectedCompanyId ? 'Select Supervisor' : 'Select Company First'}</option>
                {company?.siteSupervisors.map((s, idx) => (
                    <option key={idx} value={idx}>{s.name} ({s.email})</option>
                ))}
            </SelectInput>
        );
      }
    },
    {
        key: 'assign_fac',
        label: 'Faculty Supervisor',
        render: (_, row) => (
          <SelectInput 
            className="text-[11px] py-1.5 min-w-[150px]"
            value={assignments[row._id]?.facultyId || ''}
            onChange={e => handleUpdateAssignment(row._id, 'facultyId', e.target.value)}
          >
            <option value="">Select Faculty</option>
            {faculty.filter(f => f.status === 'Active').map(f => (
                <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </SelectInput>
        )
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <Button 
          variant="primary" size="sm" 
          onClick={() => handleAssign(row)}
          loading={submitting === row._id}
          className="whitespace-nowrap rounded-lg"
        >
          Confirm Assignment
        </Button>
      )
    }
  ];

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student Internship Assignment</h2>
        <p className="text-sm text-gray-500">Assign supervisors and finalize placements for both self-arranged and MOU-based internships.</p>
      </div>

      {error && <Alert type="danger" className="mb-4">{error}</Alert>}
      
      {students.length === 0 ? (
        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
            <i className="fas fa-user-check text-2xl text-gray-300"></i>
          </div>
          <p className="font-medium text-gray-500">All students are currently assigned.</p>
          <p className="text-xs mt-1">Pending agreements will appear here once approved.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={students} />
      )}
    </div>
  );
}
