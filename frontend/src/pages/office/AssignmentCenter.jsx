import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import { SelectInput, TextInput } from '../../components/ui/FormInput.jsx';
import Card from '../../components/ui/Card.jsx';

export default function AssignmentCenter({ user }) {
    const [pendingStudents, setPendingStudents] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [mouCompanies, setMouCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'assigned'
    const [facultyFilter, setFacultyFilter] = useState('all');

    // Assignment form state per row (locally tracked)
    const [assignments, setAssignments] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stuPending, stuAssigned, facData, compData] = await Promise.all([
                apiRequest('/office/approved-students'),
                apiRequest('/office/assigned-students'),
                apiRequest('/auth/faculty-list'),
                apiRequest('/office/companies')
            ]);
            setPendingStudents(stuPending);
            setAssignedStudents(stuAssigned);
            setFacultyList(facData);
            setMouCompanies(compData.filter(c => c.isMOUSigned && c.status === 'Active'));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAssignment = (stuId, field, value) => {
        setAssignments(prev => {
            const current = prev[stuId] || {};
            if (field === 'companyId') {
                return {
                    ...prev,
                    [stuId]: { ...current, [field]: value, siteSupervisorIndex: '' }
                };
            }
            return {
                ...prev,
                [stuId]: { ...current, [field]: value }
            };
        });
    };

    const handleAssign = async (student) => {
        const data = assignments[student._id] || {};
        const isSelf = student.internshipRequest?.type === 'Self';

        if (!data.facultyId) return alert('Please select a Faculty Supervisor');

        let payload = {
            studentId: student._id,
            facultyId: data.facultyId,
            officeId: user.id || user._id
        };

        if (isSelf) {
            payload.companyName = student.internshipAgreement.companyName;
            payload.siteSupervisor = {
                name: student.internshipAgreement.companySupervisorName,
                email: student.internshipAgreement.companySupervisorEmail,
                whatsappNumber: student.internshipAgreement.whatsappNumber
            };
        } else {
            if (!data.companyId) return alert('Please select an MOU Company');
            if (data.siteSupervisorIndex === '') return alert('Please select a Site Supervisor');

            const company = mouCompanies.find(c => c._id === data.companyId);
            const supervisor = company.siteSupervisors[data.siteSupervisorIndex];

            payload.companyName = company.name;
            payload.siteSupervisor = supervisor;
        }

        setSubmitting(student._id);
        try {
            await apiRequest('/office/assign-student', {
                method: 'POST',
                body: payload
            });
            // Refresh both lists
            fetchData();
            const newAssigns = { ...assignments };
            delete newAssigns[student._id];
            setAssignments(newAssigns);
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(null);
        }
    };

    const filteredAssigned = facultyFilter === 'all'
        ? assignedStudents
        : assignedStudents.filter(s => s.assignedFaculty?._id === facultyFilter);

    const pendingColumns = [
        { key: 'reg', label: 'Reg #' },
        { key: 'name', label: 'Student Name' },
        {
            key: 'type',
            label: 'Flow',
            render: (_, row) => (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.internshipRequest?.type === 'Self' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                    {row.internshipRequest?.type === 'Self' ? 'Self Arranged' : 'MOU Based'}
                </span>
            )
        },
        {
            key: 'assign_comp',
            label: 'Internship Placement',
            render: (_, row) => {
                const isSelf = row.internshipRequest?.type === 'Self';
                if (isSelf) return <p className="text-[11px] font-bold text-gray-700">{row.internshipAgreement?.companyName}</p>;
                return (
                    <SelectInput
                        className="text-[11px] py-1.5 min-w-[150px]"
                        value={assignments[row._id]?.companyId || ''}
                        onChange={e => handleUpdateAssignment(row._id, 'companyId', e.target.value)}
                    >
                        <option value="">Select MOU Company</option>
                        {mouCompanies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </SelectInput>
                );
            }
        },
        {
            key: 'assign_comp_sup',
            label: 'Site Supervisor',
            render: (_, row) => {
                const isSelf = row.internshipRequest?.type === 'Self';
                if (isSelf) return <p className="text-[11px] font-bold text-gray-700">{row.internshipAgreement?.companySupervisorName}</p>;

                const selectedCompanyId = assignments[row._id]?.companyId;
                const company = mouCompanies.find(c => c._id === selectedCompanyId);

                return (
                    <SelectInput
                        className="text-[11px] py-1.5 min-w-[150px]"
                        disabled={!selectedCompanyId}
                        value={assignments[row._id]?.siteSupervisorIndex ?? ''}
                        onChange={e => handleUpdateAssignment(row._id, 'siteSupervisorIndex', e.target.value)}
                    >
                        <option value="">{selectedCompanyId ? 'Select Supervisor' : 'Select Company First'}</option>
                        {company?.siteSupervisors.map((s, idx) => (
                            <option key={idx} value={idx}>{s.name} ({s.email})</option>
                        ))}
                    </SelectInput>
                );
            }
        },
        {
            key: 'assign_fac',
            label: 'Faculty Advisor',
            render: (_, row) => (
                <SelectInput
                    className="text-[11px] py-1.5 min-w-[150px]"
                    value={assignments[row._id]?.facultyId || ''}
                    onChange={e => handleUpdateAssignment(row._id, 'facultyId', e.target.value)}
                >
                    <option value="">Select Faculty</option>
                    {facultyList.filter(f => f.status === 'Active').map(f => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                </SelectInput>
            )
        },
        {
            key: 'actions',
            label: 'Action',
            render: (_, row) => (
                <Button
                    variant="primary" size="sm"
                    onClick={() => handleAssign(row)}
                    loading={submitting === row._id}
                    className="whitespace-nowrap rounded-lg"
                >
                    Confirm Assignment
                </Button>
            )
        }
    ];

    const assignedColumns = [
        { key: 'reg', label: 'Reg #' },
        { key: 'name', label: 'Name' },
        {
            key: 'assignedCompany',
            label: 'Placement Details',
            render: (val, row) => (
                <div className="text-[11px] space-y-0.5">
                    <p className="font-bold text-gray-800">{val}</p>
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
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full tracking-tighter border border-indigo-100 shadow-sm inline-block">
                    {val}
                </span>
            )
        }
    ];

    if (loading) return <div className="text-center py-20 px-10 bg-white rounded-3xl border shadow-sm"><i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i><p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-xs">Syncing Assignment Engine...</p></div>;

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-50">
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight">Assignment Control Center</h2>
                        <p className="text-sm text-gray-500 font-medium">End-to-end management of internship placements and supervisor audits.</p>
                    </div>

                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit border-2 border-white shadow-inner">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Pending ({pendingStudents.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('assigned')}
                            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'assigned' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Assigned ({assignedStudents.length})
                        </button>
                    </div>
                </div>

                {error && <Alert type="danger" className="mb-6">{error}</Alert>}

                {activeTab === 'pending' ? (
                    <div>
                        {pendingStudents.length === 0 ? (
                            <div className="text-center py-20 grayscale opacity-40">
                                <i className="fas fa-user-check text-4xl mb-4"></i>
                                <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">Queue Clear: All students assigned</p>
                            </div>
                        ) : (
                            <DataTable columns={pendingColumns} data={pendingStudents} />
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter Advisor:</label>
                                <SelectInput
                                    className="text-xs font-bold py-1.5 min-w-[200px]"
                                    value={facultyFilter}
                                    onChange={(e) => setFacultyFilter(e.target.value)}
                                >
                                    <option value="all">All Faculty Members</option>
                                    {facultyList.map(f => (
                                        <option key={f._id} value={f._id}>{f.name}</option>
                                    ))}
                                </SelectInput>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => fetchData()} className="rounded-xl"><i className="fas fa-sync mr-2"></i> Refresh Data</Button>
                        </div>
                        <DataTable columns={assignedColumns} data={filteredAssigned} />
                    </div>
                )}
            </div>
        </div>
    );
}
