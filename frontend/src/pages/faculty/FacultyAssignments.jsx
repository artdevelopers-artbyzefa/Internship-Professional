import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function FacultyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const data = await apiRequest('/faculty/my-created-assignments');
      setAssignments(data);
      if (data.length > 0) {
        setSelectedId(data[0]._id);
      }
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  useEffect(() => {
    if (selectedId) {
      fetchSubmissions();
    } else {
      setStudents([]);
    }
  }, [selectedId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/faculty/assignment-submissions/${selectedId}`);
      setStudents(data);
      setSelectedStudents([]); // Reset selection
    } catch (err) {
      // Error handled by apiRequest
    }
    finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(students.filter(s => s.submissionId).map(s => s.submissionId));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleSelect = (submissionId) => {
    setSelectedStudents(prev =>
      prev.includes(submissionId)
        ? prev.filter(id => id !== submissionId)
        : [...prev, submissionId]
    );
  };

  const handleDownload = async (fileUrl, reg, name) => {
    if (!fileUrl) return;
    try {
      const isFullUrl = fileUrl.startsWith('http');
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
      const targetUrl = isFullUrl ? fileUrl : `${baseUrl}${fileUrl}`;

      const blob = await apiRequest(targetUrl, { 
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = fileUrl.split('.').pop();
      a.download = `${reg}-${name.replace(/\s+/g, '_')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  const handleBulkDownload = async () => {
    if (selectedStudents.length === 0) {
      showToast.error('Please select at least one submission');
      return;
    }

    try {
      const blob = await apiRequest('/faculty/bulk-download-submissions', {
        method: 'POST',
        body: { submissionIds: selectedStudents },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student Submissions</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Review and download reports submitted by your assigned interns.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-secondary/20 outline-none min-w-[240px] appearance-none"
          >
            <option value="">Choose Assignment...</option>
            {assignments.map(a => (
              <option key={a._id} value={a._id}>{a.title}</option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={fetchSubmissions}
            disabled={!selectedId || loading}
            className="p-2.5"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs font-black tracking-widest text-gray-400">Student Submissions</div>
          {selectedStudents.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkDownload}
              className="bg-secondary hover:bg-blue-700 shadow-md shadow-blue-600/20"
            >
              <i className="fas fa-file-zipper mr-2"></i>
              Download Selected ({selectedStudents.length})
            </Button>
          )}
        </div>

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 border-y border-gray-100 w-12">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={students.length > 0 && selectedStudents.length === students.filter(s => s.submissionId).length && students.filter(s => s.submissionId).length > 0}
                    className="rounded border-gray-300 text-secondary focus:ring-secondary cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400 w-16">Sr.</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Reg No.</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Name</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Submitted</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">
                    {loading ? 'Loading submissions...' : 'No students assigned or no assignment selected.'}
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 border-b border-gray-100">
                      <input
                        type="checkbox"
                        disabled={!student.submissionId}
                        checked={!!student.submissionId && selectedStudents.includes(student.submissionId)}
                        onChange={() => toggleSelect(student.submissionId)}
                        className={`rounded border-gray-300 text-secondary focus:ring-secondary ${!student.submissionId ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-bold text-gray-600">{idx + 1}</td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-bold text-gray-700">{student.reg}</td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-bold text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm text-gray-500 font-medium">
                      {student.submittedAt ? new Date(student.submittedAt).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider
                        ${student.status === 'Submitted'
                          ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                          : 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'}`}>
                        <i className={`fas ${student.status === 'Submitted' ? 'fa-circle-check' : 'fa-clock'} mr-1.5`}></i>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100 text-right">
                      {student.fileUrl && (
                        <button
                          onClick={() => handleDownload(student.fileUrl, student.reg, student.name)}
                          className="w-8 h-8 rounded-lg bg-lightbg text-secondary flex items-center justify-center hover:bg-secondary hover:text-white transition-all ml-auto border-0 cursor-pointer"
                          title="Download Submission"
                        >
                          <i className="fas fa-file-download text-sm"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
