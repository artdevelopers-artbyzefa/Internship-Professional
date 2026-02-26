import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Alert from '../../components/ui/Alert.jsx';

export default function ApprovedStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApproved();
  }, []);

  const fetchApproved = async () => {
    try {
      const data = await apiRequest('/office/approved-students');
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'reg', label: 'Reg #' },
    { key: 'name', label: 'Name' },
    { key: 'semester', label: 'Sem' },
    { 
      key: 'internshipRequest', 
      label: 'Internship Information',
      render: (req) => (
        <div className="text-xs">
          <span className="font-bold text-success">{req?.type}</span> at <span className="font-medium">{req?.companyName}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className="px-3 py-1 bg-green-50 text-success text-[10px] font-bold rounded-full tracking-wider border border-green-100">
          <i className="fas fa-check-circle mr-1"></i> {val}
        </span>
      )
    }
  ];

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Approved Students</h2>
        <p className="text-sm text-gray-500">Students who have passed both Internship and Agreement verification.</p>
      </div>

      {error && <Alert type="danger" className="mb-4">{error}</Alert>}
      
      {students.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed text-gray-400">
          <i className="fas fa-user-check text-4xl mb-3"></i>
          <p>No fully approved students found.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={students} />
      )}
    </div>
  );
}
