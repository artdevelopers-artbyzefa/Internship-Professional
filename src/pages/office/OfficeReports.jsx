import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

// ─── All 7 report types, grouped ───
const REPORT_OPTIONS = [
  {
    group: 'Academic Reports',
    reports: [
      { id: 'student-list',         label: 'Student Completion Registry',       icon: 'fa-users',              desc: 'All students with company, department, and internship status.', hasProgram: true },
      { id: 'evaluation-summary',   label: 'Evaluation Summary Report',         icon: 'fa-star-half-stroke',   desc: 'Full marks breakdown per student per assignment, submitted by faculty.', hasProgram: true },
      { id: 'results-by-supervisor',label: 'Results Report (by Supervisor)',    icon: 'fa-chart-bar',          desc: 'Assignment marks per student grouped by faculty supervisor, with optional single-assignment filter.', hasSupervisor: true, hasAssignment: true },
      { id: 'assigned-students',    label: 'Assigned Students Report',          icon: 'fa-user-check',         desc: 'Students assigned under a supervisor with company, mode, and type details.', hasSupervisor: true },
    ]
  },
  {
    group: 'Supervisor Reports',
    reports: [
      { id: 'supervisors-overview', label: 'Supervisors Overview Report',       icon: 'fa-chalkboard-user',    desc: 'All faculty supervisors, assigned student counts, and average scores.' },
      { id: 'faculty-workload',     label: 'Faculty Workload Report',           icon: 'fa-user-tie',           desc: 'Supervision load summary — High / Normal / Low per faculty.', hasProgram: true },
    ]
  },
  {
    group: 'Industry Reports',
    reports: [
      { id: 'company-placement',    label: 'Company Placement Report',          icon: 'fa-building',           desc: 'Partner companies ranked by student count with placement share %.', hasProgram: true },
    ]
  }
];

const ALL_REPORTS = REPORT_OPTIONS.flatMap(g => g.reports);

// ─── Small reusable dropdown wrapper ───
function StyledSelect({ label, value, onChange, children, loading }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-bold text-gray-500 mb-1.5">{label}</label>
      )}
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400">
          <i className="fas fa-circle-notch fa-spin text-primary"></i> Loading...
        </div>
      ) : (
        <div className="relative">
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer pr-10"
            value={value}
            onChange={onChange}
          >
            {children}
          </select>
          <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
        </div>
      )}
    </div>
  );
}

