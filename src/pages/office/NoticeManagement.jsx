import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import { FormGroup, TextInput, SelectInput, TextareaInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Card from '../../components/ui/Card.jsx';

export default function NoticeManagement({ view, user }) {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const activeTab = view === 'update-notice' ? 'update' : 'create';

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

            // We need a raw fetch for FormData as apiRequest might be setting JSON headers
            const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
                method,
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Action failed');

            setSuccess(editingId ? 'Notice updated' : 'Notice posted');
            resetForm();
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

        // Setup for student targeting if needed
        if (notice.targetType === 'specific_student' && notice.targetId) {
            // We'd need to know the supervisor to populate the dropdown
            // For now, if it's specific student, we pre-fill the fields we have
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this notice?')) return;
        try {
            await apiRequest(`/notices/${id}`, { method: 'DELETE' });
            fetchNotices();
            setSuccess('Notice deleted');
        } catch (err) {
            setError('Delete failed');
        }
    };

    return (
        <div className="space-y-6">
            {editingId || activeTab === 'create' ? (
                <Card title={editingId ? "Edit Announcement" : "Post New Announcement"}>
                    {error && <Alert type="error">{error}</Alert>}
                    {success && <Alert type="success">{success}</Alert>}
                    
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
                                <label className="text-sm font-bold text-primary">Links (Websites/Forms)</label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>
                                    <i className="fas fa-plus mr-1"></i> Add Link
                                </Button>
                            </div>
                            {form.links.map((link, idx) => (
                                <div key={idx} className="flex gap-2 p-2 border rounded-lg bg-white shadow-sm">
                                    <TextInput 
                                        placeholder="Title (e.g. Application Form)"
                                        value={link.title}
                                        onChange={e => {
                                            const nl = [...form.links]; nl[idx].title = e.target.value; setForm({...form, links: nl});
                                        }}
                                    />
                                    <TextInput 
                                        placeholder="URL"
                                        value={link.url}
                                        onChange={e => {
                                            const nl = [...form.links]; nl[idx].url = e.target.value; setForm({...form, links: nl});
                                        }}
                                    />
                                    <Button type="button" variant="danger" size="icon" onClick={() => {
                                        const nl = [...form.links]; nl.splice(idx, 1); setForm({...form, links: nl});
                                    }}>
                                        <i className="fas fa-times"></i>
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-primary">Attachments (Local Files)</label>
                                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('fileInput').click()}>
                                    <i className="fas fa-upload mr-1"></i> Upload Files
                                </Button>
                                <input id="fileInput" type="file" multiple className="hidden" onChange={handleFileChange} />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {form.attachments.map((att, idx) => (
                                    <div key={idx} className="p-3 border-2 border-dashed border-gray-100 rounded-xl relative hover:border-primary transition-colors">
                                        <div className="text-[10px] text-gray-400 mb-1">{att.isNew ? 'NEW FILE' : 'EXISTING FILE'}</div>
                                        <TextInput 
                                            placeholder="File Label (e.g. Info Guide)"
                                            value={att.title}
                                            onChange={e => {
                                                const na = [...form.attachments]; na[idx].title = e.target.value; setForm({...form, attachments: na});
                                            }}
                                        />
                                        <div className="text-xs text-secondary mt-1 truncate">
                                            {att.isNew ? att.file.name : att.filename}
                                        </div>
                                        <button 
                                            type="button" 
                                            className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                                            onClick={() => handleRemoveAttachment(idx)}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 flex gap-4">
                            <Button variant="primary" type="submit" loading={loading} block>
                                {editingId ? 'Save Changes' : 'Publish Notice'}
                            </Button>
                            <Button variant="outline" type="button" onClick={resetForm}>
                                {editingId ? 'Cancel' : 'Clear Form'}
                            </Button>
                        </div>
                    </form>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notices.map(n => (
                        <div key={n._id} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-xl hover:border-primary transition-all group cursor-pointer" onClick={() => handleEditClick(n)}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] bg-blue-50 text-primary px-2 py-0.5 rounded-full font-bold tracking-wider">
                                    {n.targetType.replace('_', ' ')}
                                </span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => {e.stopPropagation(); handleEditClick(n);}} className="text-primary hover:scale-110 trans"><i className="fas fa-edit"></i></button>
                                    <button onClick={(e) => {e.stopPropagation(); handleDelete(n._id);}} className="text-red-400 hover:scale-110 trans"><i className="fas fa-trash"></i></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-800 line-clamp-1 mb-2">{n.title}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-4">{n.content}</p>
                            <div className="flex flex-col gap-1 text-[10px] text-gray-400 border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <span><i className="far fa-calendar mr-1"></i> Posted: {new Date(n.createdAt).toLocaleDateString()}</span>
                                    <span><i className="fas fa-paperclip mr-1"></i> {n.attachments.length} files</span>
                                </div>
                                {n.updatedAt !== n.createdAt && (
                                    <div className="text-secondary font-medium">
                                        <i className="fas fa-history mr-1"></i> Last Update: {new Date(n.updatedAt).toLocaleString()}
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
            )}

        </div>
    );
}
