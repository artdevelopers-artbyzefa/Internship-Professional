import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function StudentAssignments({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'submitted'
  const [activeModal, setActiveModal] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  const pendingAssignments = assignments.filter(a => a.submissionStatus !== 'Submitted');
  const submittedAssignments = assignments.filter(a => a.submissionStatus === 'Submitted');

  const currentAssignments = activeTab === 'pending' ? pendingAssignments : submittedAssignments;


  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleDownload = (url, name = 'Document') => {
    if (!url) return;
    const cleanName = name.replace(/[^a-z0-9]/gi, '_');
    const proxyUrl = `${import.meta.env.VITE_API_URL}/auth/download-proxy?url=${encodeURIComponent(url)}&filename=${cleanName}.pdf`;
    window.location.assign(proxyUrl);
  };




  const fetchAssignments = async () => {

    try {
      const data = await apiRequest('/student/assignments');
      setAssignments(data);
    } catch (err) { } finally { setLoading(false); }
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
    if (file.size > 20 * 1024 * 1024) {
      showToast.error("File limit is 20MB.");
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

      showToast.success('Deliverable submitted successfully.');
      fetchAssignments();
    } catch (err) { } finally { setUploadingId(null); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Deliverables Portal</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Submit technical reports and industrial task logs for evaluation.</p>
        </div>
        <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
      </div>

      <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-2xl w-fit border border-gray-100 mb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <i className="fas fa-clock text-[10px]"></i>
          Pending Tasks
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>
            {pendingAssignments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 flex items-center gap-2 ${activeTab === 'submitted' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <i className="fas fa-check-circle text-[10px]"></i>
          Submitted Reports
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'submitted' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
            {submittedAssignments.length}
          </span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 border-b border-gray-100 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Assessment Module</th>
                <th className="px-8 py-4 border-b border-gray-100 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Deadline</th>
                <th className="px-8 py-4 border-b border-gray-100 text-[10px] font-bold tracking-widest text-gray-400 uppercase text-center">Status</th>
                <th className="px-8 py-4 border-b border-gray-100 text-[10px] font-bold tracking-widest text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : currentAssignments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 border-2 border-dashed border-gray-100">
                        <i className={`fas ${activeTab === 'pending' ? 'fa-file-invoice' : 'fa-check-double'} text-xl`}></i>
                      </div>
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                        {activeTab === 'pending' ? 'No Pending Tasks' : 'No Submissions Yet'}
                      </p>
                      <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed">
                        {activeTab === 'pending'
                          ? 'Great job! You have completed all your currently assigned industrial tasks.'
                          : 'Your submitted industrial reports and technical feedback will be archived here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentAssignments.map((a) => (
                  <React.Fragment key={a._id}>
                    <tr className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-sm border ${a.courseTitle?.includes('Industrial') ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-blue-50 text-primary border-blue-100'}`}>
                            <i className={`fas ${a.courseTitle?.includes('Industrial') ? 'fa-briefcase' : 'fa-graduation-cap'}`}></i>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800 leading-none mb-1">{a.title}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Category: {a.courseTitle}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-gray-700">{formatDate(a.deadline)}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-1">Expiry: {formatDate(a.deadline, true).split('at')[1] || '-'}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        {a.submissionStatus === 'Submitted' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-100 uppercase tracking-widest">
                            <i className="fas fa-check-circle"></i> Received
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black border border-amber-100 uppercase tracking-widest">
                            <i className="fas fa-clock"></i> Pending
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {a.fileUrl && (
                            <button
                              onClick={() => handleDownload(a.fileUrl, a.title)}
                              className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-primary rounded-xl border border-gray-100 transition-all hover:bg-white flex items-center justify-center cursor-pointer p-0"
                              title="Download Assignment Description"
                            >
                              <i className="fas fa-file-download text-xs"></i>
                            </button>
                          )}

                          {a.submissionStatus === 'Submitted' ? (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black border border-emerald-100 uppercase tracking-widest">
                              <i className="fas fa-check-circle"></i> Submission Finalized
                            </div>
                          ) : a.status === 'Open' ? (
                            <div className="relative">
                              <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                onChange={(e) => handleFileUpload(a._id, e.target.files[0])}
                                disabled={uploadingId === a._id}
                              />
                              <button className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border-0 shadow-lg shadow-gray-200 cursor-pointer transition-all ${uploadingId === a._id ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-black'}`}>
                                {uploadingId === a._id ? 'Uploading...' : 'Submit Work'}
                              </button>
                            </div>
                          ) : (
                            <span className="px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black border border-rose-100 uppercase tracking-widest opacity-50">CLOSED</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {a.marks && (a.marks.siteSupervisorRemarks || a.marks.facultyRemarks) && (
                      <tr className="bg-gray-50/20">
                        <td colSpan="5" className="px-8 py-3">
                          <div className="flex flex-col gap-2">
                            {a.marks.siteSupervisorRemarks && (
                              <div className="flex items-start gap-2">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Mentor:</span>
                                <p className="text-[10px] text-gray-500 italic font-medium leading-relaxed">"{a.marks.siteSupervisorRemarks}"</p>
                              </div>
                            )}
                            {a.marks.facultyRemarks && (
                              <div className="flex items-start gap-2">
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Faculty:</span>
                                <p className="text-[10px] text-gray-500 italic font-medium leading-relaxed">"{a.marks.facultyRemarks}"</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

