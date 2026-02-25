import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { SelectInput } from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';

export default function AssignedStudents() {
  const [students, setStudents] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignedData, facData] = await Promise.all([
        apiRequest('/office/assigned-students'),
        apiRequest('/auth/faculty-list')
      ]);
      setStudents(assignedData);
      setFacultyList(facData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = facultyFilter === 'all' 
    ? students 
    : students.filter(s => s.assignedFaculty?._id === facultyFilter);

  const columns = [
    { key: 'reg', label: 'Reg #' },
    { key: 'name', label: 'Name' },
    { key: 'semester', label: 'Sem' },
    { 
      key: 'assignedCompany', 
      label: 'Placement Details',
      render: (val, row) => (
        <div className="text-[11px] space-y-0.5">
          <p className="font-bold text-gray-800 uppercase">{val}</p>
          <div className="flex items-center text-gray-400 gap-1.5 font-medium">
             <i className="fas fa-building text-[9px]"></i>
             <span>{row.internshipRequest?.type || 'N/A'} Internship</span>
          </div>
        </div>
      )
    },
    { 
      key: 'assignedCompanySupervisor', 
      label: 'Site Supervisor',
      render: (val) => (
        <span className="text-xs font-semibold text-gray-700 bg-blue-50/50 px-2 py-1 rounded-md border border-blue-100 flex items-center w-fit">
          <i className="fas fa-user-tie mr-1.5 text-blue-400 text-[10px]"></i>
          {val}
        </span>
      )
    },
    { 
      key: 'assignedFaculty', 
      label: 'Faculty Advisor',
      render: (val) => (
        <span className="text-xs font-bold text-primary flex items-center">
          <i className="fas fa-chalkboard-user mr-1.5 text-[10px]"></i>
          {val?.name || 'Unassigned'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Final Status',
      render: (val) => (
        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full uppercase tracking-tighter border border-indigo-100 shadow-sm inline-block">
          <i className="fas fa-award mr-1"></i> {val}
        </span>
      )
    }
  ];

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 transition-all hover:shadow-2xl hover:shadow-gray-200/60">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-50">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Assigned Internships</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Registry of students with confirmed supervisor and company placements.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Filter By Advisor:</label>
          <SelectInput 
            className="text-xs font-bold py-2 min-w-[220px]"
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
          >
            <option value="all">All Advisors</option>
            {facultyList.map(f => (
              <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </SelectInput>
          <Button variant="outline" size="sm" onClick={() => fetchData()} className="p-2.5">
            <i className="fas fa-sync-alt"></i>
          </Button>
        </div>
      </div>

      {error && <Alert type="danger" className="mb-6">{error}</Alert>}
      
      {filteredStudents.length === 0 ? (
        <div className="text-center py-24 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100 text-gray-400">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 border border-gray-50">
            <i className="fas fa-users-slash text-3xl"></i>
          </div>
          <p className="font-bold text-gray-800">No assigned students found</p>
          <p className="text-sm mt-1">Try changing the filter or assigning new students.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredStudents} />
      )}
    </div>
  );
}
