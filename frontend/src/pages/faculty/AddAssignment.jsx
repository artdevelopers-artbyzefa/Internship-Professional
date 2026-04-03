import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

export default function AddAssignment({ user }) {
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    deadline: '',
    totalMarks: 100,
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const data = await apiRequest('/faculty/my-created-assignments');
      setAssignments(data);
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const resetForm = () => {
    setForm({ title: '', description: '', startDate: '', deadline: '', totalMarks: 100 });
    setFile(null);
    setEditMode(false);
    setEditingId(null);
    const fileInput = document.getElementById('assignmentFile');
    if (fileInput) fileInput.value = '';
  };

  const handleEdit = (a) => {
    setEditMode(true);
    setEditingId(a._id);

    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (d) => {
      if (!d) return '';
      const date = new Date(d);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setForm({
      title: a.title,
      description: a.description || '',
      startDate: formatDateForInput(a.startDate),
      deadline: formatDateForInput(a.deadline),
      totalMarks: a.totalMarks || 100
    });
    setFile(null); // Keep existing file unless new one is selected
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const confirmed = await showAlert.confirm('Delete Assignment?', 'Are you sure you want to delete this assignment?', 'Yes, Delete');
    if (!confirmed) return;
    try {
      await apiRequest(`/faculty/delete-assignment/${id}`, { method: 'DELETE' });
      showToast.success('Assignment deleted successfully');
      fetchAssignments();
    } catch (err) {
      // Error handled by apiRequest
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !editMode) {
      showToast.error('Please upload an assignment file');
      return;
    }

    if (new Date(form.deadline) < new Date(form.startDate)) {
      showToast.error('Deadline cannot be before the Start Date');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('startDate', form.startDate);
      formData.append('deadline', form.deadline);
      formData.append('totalMarks', form.totalMarks);
      if (file) formData.append('file', file);

      const endpoint = editMode
        ? `/faculty/update-assignment/${editingId}`
        : '/faculty/create-assignment';

      const method = editMode ? 'PUT' : 'POST';

      await apiRequest(endpoint, {
        method,
        body: formData,
        headers: {}
      });

      showToast.success(`Assignment ${editMode ? 'updated' : 'created'} successfully`);
      resetForm();
      fetchAssignments();
    } catch (err) {
      // Error handled by apiRequest
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Assignment Regulation</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Design and publish academic tasks with official file attachments.</p>
        </div>
      </div>

      {/* Form Section */}
      <Card title={editMode ? "Edit Assignment" : "Add New Assignment"} icon={editMode ? "fa-pen-to-square" : "fa-plus-circle"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-black tracking-widest text-gray-400 mb-2">Course Title</label>
              <input
                type="text"
                value="Internship"
                disabled
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black tracking-widest text-gray-400 mb-2">Assignment Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Weekly Report 1"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black tracking-widest text-gray-400 mb-2">Description (Optional)</label>
            <textarea
              placeholder="Provide instructions for students..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-black tracking-widest text-gray-400 mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black tracking-widest text-gray-400 mb-2">Deadline Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black tracking-widest text-gray-400 mb-2">
              Assignment File {editMode ? "(Leave empty to keep current)" : "(PDF, DOCX, ZIP, Image)"}
            </label>
            <div className="relative group">
              <input
                id="assignmentFile"
                type="file"
                required={!editMode}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png"
              />
              <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center transition-all group-hover:border-secondary/40 group-hover:bg-gray-100/50">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-secondary mb-3">
                  <i className="fas fa-cloud-arrow-up text-xl"></i>
                </div>
                <div className="text-sm font-bold text-gray-700">{file ? file.name : (editMode ? 'Upload new file or keep existing' : 'Choose a file or drag it here')}</div>
                <div className="text-xs text-gray-400 mt-1">Word, PDF, ZIP or Image (Max 10MB)</div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              className="px-8 py-3.5 rounded-xl shadow-lg shadow-blue-600/20"
              loading={loading}
            >
              <i className={`fas ${editMode ? 'fa-save' : 'fa-paper-plane'} mr-2`}></i>
              {editMode ? 'Update Assignment' : 'Create Assignment'}
            </Button>

            {editMode && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="px-8 py-3.5 rounded-xl"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* List Section */}
      <Card title="Manage Assignments" icon="fa-list-check">
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Title</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Start Date</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Deadline</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400">Marks</th>
                <th className="px-6 py-4 border-y border-gray-100 text-[11px] font-black tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">
                    No assignments created yet.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 border-b border-gray-100">
                      <div className="text-sm font-bold text-gray-900">{a.title}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[200px]" title={a.description}>{a.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-medium text-gray-600">
                      {formatDisplayDate(a.startDate)}
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-medium text-gray-600">
                      {formatDisplayDate(a.deadline)}
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100 text-sm font-bold text-gray-700">
                      {a.totalMarks}
                    </td>
                    <td className="px-6 py-4 border-b border-gray-100 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {a.fileUrl && (
                          <a
                            href={a.fileUrl.startsWith('http') ? a.fileUrl : `${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}${a.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-8 h-8 rounded-lg bg-blue-50 text-secondary flex items-center justify-center hover:bg-secondary hover:text-white transition-all"
                            title="View File"
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </a>
                        )}
                        <button
                          onClick={() => handleEdit(a)}
                          className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border-0 cursor-pointer"
                          title="Edit"
                        >
                          <i className="fas fa-pen text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(a._id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all border-0 cursor-pointer"
                          title="Delete"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
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
