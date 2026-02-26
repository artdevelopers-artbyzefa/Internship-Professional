import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function StudentAssignments({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const data = await apiRequest('/student/assignments');
      setAssignments(data);
    } catch (err) {}
  };

  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return date.toLocaleString('en-GB', options);
  };

  const handleFileUpload = async (assignmentId, file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast.error("File is too large! Maximum limit is 10MB.");
      return;
    }

    setUploadingId(assignmentId);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await apiRequest(`/student/submit-assignment/${assignmentId}`, {
        method: 'POST',
        body: formData
      });

      showToast.success('Assignment submitted successfully');
      fetchAssignments(); // Refresh data
    } catch (err) {
      // apiRequest handles errors
    } finally {
      setUploadingId(null);
    }
  };

  const handleDownload = async (fileUrl, fileName) => {
    try {
        const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
        const response = await fetch(`${baseUrl}${fileUrl}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || fileUrl.split('/').pop();
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        showToast.error('Failed to download file');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Assignment Submissions</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Submit your monthly reports and technical evaluations for review.</p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400 w-12">#</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Course Title</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Title</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Start-Date</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">DeadLine</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Submission</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Download</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Submit</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-400 italic">
                    No assignments found from your faculty supervisor.
                  </td>
                </tr>
              ) : (
                assignments.map((a, idx) => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-bold text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-semibold text-gray-700">{a.courseTitle}</td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-bold text-gray-900">{a.title}</td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-medium text-gray-600">{formatDate(a.startDate)}</td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-medium text-gray-600">{formatDate(a.deadline, true)}</td>
                    <td className="px-6 py-4 border-b border-gray-100">
                      <span className={`text-[11px] font-black tracking-wider ${a.submissionStatus === 'Submitted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {a.submissionStatus}
                      </span>
                      {a.submissionDate && <div className="text-[10px] text-gray-400 font-medium">{formatDate(a.submissionDate)}</div>}
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100">
                      <span className={`text-[11px] font-black tracking-wider ${a.status === 'Open' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100">
                      {a.fileUrl ? (
                         <button 
                           onClick={() => handleDownload(a.fileUrl, a.title)}
                           className="text-secondary text-sm font-bold hover:underline border-0 bg-transparent cursor-pointer p-0"
                         >
                           Download
                         </button>
                      ) : (
                        <span className="text-gray-300 text-sm font-bold">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100">
                      {a.status === 'Open' ? (
                        <div className="relative">
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer w-[100px]"
                            onChange={(e) => handleFileUpload(a._id, e.target.files[0])}
                            disabled={uploadingId === a._id}
                          />
                          <button className={`text-secondary text-sm font-black tracking-wider hover:underline transition-all ${uploadingId === a._id ? 'opacity-50' : ''}`}>
                            {uploadingId === a._id ? 'Uploading...' : 'Upload File'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm font-black tracking-wider cursor-not-allowed">Closed</span>
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
