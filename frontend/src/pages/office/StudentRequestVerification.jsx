import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal, { ModalTitle, ModalSub } from '../../components/ui/Modal.jsx';
import { FormGroup, TextareaInput } from '../../components/ui/FormInput.jsx';
import { showToast } from '../../utils/notifications.jsx';

export default function StudentRequestVerification() {
    const [requests, setRequests] = useState([]);
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deciding, setDeciding] = useState(null);
    const [comment, setComment] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'agreements'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [reqData, agrData] = await Promise.all([
                apiRequest('/office/pending-requests'),
                apiRequest('/office/pending-agreements')
            ]);
            setRequests(reqData);
            setAgreements(agrData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (studentId, decision, type) => {
        if (decision === 'reject' && !comment) {
            showToast.error('Please add a rejection reason in the comment box.');
            return;
        }

        setDeciding(studentId);
        try {
            const endpoint = type === 'request' ? '/office/decide-request' : '/office/decide-agreement';
            await apiRequest(endpoint, {
                method: 'POST',
                body: { studentId, decision, comment }
            });
            setComment('');
            setSelectedItem(null);
            fetchData();
        } catch (err) {
            // Error handled by apiRequest
        } finally {
            setDeciding(null);
        }
    };

    const requestColumns = [
        { key: 'reg', label: 'Reg #' },
        { key: 'name', label: 'Name' },
        {
            key: 'internshipRequest',
            label: 'Placement Details',
            render: (req, row) => (
                <div className="flex items-center justify-between gap-4">
                    <div className="text-xs">
                        <div className="font-bold text-primary">{req?.type}</div>
                        <div>{req?.companyName}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedItem({ ...row, _type: 'request' })}>
                        Review
                    </Button>
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Quick Action',
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm" variant="success"
                        onClick={() => handleDecision(row._id, 'approve', 'request')}
                        loading={deciding === row._id}
                    >Approve</Button>
                    <Button
                        size="sm" variant="danger"
                        onClick={() => { setSelectedItem({ ...row, _type: 'request' }); setActiveTab('requests'); }}
                    >Reject</Button>
                </div>
            )
        }
    ];

    const agreementColumns = [
        { key: 'reg', label: 'Reg #' },
        { key: 'name', label: 'Name' },
        {
            key: 'internshipAgreement',
            label: 'Agreement Details',
            render: (agr, row) => (
                <div className="flex items-center justify-between gap-4">
                    <div className="text-[10px] leading-tight max-w-[200px]">
                        <div className="font-bold text-blue-700">{agr?.companyName}</div>
                        <div><span className="text-gray-400 font-bold uppercase tracking-tight">Supervisor:</span> {agr?.companySupervisorName}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedItem({ ...row, _type: 'agreement' })}>
                        Review
                    </Button>
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Quick Action',
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm" variant="success"
                        onClick={() => handleDecision(row._id, 'approve', 'agreement')}
                        loading={deciding === row._id}
                    >Finalize</Button>
                    <Button
                        size="sm" variant="danger"
                        onClick={() => { setSelectedItem({ ...row, _type: 'agreement' }); setActiveTab('agreements'); }}
                    >Reject</Button>
                </div>
            )
        }
    ];

    if (loading) return <div className="text-center py-20 bg-white rounded-3xl border shadow-sm"><i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i><p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Verification Engine...</p></div>;

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-50">
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight">Verification Dashboard</h2>
                        <p className="text-sm text-gray-500 font-medium">Multi-stage audit of student internship applications and legal agreements.</p>
                    </div>

                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit border-2 border-white shadow-inner">
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Requests ({requests.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('agreements')}
                            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'agreements' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Agreements ({agreements.length})
                        </button>
                    </div>
                </div>

                {error && <Alert type="danger" className="mb-6">{error}</Alert>}

                {activeTab === 'requests' ? (
                    <div>
                        {requests.length === 0 ? (
                            <div className="text-center py-12 grayscale opacity-30 text-gray-500">
                                <i className="fas fa-check-double text-4xl mb-3"></i>
                                <p className="text-xs font-bold uppercase tracking-widest">No pending placement requests</p>
                            </div>
                        ) : (
                            <DataTable columns={requestColumns} data={requests} />
                        )}
                    </div>
                ) : (
                    <div>
                        {agreements.length === 0 ? (
                            <div className="text-center py-12 grayscale opacity-30 text-gray-500">
                                <i className="fas fa-signature text-4xl mb-3"></i>
                                <p className="text-xs font-bold uppercase tracking-widest">No pending agreements found</p>
                            </div>
                        ) : (
                            <DataTable columns={agreementColumns} data={agreements} />
                        )}
                    </div>
                )}
            </div>

            {selectedItem && (
                <Modal onClose={() => setSelectedItem(null)}>
                    <ModalTitle>{selectedItem._type === 'request' ? 'Initial Request Review' : 'Final Agreement Audit'}</ModalTitle>
                    <ModalSub>{selectedItem.name} ({selectedItem.reg})</ModalSub>

                    <div className="mt-8 space-y-6">
                        {selectedItem._type === 'request' ? (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Internship Type</div>
                                    <div className="font-semibold text-primary">{selectedItem.internshipRequest?.type}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                        {selectedItem.internshipRequest?.mode === 'Freelance' ? 'Project / Client' : 'Target Company'}
                                    </div>
                                    <div className="font-semibold text-primary">{selectedItem.internshipRequest?.companyName}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Proposed Duration</div>
                                    <div className="font-semibold text-primary">{selectedItem.internshipRequest?.duration}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Mode / Schedule</div>
                                    <div className="font-semibold text-primary">{selectedItem.internshipRequest?.mode}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Affiliated Email</div>
                                    <div className="font-semibold text-gray-700 truncate">{selectedItem.email}</div>
                                </div>
                                {selectedItem.secondaryEmail && (
                                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                                        <div className="text-[10px] font-bold text-primary/60 uppercase tracking-tight">Secondary Email</div>
                                        <div className="font-semibold text-primary truncate">{selectedItem.secondaryEmail}</div>
                                    </div>
                                )}
                                <div className="col-span-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Functional Description</div>
                                    <div className="text-xs text-blue-700 leading-relaxed italic line-clamp-4">"{selectedItem.internshipRequest?.description}"</div>
                                </div>
                                {selectedItem.internshipRequest?.mode === 'Freelance' && (
                                    <>
                                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">Freelance Platform</div>
                                            <div className="font-semibold text-indigo-700">{selectedItem.internshipRequest?.freelancePlatform}</div>
                                        </div>
                                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">Profile Link</div>
                                            <div className="font-semibold text-indigo-700 truncate">
                                                <a href={selectedItem.internshipRequest?.freelanceProfileLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    {selectedItem.internshipRequest?.freelanceProfileLink}
                                                </a>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="md:col-span-2 flex items-center gap-2 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <h4 className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Placement Meta-Data</h4>
                                </div>
                                {[
                                    { label: 'Degree & Program', value: selectedItem.internshipAgreement?.degreeProgram },
                                    { label: 'Academic Semester', value: selectedItem.internshipAgreement?.semester },
                                    { label: 'Affiliated Email', value: selectedItem.email },
                                    { label: 'Secondary Email', value: selectedItem.secondaryEmail },
                                    { label: 'Company Name', value: selectedItem.internshipAgreement?.companyName },
                                    { label: 'HR Email Address', value: selectedItem.internshipAgreement?.companyHREmail },
                                    { label: 'Supervisor Name', value: selectedItem.internshipAgreement?.companySupervisorName },
                                    { label: 'Supervisor Contact', value: selectedItem.internshipAgreement?.whatsappNumber },
                                ].map(item => (
                                    <div key={item.label} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.label}</div>
                                        <div className="font-semibold text-gray-800 truncate">{item.value || 'N/A'}</div>
                                    </div>
                                ))}
                                <div className="md:col-span-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mt-2">
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Organizational Scope</div>
                                    <div className="text-xs text-indigo-700 leading-relaxed italic">{selectedItem.internshipAgreement?.companyScope}</div>
                                </div>
                            </div>
                        )}

                        <hr className="border-gray-100" />

                        <FormGroup label="Decision Comment (Visible to Student)">
                            <TextareaInput
                                placeholder="Enter audit trail or rejection reason..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                            />
                        </FormGroup>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all border-0 bg-transparent cursor-pointer"
                            >Discard</button>
                            <Button
                                variant="success" className="flex-1 py-4 text-sm font-black uppercase tracking-widest"
                                onClick={() => handleDecision(selectedItem._id, 'approve', selectedItem._type)}
                                loading={deciding === selectedItem._id}
                            >Finalize Approval</Button>
                            <Button
                                variant="danger-outline" className="flex-1 py-4 text-sm font-black uppercase tracking-widest"
                                onClick={() => handleDecision(selectedItem._id, 'reject', selectedItem._type)}
                                loading={deciding === selectedItem._id}
                            >Reject Record</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
