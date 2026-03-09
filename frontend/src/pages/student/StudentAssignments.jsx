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
    } catch (err) { }
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
    if (!fileUrl) return;
    try {
      // Check if fileUrl is already a full URL (starts with http)
      const isFullUrl = fileUrl.startsWith('http');
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
      const targetUrl = isFullUrl ? fileUrl : `${baseUrl}${fileUrl}`;

      const response = await fetch(targetUrl, {
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
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
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
                  <td colSpan="9" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4 border-2 border-dashed border-gray-100">
                        <i className="fas fa-file-invoice text-2xl"></i>
                      </div>
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No Active Assignments</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-[240px] leading-relaxed">Your faculty supervisor has not published any tasks yet. New assignments will appear here automatically.</p>
                    </div>
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
                        <div className="relative group/btn">
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            onChange={(e) => handleFileUpload(a._id, e.target.files[0])}
                            disabled={uploadingId === a._id}
                          />
                          <button className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all border-0 cursor-pointer
                            ${uploadingId === a._id
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-indigo-50 text-indigo-600 group-hover/btn:bg-indigo-600 group-hover/btn:text-white group-hover/btn:shadow-lg group-hover/btn:shadow-indigo-500/20'}`}>
                            {uploadingId === a._id ? 'Uploading...' : 'Submit Now'}
                          </button>
                        </div>
                      ) : (
                        <span className="px-3 py-1 bg-gray-50 text-gray-300 text-[9px] font-black tracking-widest uppercase rounded-full border border-gray-100 italic">Closed</span>
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
