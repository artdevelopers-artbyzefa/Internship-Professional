import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import { SelectInput, TextInput } from '../../components/ui/FormInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ViewAllResults() {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [filterAssignment, setFilterAssignment] = useState('all');
  
  // Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMarks, setEditMarks] = useState({}); // { markId: marksValue }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [marksData, assignData, facData] = await Promise.all([
        apiRequest('/office/all-marks'),
        apiRequest('/office/assignments'),
        apiRequest('/auth/faculty-list')
      ]);
      setMarks(marksData);
      setAssignments(assignData);
      setFaculty(facData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterFacultyChange = (e) => {
    setFilterFaculty(e.target.value);
    setIsEditMode(false);
  };

  const handleFilterAssignmentChange = (e) => {
    setFilterAssignment(e.target.value);
    setIsEditMode(false);
  };

  // Processing Data
  const filteredData = marks.filter(m => {
    const facultyMatch = filterFaculty === 'all' || m.faculty?._id === filterFaculty;
    const assignmentMatch = filterAssignment === 'all' || m.assignment?._id === filterAssignment;
    return facultyMatch && assignmentMatch;
  });

  // Group by assignment for title-wise view
  const groupedResults = filteredData.reduce((groups, item) => {
    const title = item.assignment?.title || 'Unknown Assignment';
    if (!groups[title]) groups[title] = [];
    groups[title].push(item);
    return groups;
  }, {});

  const handleSaveMarks = async (assignmentTitle) => {
    const resultsInGroup = groupedResults[assignmentTitle];
    const assignmentId = resultsInGroup[0].assignment._id;
    
    // In bulk update, for each entry we identify the student and faculty
    const marksData = resultsInGroup.map(m => ({
        studentId: m.student._id,
        facultyId: m.faculty?._id || filterFaculty, // Use existing or current filter
        marks: editMarks[m._id] !== undefined ? Number(editMarks[m._id]) : m.marks
    }));

    // Filter out items where we still don't have a faculty (should not happen in practice)
    const validMarksData = marksData.filter(d => d.facultyId !== 'all');

    if (validMarksData.length === 0) return alert('Cannot save marks without a valid Faculty Supervisor association.');

    setSubmitting(true);
    try {
        await apiRequest('/office/bulk-update-marks', {
            method: 'POST',
            body: {
                assignmentId,
                marksData: validMarksData,
                officeId: user.id || user._id
            }
        });
        alert(`Marks for group "${assignmentTitle}" updated successfully.`);
        setIsEditMode(false);
        fetchInitialData();
    } catch (err) {
        alert(err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const columns = [
    { 
        key: 'student', 
        label: 'Student Details',
        render: (val) => (
            <div className="text-[11px] space-y-0.5">
                <p className="font-bold text-gray-800">{val?.name}</p>
                <p className="text-gray-400 font-medium">{val?.reg} | Sem {val?.semester}</p>
            </div>
        )
    },
    { 
        key: 'faculty', 
        label: 'Supervisor', 
        render: (val) => <span className="text-[10px] font-black text-indigo-500 flex items-center gap-1.5"><i className="fas fa-user-tie opacity-40"></i>{val?.name}</span> 
    },
    { 
        key: 'marks', 
        label: 'Evaluation Score',
        render: (val, row) => (
            <div className="flex items-center gap-2">
                {isEditMode ? (
                    <div className="flex flex-col">
                        <TextInput 
                            type="number"
                            className="w-20 text-center font-black py-1 h-8 text-sm"
                            defaultValue={val}
                            onChange={(e) => setEditMarks(prev => ({ ...prev, [row._id]: e.target.value }))}
                            max={row.assignment?.totalMarks || 100}
                        />
                        {Number(editMarks[row._id]) > (row.assignment?.totalMarks || 100) && (
                            <span className="text-[8px] text-red-500 font-black mt-1">Exceeds Max</span>
                        )}
                    </div>
                ) : (
                    <span className="text-xs font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                        {val} / {row.assignment?.totalMarks || 100}
                    </span>
                )}
            </div>
        ) 
    },
    { 
        key: 'updatedAt', 
        label: 'Last Modified',
        render: (val) => val ? (
            <div className="text-[10px] text-gray-400 font-medium">
                <i className="fas fa-clock mr-1.5 opacity-50"></i>
                {new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
        ) : <span className="text-[10px] text-gray-300 italic">Pre-system record</span>
    }
  ];

  if (loading) return <div className="text-center py-20"><i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i></div>;

  return (
    <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-100 border border-gray-100 p-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Academic Oversight</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Direct intervention and consolidated evaluation tracking.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-gray-50/50 p-4 rounded-[30px] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 tracking-widest px-2">Filter Faculty:</span>
            <SelectInput 
                className="text-xs font-bold py-2 min-w-[180px] bg-white rounded-2xl border-none shadow-sm"
                value={filterFaculty}
                onChange={handleFilterFacultyChange}
            >
                <option value="all">All Supervisors</option>
                {faculty.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </SelectInput>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 tracking-widest px-2">Filter Task:</span>
            <SelectInput 
                className="text-xs font-bold py-2 min-w-[180px] bg-white rounded-2xl border-none shadow-sm"
                value={filterAssignment}
                onChange={handleFilterAssignmentChange}
            >
                <option value="all">Every Assignment</option>
                {assignments.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
            </SelectInput>
          </div>

          <div className="flex gap-2 ml-2">
            <Button 
                variant={isEditMode ? "danger" : "outline"} 
                size="sm" 
                onClick={() => {
                    if (isEditMode) setIsEditMode(false);
                    else {
                        setIsEditMode(true);
                        setEditMarks({});
                    }
                }}
                className={`py-2 px-5 font-black text-[10px] rounded-2xl transition-all ${isEditMode ? "ring-4 ring-red-100" : ""}`}
            >
                {isEditMode ? <><i className="fas fa-times-circle mr-2"></i> Finished Editing</> : <><i className="fas fa-user-gear mr-2"></i> Administrative Mode</>}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchInitialData} className="w-10 h-10 p-0 rounded-full border-none shadow-sm hover:rotate-180 transition-all duration-500">
                <i className="fas fa-sync-alt"></i>
            </Button>
          </div>
        </div>
      </div>

      {error && <Alert type="danger" className="mb-8">{error}</Alert>}
      
      {filteredData.length === 0 ? (
        <div className="text-center py-24 bg-gray-50/30 rounded-[60px] border-4 border-dashed border-gray-100 text-gray-300">
          <i className="fas fa-folder-open text-6xl mb-6 opacity-20"></i>
          <p className="font-black text-gray-800 text-xl">No Records Match This Criteria</p>
          <p className="text-sm font-medium mt-2">Adjust your filters or verify evaluations have been submitted.</p>
        </div>
      ) : (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {Object.keys(groupedResults).map(title => (
                <div key={title} className="group">
                    <div className="flex items-center justify-between mb-6 px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-[25px] shadow-xl shadow-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <i className="fas fa-file-invoice text-primary text-sm"></i>
                            </div>
                            <div>
                                <h3 className="text-xs font-black tracking-[0.2em]">{title}</h3>
                                <p className="text-[10px] text-white/40 font-bold mt-0.5">{groupedResults[title].length} Evaluation(s) Record Found</p>
                            </div>
                        </div>
                        {isEditMode && (
                            <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={() => handleSaveMarks(title)}
                                loading={submitting}
                                className="h-9 py-0 px-6 text-[10px] font-extrabold rounded-xl bg-primary shadow-lg shadow-primary/30"
                            >
                                <i className="fas fa-cloud-check mr-2"></i> Commit {title}
                            </Button>
                        )}
                    </div>
                    <div className="bg-white rounded-[30px] overflow-hidden border border-gray-100 shadow-sm transition-all group-hover:shadow-md">
                        <DataTable columns={columns} data={groupedResults[title]} />
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