export default function OfficeReports({ user }) {
  const [loading, setLoading] = useState(false);

  // Step 1 — Report type
  const [reportId, setReportId] = useState('');

  // Step 2 — Supervisor (for results + assigned-students)
  const [supervisorId, setSupervisorId] = useState('all');
  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  // Step 3 — Assignment (for results-by-supervisor only)
  const [assignmentId, setAssignmentId] = useState('all');
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Step 2b — Program (for reports that support it)
  const [program, setProgram] = useState('All');

  const selected = ALL_REPORTS.find(r => r.id === reportId);

  // When a supervisor-based report is selected → load supervisors
  useEffect(() => {
    if (selected?.hasSupervisor) {
      setLoadingSupervisors(true);
      setSupervisors([]);
      setSupervisorId('all');
      setAssignments([]);
      setAssignmentId('all');
      apiRequest('/analytics/report/supervisors')
        .then(data => setSupervisors(data || []))
        .catch(() => setSupervisors([]))
        .finally(() => setLoadingSupervisors(false));
    } else {
      setSupervisors([]);
      setSupervisorId('all');
      setAssignments([]);
      setAssignmentId('all');
    }
  }, [reportId]);

  // When supervisor changes AND report needs assignment list → load assignments
  useEffect(() => {
    if (selected?.hasAssignment) {
      setLoadingAssignments(true);
      setAssignments([]);
      setAssignmentId('all');
      apiRequest(`/analytics/report/assignments-by-supervisor?supervisorId=${supervisorId}`)
        .then(data => setAssignments(data || []))
        .catch(() => setAssignments([]))
        .finally(() => setLoadingAssignments(false));
    }
  }, [supervisorId, selected?.hasAssignment]);

  // Reset everything when report type changes
  const handleReportChange = (newId) => {
    setReportId(newId);
    setProgram('All');
  };

  // ─── Total visible steps ───
  const step2Visible = selected && (selected.hasSupervisor || selected.hasProgram);
  const step3Visible = selected?.hasAssignment && supervisorId !== undefined;
  const stepTotal = 2 + (step2Visible ? 1 : 0) + (step3Visible ? 1 : 0);
  // Determine step numbers
  const step2Num = 2;
  const step3Num = step2Visible ? 3 : 2;
  const downloadStepNum = step3Visible ? 4 : step2Visible ? 3 : 2;

  // ─── PDF download handler ───
  const handleDownload = async () => {
    if (!reportId) { showToast.info('Please select a report type first.'); return; }
    try {
      setLoading(true);
      const params = new URLSearchParams({ program }).toString();
      let payload = {
        reportTitle: selected?.label || 'Report',
        supervisorName: user?.name || 'Internship Office',
        tableHeader: [],
        tableData: [],
        columnsLayout: []
      };

      // ── 1. Student Completion Registry ──
      if (reportId === 'student-list') {
        const students = await apiRequest(`/analytics/registry?${params}`);
        payload.tableHeader = ['#', 'Reg. No.', 'Student Name', 'Dept', 'Company', 'Status'];
        payload.columnsLayout = ['auto', 'auto', '*', 'auto', '*', 'auto'];
        let idx = 1;
        const rows = [];
        students.forEach(comp => {
          comp.students.forEach(s => {
            rows.push([idx.toString(), s.reg || '—', s.name || '—', s.dept || '—', comp._id || '—', s.status || '—']);
            idx++;
          });
        });
        payload.tableData = rows;
      }

      // ── 2. Evaluation Summary ──
      else if (reportId === 'evaluation-summary') {
        const marks = await apiRequest(`/office/all-marks?${params}`);
        payload.tableHeader = ['#', 'Reg #', 'Student Name', 'Assignment', 'Marks', 'Total', 'Faculty'];
        payload.columnsLayout = ['auto', 'auto', '*', '*', 'auto', 'auto', '*'];
        payload.tableData = marks.map((m, i) => [
          (i + 1).toString(), m.student?.reg || '—', m.student?.name || '—',
          m.assignment?.title || '—', m.marks?.toString() || '—',
          (m.assignment?.totalMarks || 100).toString(), m.faculty?.name || '—'
        ]);
      }

      // ── 3. Results by Supervisor ──
      else if (reportId === 'results-by-supervisor') {
        const qParams = new URLSearchParams({ supervisorId, assignmentId }).toString();
        const data = await apiRequest(`/analytics/report/results-by-supervisor?${qParams}`);
        // Build supervisor info line
        const supName = supervisors.find(s => s._id === supervisorId)?.name || 'All Supervisors';
        const asgName = assignments.find(a => a._id === assignmentId)?.title || 'All Assignments';
        payload.reportTitle = `Results Report — ${supName} · ${asgName}`;
        payload.supervisorName = supName;
        payload.tableHeader = ['#', 'Student Name', 'Reg. No.', 'Semester', 'Company', 'Assignment', 'Marks', '%', 'Faculty'];
        payload.columnsLayout = ['auto', '*', 'auto', 'auto', '*', '*', 'auto', 'auto', '*'];
        const rows = [];
        let idx = 1;
        data.forEach(asgn => {
          asgn.entries.forEach(e => {
            rows.push([
              idx.toString(), e.studentName, e.reg,
              e.semester?.toString() || '—', e.company || '—',
              asgn.assignmentTitle, e.marks?.toString() || '—',
              `${e.percentage}%`, asgn.facultyName
            ]);
            idx++;
          });
        });
        payload.tableData = rows;
      }

      // ── 4. Assigned Students ──
      else if (reportId === 'assigned-students') {
        const data = await apiRequest(`/analytics/report/assigned-students?supervisorId=${supervisorId}`);
        payload.tableHeader = ['#', 'Student Name', 'Reg. No.', 'Sem', 'Company', 'Site Sup.', 'Mode', 'Type', 'Faculty'];
        payload.columnsLayout = ['auto', '*', 'auto', 'auto', '*', '*', 'auto', 'auto', '*'];
        payload.tableData = data.map((s, i) => [
          (i + 1).toString(), s.name, s.reg,
          s.semester?.toString() || '—', s.company || '—',
          s.siteSupervisor || '—', s.mode || '—', s.type || '—', s.faculty
        ]);
      }

      // ── 5. Supervisors Overview ──
      else if (reportId === 'supervisors-overview') {
        const data = await apiRequest('/analytics/report/supervisors');
        payload.tableHeader = ['#', 'Supervisor Name', 'Email', 'Students Assigned', 'Avg Score'];
        payload.columnsLayout = ['auto', '*', '*', 'auto', 'auto'];
        payload.tableData = data.map((f, i) => [
          (i + 1).toString(), f.name, f.email || '—',
          f.studentCount?.toString() || '0',
          f.avgScore ? `${f.avgScore}%` : 'N/A'
        ]);
      }

      // ── 6. Faculty Workload ──
      else if (reportId === 'faculty-workload') {
        const faculty = await apiRequest(`/analytics/faculty-performance?${params}`);
        payload.tableHeader = ['#', 'Faculty Supervisor', 'Students Supervised', 'Load Level'];
        payload.columnsLayout = ['auto', '*', 'auto', 'auto'];
        payload.tableData = faculty.map((f, i) => [
          (i + 1).toString(), f.name, f.totalStudents?.toString() || '0',
          f.totalStudents >= 15 ? 'High' : f.totalStudents >= 8 ? 'Normal' : 'Low'
        ]);
      }

      // ── 7. Company Placement ──
      else if (reportId === 'company-placement') {
        const companies = await apiRequest(`/analytics/company-distribution?${params}`);
        const total = companies.reduce((acc, c) => acc + c.value, 0);
        payload.tableHeader = ['#', 'Company Name', 'No. of Students', 'Placement Share'];
        payload.columnsLayout = ['auto', '*', 'auto', 'auto'];
        payload.tableData = companies.map((c, i) => [
          (i + 1).toString(), c.name, c.value.toString(),
          total > 0 ? `${((c.value / total) * 100).toFixed(1)}%` : '0%'
        ]);
      }

      if (payload.tableData.length === 0) {
        showToast.info('No data available for the selected filters.');
        return;
      }

      // ─── Send to PDF generator ───
      const safeTitle = (payload.reportTitle || 'Report').replace(/[^\x00-\x7F]/g, '-').replace(/[\s/]+/g, '_');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server Error (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast.success(`Report downloaded successfully.`);
    } catch (err) {
      console.error('Report Error:', err);
      showToast.error(`Failed to generate report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Download Reports</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Generate official COMSATS-branded PDF reports for internship records and analysis.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-500">
          <i className="fas fa-file-pdf text-red-400"></i> PDF · A4 · COMSATS Branded
        </div>
      </div>

      {/* ── Main Form Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

        {/* ── STEP 1: Report Type ── */}
        <div className="mb-6">
          <StepLabel num={1} total={downloadStepNum} label="Select Report Type" />
          <StyledSelect value={reportId} onChange={e => handleReportChange(e.target.value)}>
            <option value="">— Choose a report to download —</option>
            {REPORT_OPTIONS.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.reports.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </optgroup>
            ))}
          </StyledSelect>
        </div>

        {/* Report Description */}
        {selected && (
          <div className="flex items-start gap-3 mb-6 p-4 bg-primary/5 border border-primary/10 rounded-xl">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className={`fas ${selected.icon} text-primary text-sm`}></i>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">{selected.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{selected.desc}</div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Supervisor or Program Filter ── */}
        {selected && (selected.hasSupervisor || selected.hasProgram) && (
          <div className="mb-6">
            <StepLabel num={step2Num} total={downloadStepNum} label={
              selected.hasSupervisor ? 'Select Faculty Supervisor' : 'Select Department / Program'
            } />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selected.hasSupervisor && (
                <StyledSelect
                  label="Faculty Supervisor"
                  value={supervisorId}
                  onChange={e => setSupervisorId(e.target.value)}
                  loading={loadingSupervisors}
                >
                  <option value="all">All Supervisors</option>
                  {supervisors.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.studentCount} student{s.studentCount !== 1 ? 's' : ''})
                    </option>
                  ))}
                </StyledSelect>
              )}
              {selected.hasProgram && (
                <StyledSelect
                  label="Department / Program"
                  value={program}
                  onChange={e => setProgram(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  <option value="BCS">CS — Bachelor of Computer Science</option>
                  <option value="BSE">SE — Bachelor of Software Engineering</option>
                </StyledSelect>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Assignment Filter (Results by Supervisor only) ── */}
        {step3Visible && (
          <div className="mb-6">
            <StepLabel num={step3Num} total={downloadStepNum} label="Select Assignment / Result" />
            <StyledSelect
              label="Assignment"
              value={assignmentId}
              onChange={e => setAssignmentId(e.target.value)}
              loading={loadingAssignments}
            >
              <option value="all">All Assignments (Combined Report)</option>
              {assignments.map(a => (
                <option key={a._id} value={a._id}>
                  {a.title} (out of {a.totalMarks})
                </option>
              ))}
            </StyledSelect>
            {!loadingAssignments && assignments.length === 0 && (
              <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1.5">
                <i className="fas fa-triangle-exclamation"></i>
                No marks have been submitted yet for this supervisor. Select "All Supervisors" to see all.
              </p>
            )}
            {!loadingAssignments && assignments.length > 0 && (
              <p className="text-xs text-gray-400 font-medium mt-2">
                {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} with marks found
                {supervisorId !== 'all' ? ` for selected supervisor` : ''}.
                Select one for a single-assignment report, or "All" for the full record.
              </p>
            )}
          </div>
        )}

        {/* ── Divider before download ── */}
        {selected && <div className="border-t border-gray-100 my-6"></div>}

        {/* ── Download Button ── */}
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <button
            onClick={handleDownload}
            disabled={!reportId || loading}
            className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/25 hover:bg-secondary transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            {loading
              ? <><i className="fas fa-circle-notch fa-spin text-lg"></i><span>Generating PDF...</span></>
              : <><i className="fas fa-cloud-arrow-down text-lg"></i><span>Download PDF Report</span></>
            }
          </button>

          {reportId && !loading && (
            <div className="flex items-center gap-4 text-xs text-gray-400 font-bold">
              <span className="flex items-center gap-1.5"><i className="fas fa-file text-gray-300"></i> A4 Page Size</span>
              <span className="flex items-center gap-1.5"><i className="fas fa-image text-gray-300"></i> COMSATS Logo</span>
              <span className="flex items-center gap-1.5"><i className="fas fa-clock text-gray-300"></i> Timestamp Included</span>
            </div>
          )}

          {!reportId && (
            <p className="text-sm text-gray-400 font-medium italic">Select a report type above to enable download.</p>
          )}
        </div>

        {/* ── Empty state (no report selected) ── */}
        {!reportId && (
          <div className="mt-10 text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-file-arrow-down text-2xl text-gray-300"></i>
            </div>
            <p className="text-sm font-bold text-gray-400">Choose a report type from the dropdown above</p>
            <p className="text-xs text-gray-300 mt-1">7 report types available — click any to select it quickly</p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {ALL_REPORTS.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleReportChange(r.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-primary/5 hover:text-primary hover:border-primary/20 border border-gray-100 rounded-full text-xs font-bold text-gray-500 transition-all"
                >
                  <i className={`fas ${r.icon} text-[10px]`}></i>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step label badge ───
function StepLabel({ num, total, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
        {num}
      </span>
      <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{label}</span>
    </div>
  );
}
