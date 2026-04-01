import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import { FormGroup, TextInput, SelectInput, TextareaInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Card from '../../components/ui/Card.jsx';
import { showToast, showAlert } from '../../utils/notifications.jsx';

export default function NoticeManagement({ user }) {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // Form state
    const [form, setForm] = useState({
        title: '',
        content: '',
        targetType: 'all_students',
        targetId: '',
        links: [],
        attachments: []
    });

    // Targeting Helpers
    const [supervisors, setSupervisors] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState('');

    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchNotices();
        fetchSupervisors();
    }, []);

    useEffect(() => {
        if (form.targetType === 'specific_student' && selectedSupervisorId) {
            fetchStudents(selectedSupervisorId);
        }
    }, [selectedSupervisorId, form.targetType]);

    const fetchNotices = async () => {
        try {
            const data = await apiRequest('/notices/all');
            setNotices(data);
        } catch (err) {
            setError('Failed to fetch notices');
        }
    };

    const fetchSupervisors = async () => {
        try {
            const data = await apiRequest('/notices/supervisors');
            setSupervisors(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchStudents = async (supId) => {
        try {
            const data = await apiRequest(`/notices/students/${supId}`);
            setStudents(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddLink = () => {
        setForm({ ...form, links: [...form.links, { title: '', url: '' }] });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const newAttachments = files.map(file => ({
            file,
            title: '',
            isNew: true
        }));
        setForm({ ...form, attachments: [...form.attachments, ...newAttachments] });
    };

    const handleRemoveAttachment = (index) => {
        const newAttachments = [...form.attachments];
        newAttachments.splice(index, 1);
        setForm({ ...form, attachments: newAttachments });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('content', form.content);
            formData.append('targetType', form.targetType);
            formData.append('targetId', form.targetId || '');
            formData.append('links', JSON.stringify(form.links));

            const newFiles = form.attachments.filter(a => a.isNew);
            const existingFiles = form.attachments.filter(a => !a.isNew);

            newFiles.forEach(a => {
                formData.append('files', a.file);
            });

            formData.append('attachmentTitles', JSON.stringify(newFiles.map(a => a.title)));
            formData.append('existingAttachments', JSON.stringify(existingFiles));

            const url = editingId ? `/notices/${editingId}` : '/notices';
            const method = editingId ? 'PUT' : 'POST';

            // Raw fetch for FormData
            const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
                method,
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Action failed');

            showToast.success(editingId ? 'Notice updated' : 'Notice posted');
            resetForm();
            setShowAddForm(false);
            fetchNotices();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            title: '',
            content: '',
            targetType: 'all_students',
            targetId: '',
            links: [],
            attachments: []
        });
        setEditingId(null);
        setSelectedSupervisorId('');
    };

    const handleEditClick = (notice) => {
        setEditingId(notice._id);
        const mappedAttachments = notice.attachments.map(a => ({
            ...a,
            isNew: false
        }));

        setForm({
            title: notice.title,
            content: notice.content,
            targetType: notice.targetType,
            targetId: notice.targetId?._id || '',
            links: notice.links,
            attachments: mappedAttachments
        });

        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        const confirmed = await showAlert.confirm('Delete Notice?', 'This will remove the announcement for all targeted users.', 'Delete Forever');
        if (!confirmed) return;

        try {
            await apiRequest(`/notices/${id}`, { method: 'DELETE' });
            fetchNotices();
            showToast.success('Notice deleted');
        } catch (err) {
            setError('Delete failed');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Institutional Announcements</h2>
                    <p className="text-sm text-gray-500">Broadcast updates to students and supervisors.</p>
                </div>
                <button
                    onClick={() => {
                        if (showAddForm) resetForm();
                        setShowAddForm(!showAddForm);
                    }}
                    aria-label={showAddForm ? 'Close announcement editor' : 'Create new announcement'}
                    aria-expanded={showAddForm}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all h-fit ${showAddForm ? 'bg-gray-100 text-gray-600' : 'bg-primary text-white shadow-lg shadow-blue-600/20'}`}
                >
                    <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} text-xs`} aria-hidden="true"></i>
                    <span className="text-sm">{showAddForm ? 'Close Editor' : 'Post Announcement'}</span>
                </button>
            </div>

            <div className={`grid transition-all duration-500 ease-in-out ${showAddForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                <div className="overflow-hidden">
                    <Card title={editingId ? "Edit Announcement" : "Draft New Notice"} className="border-2 border-primary/20 shadow-xl shadow-primary/5">
                        {error && <Alert type="error">{error}</Alert>}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <FormGroup label="Announcement Title">
                                <TextInput
                                    placeholder="e.g. KNB Scholarship 2026"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </FormGroup>

                            <FormGroup label="Description (Rules/Dates)">
                                <TextareaInput
                                    placeholder="Add content... Dates like 31st March will be highlighed"
                                    rows={6}
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    required
                                />
                            </FormGroup>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 tracking-widest">Target Audience</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormGroup label="Notice For">
                                        <SelectInput
                                            value={form.targetType}
                                            onChange={e => setForm({ ...form, targetType: e.target.value, targetId: '' })}
                                        >
                                            <option value="all_students">All Students</option>
                                            <option value="all_supervisors">All Faculty Supervisors</option>
                                            <option value="specific_supervisor">Specific Supervisor</option>
                                            <option value="specific_student">Specific Student</option>
                                        </SelectInput>
                                    </FormGroup>

                                    {(form.targetType === 'specific_supervisor' || form.targetType === 'specific_student') && (
                                        <FormGroup label="Select Supervisor">
                                            <SelectInput
                                                value={selectedSupervisorId}
                                                onChange={e => {
                                                    setSelectedSupervisorId(e.target.value);
                                                    if (form.targetType === 'specific_supervisor') {
                                                        setForm({ ...form, targetId: e.target.value });
                                                    }
                                                }}
                                            >
                                                <option value="">-- Choose Supervisor --</option>
                                                {supervisors.map(s => (
                                                    <option key={s._id} value={s._id}>{s.name}</option>
                                                ))}
                                            </SelectInput>
                                        </FormGroup>
                                    )}

                                    {form.targetType === 'specific_student' && selectedSupervisorId && (
                                        <FormGroup label="Select Student">
                                            <SelectInput
                                                value={form.targetId}
                                                onChange={e => setForm({ ...form, targetId: e.target.value })}
                                            >
                                                <option value="">-- Choose Student --</option>
                                                {students.map(s => (
                                                    <option key={s._id} value={s._id}>{s.reg} - {s.name}</option>
                                                ))}
                                            </SelectInput>
                                        </FormGroup>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-primary">Links & Resources</label>
                                    <button type="button" onClick={handleAddLink} className="text-xs font-bold text-primary hover:underline border-0 bg-transparent cursor-pointer">
                                        <i className="fas fa-plus-circle mr-1"></i> Add Link
                                    </button>
                                </div>
                                {form.links.map((link, idx) => (
                                    <div key={idx} className="flex gap-2 p-2 border rounded-xl bg-white shadow-sm">
                                        <TextInput
                                            placeholder="Label (e.g. Register)"
                                            value={link.title}
                                            onChange={e => {
                                                const nl = [...form.links]; nl[idx].title = e.target.value; setForm({ ...form, links: nl });
                                            }}
                                        />
                                        <TextInput
                                            placeholder="URL (https://...)"
                                            value={link.url}
                                            onChange={e => {
                                                const nl = [...form.links]; nl[idx].url = e.target.value; setForm({ ...form, links: nl });
                                            }}
                                        />
                                        <button 
                                            type="button" 
                                            aria-label="Remove link"
                                            className="w-10 h-10 border-0 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer" 
                                            onClick={() => {
                                                const nl = [...form.links]; nl.splice(idx, 1); setForm({ ...form, links: nl });
                                            }}>
                                            <i className="fas fa-times" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center border-t pt-4 mt-4">
                                    <label className="text-sm font-bold text-primary">Attachments (Documents)</label>
                                    <button type="button" onClick={() => document.getElementById('fileInput').click()} className="text-xs font-bold text-primary hover:underline border-0 bg-transparent cursor-pointer">
                                        <i className="fas fa-upload mr-1"></i> Upload Files
                                    </button>
                                    <input id="fileInput" type="file" multiple className="hidden" onChange={handleFileChange} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {form.attachments.map((att, idx) => (
                                        <div key={idx} className="p-3 border-2 border-dashed border-gray-100 rounded-xl relative hover:border-primary transition-colors flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center text-gray-400">
                                                <i className="fas fa-file"></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <TextInput
                                                    size="sm"
                                                    placeholder="File Title"
                                                    value={att.title}
                                                    onChange={e => {
                                                        const na = [...form.attachments]; na[idx].title = e.target.value; setForm({ ...form, attachments: na });
                                                    }}
                                                />
                                                <p className="text-[10px] text-gray-400 truncate mt-1">{att.isNew ? att.file.name : att.filename}</p>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label="Remove attachment"
                                                className="text-red-400 hover:text-red-700 bg-transparent border-0 cursor-pointer p-2"
                                                onClick={() => handleRemoveAttachment(idx)}
                                            >
                                                <i className="fas fa-trash" aria-hidden="true"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3 justify-end border-t mt-8">
                                <button type="button" onClick={resetForm} className="px-8 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all border-0 bg-transparent cursor-pointer">
                                    Discard Changes
                                </button>
                                <Button variant="primary" type="submit" loading={loading} className="px-12 py-3">
                                    {editingId ? 'Save & Sync Announcement' : 'Publish to Target Audience'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notices.map(n => (
                    <div key={n._id} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-xl hover:border-primary transition-all group cursor-pointer" onClick={() => handleEditClick(n)}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] bg-blue-50 text-primary px-2 py-0.5 rounded-full font-bold tracking-wider">
                                {n.targetType.replace('_', ' ')}
                            </span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(n); }} className="text-primary hover:scale-110 trans"><i className="fas fa-edit"></i></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }} className="text-red-400 hover:scale-110 trans"><i className="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-gray-800 line-clamp-1 mb-2">{n.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-4">{n.content}</p>
                        <div className="flex flex-col gap-1 text-[10px] text-gray-500 border-t pt-4">
                            <div className="flex justify-between items-center">
                                <span><i className="far fa-calendar mr-1" aria-hidden="true"></i> Posted: {new Date(n.createdAt).toLocaleDateString()}</span>
                                <span><i className="fas fa-paperclip mr-1" aria-hidden="true"></i> {n.attachments.length} files</span>
                            </div>
                            {n.updatedAt !== n.createdAt && (
                                <div className="text-gray-600 font-medium">
                                    <i className="fas fa-history mr-1" aria-hidden="true"></i> Last Update: {new Date(n.updatedAt).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {notices.length === 0 && (
                    <div className="col-span-full py-20 text-center grayscale bg-gray-50 rounded-3xl border-2 border-dashed">
                        <i className="fas fa-bullhorn text-4xl mb-3 text-gray-300"></i>
                        <p className="text-gray-400 font-medium">No active notices found</p>
                    </div>
                )}
            </div>

        </div>
    );
}
