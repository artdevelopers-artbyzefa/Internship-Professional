import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function OfficeReports({ user }) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('student-list');
  const [semester, setSemester] = useState('All');
  const [program, setProgram] = useState('All');

  const reportOptions = [
    { id: 'student-list', label: 'Student Completion Report', icon: 'fa-users' },
    { id: 'evaluation-summary', label: 'Evaluation Summary Report', icon: 'fa-star' },
    { id: 'company-placement', label: 'Company Placement Report', icon: 'fa-building' },
    { id: 'faculty-workload', label: 'Faculty Workload Report', icon: 'fa-user-tie' },
  ];

  const handleDownload = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ semester, program }).toString();
      let payload = {
        reportTitle: '',
        supervisorName: user.name,
        tableHeader: [],
        tableData: [],
        columnsLayout: []
      };

      if (reportType === 'student-list') {
        const students = await apiRequest(`/analytics/registry?${params}`);
        payload.reportTitle = 'Internship Completion Registry';
        payload.tableHeader = ['Reg. #', 'Student Name', 'Dept', 'Company', 'Status'];
        payload.columnsLayout = ['auto', '*', 'auto', '*', 'auto'];
        
        const flatData = [];
        students.forEach(comp => {
            comp.students.forEach(s => {
                flatData.push([s.reg, s.name, s.dept || 'N/A', comp._id, s.status]);
            });
        });
        payload.tableData = flatData;
      } 
      else if (reportType === 'evaluation-summary') {
        const marks = await apiRequest(`/office/all-marks?${params}`);
        payload.reportTitle = 'Student Evaluation Summary';
        payload.tableHeader = ['Reg #', 'Name', 'Assignment', 'Marks', 'Supervisor'];
        payload.columnsLayout = ['auto', '*', '*', 'auto', 'auto'];
        payload.tableData = marks.map(m => [
            m.student?.reg || 'N/A',
            m.student?.name || 'N/A',
            m.assignment?.title || 'N/A',
            `${m.marks}/${m.assignment?.totalMarks || 100}`,
            m.faculty?.name || 'N/A'
        ]);
      }
      else if (reportType === 'company-placement') {
        const companies = await apiRequest(`/analytics/company-distribution?${params}`);
        payload.reportTitle = 'Company Placement Analytics';
        payload.tableHeader = ['Company Name', 'No. of Students', 'Placement Share'];
        payload.columnsLayout = ['*', 'auto', 'auto'];
        
        const total = companies.reduce((acc, c) => acc + c.value, 0);
        payload.tableData = companies.map(c => [
            c.name,
            c.value.toString(),
            total > 0 ? `${((c.value / total) * 100).toFixed(1)}%` : '0%'
        ]);
      }
      else if (reportType === 'faculty-workload') {
        const faculty = await apiRequest(`/analytics/faculty-performance?${params}`);
        payload.reportTitle = 'Faculty Supervision Workload';
        payload.tableHeader = ['Faculty Supervisor', 'Students Supervised', 'Load Status'];
        payload.columnsLayout = ['*', 'auto', 'auto'];
        payload.tableData = faculty.map(f => [
            f.name,
            f.totalStudents.toString(),
            f.totalStudents >= 15 ? 'High' : (f.totalStudents >= 8 ? 'Normal' : 'Low')
        ]);
      }

      if (payload.tableData.length === 0) {
        showToast.info('No data available for the selected report.');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${payload.reportTitle.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast.success('Report generated successfully');
    } catch (error) {
      console.error('Report Generation Error:', error);
      showToast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Download Professional Reports</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Generate official COMSATS branded PDF documents for internship records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-6 h-fit">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Select Report Type</h3>
          <div className="space-y-2">
            {reportOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setReportType(opt.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${
                  reportType === opt.id 
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  reportType === opt.id ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'
                }`}>
                  <i className={`fas ${opt.icon}`}></i>
                </div>
                <span className="font-bold text-sm tracking-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 p-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Semester Filter</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  <option value="All">All Active Semesters</option>
                  <option value="FA24">FA24</option>
                  <option value="SP24">SP24</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Program Selection</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  <option value="BCS">CS Department</option>
                  <option value="BSE">SE Department</option>
                </select>
              </div>
            </div>

            <div className="bg-primary/5 rounded-2xl p-8 border border-primary/10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-primary text-2xl shadow-sm mb-4">
                    <i className="fas fa-file-pdf"></i>
                </div>
                <h4 className="text-xl font-black text-gray-800 tracking-tight">Ready to Generate</h4>
                <p className="text-sm text-gray-500 font-medium max-w-md mt-2">
                    {reportOptions.find(o => o.id === reportType)?.label} will be generated with current portal data and COMSATS branding.
                </p>
                
                <Button 
                    onClick={handleDownload} 
                    className="mt-8 px-10 py-4 text-lg shadow-xl shadow-primary/30"
                    disabled={loading}
                >
                    {loading ? (
                        <><i className="fas fa-circle-notch fa-spin mr-3"></i> Generating...</>
                    ) : (
                        <><i className="fas fa-cloud-download-alt mr-3"></i> Download PDF Report</>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-4">
                <div className="text-center p-4">
                    <div className="text-lg font-black text-gray-800">A4</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page Size</div>
                </div>
                <div className="text-center p-4 border-x border-gray-50">
                    <div className="text-lg font-black text-gray-800">Portrait</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Layout</div>
                </div>
                <div className="text-center p-4">
                    <div className="text-lg font-black text-gray-800">Logo</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Branding</div>
                </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
