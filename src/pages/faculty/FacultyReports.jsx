import React, { useState } from 'react';
import { showToast } from '../../utils/notifications.jsx';

export default function FacultyReports({ user }) {
  const [loading, setLoading] = useState(null);

  const handleDownloadPDF = async (type) => {
    setLoading(type);
    try {
      let payload = {
        supervisorName: user.name
      };

      if (type === 'student-list') {
        payload = {
          ...payload,
          reportTitle: 'Student Assignment Report',
          tableHeader: ['Reg. #', 'Name', 'Company', 'Supervisor', 'Status'],
          tableData: [
            ['CIIT/FA21-BCS-001/ATD', 'Ali Khan', 'TechSolutions Ltd', 'Dr. Ahmed', 'Ongoing'],
            ['CIIT/FA21-BCS-045/ATD', 'Sara Ahmed', 'Innovate Soft', 'Prof. Usman', 'Started'],
            ['CIIT/FA21-BCS-112/ATD', 'Zain Malik', 'DataDynamics', 'Dr. Saima', 'Completed'],
            ['CIIT/FA21-BCS-089/ATD', 'Hamza Ali', 'CyberNet', 'Dr. Ahmed', 'Ongoing'],
          ],
          columnsLayout: [100, '*', '*', '*', 65]
        };
      } else if (type === 'evaluation') {
        payload = {
          ...payload,
          reportTitle: 'Internship Performance Report',
          tableHeader: ['Reg. #', 'Name', 'Total', 'Obtained', 'Grade', 'Status'],
          tableData: [
            ['CIIT/FA21-BCS-001/ATD', 'Ali Khan', '100', '85', 'A-', 'Qualified'],
            ['CIIT/FA21-BCS-045/ATD', 'Sara Ahmed', '100', '92', 'A', 'Qualified'],
            ['CIIT/FA21-BCS-112/ATD', 'Zain Malik', '100', '78', 'B+', 'Qualified'],
          ],
          columnsLayout: [100, '*', 40, 45, 40, 65]
        };
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${payload.reportTitle.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Download Error:', error);
      showToast.error('Failed to download report');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Official Reports</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Generate university-standard documentation for internship programs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Student Assignment Report */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-file-pdf text-xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Student List Report</h3>
          <p className="text-sm text-gray-500 mb-6">Standard attendance-style list of students assigned to various companies.</p>
          <button 
            onClick={() => handleDownloadPDF('student-list')}
            disabled={loading !== null}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 
              ${loading === 'student-list' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-secondary shadow-lg shadow-blue-600/20'}`}
          >
            {loading === 'student-list' ? (
              <>
                <i className="fas fa-circle-notch fa-spin"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-download"></i>
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* Evaluation Summary Report */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-clipboard-check text-xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Evaluation Summary</h3>
          <p className="text-sm text-gray-500 mb-6">Official marksheet format with grades and qualification status of the students.</p>
          <button 
            onClick={() => handleDownloadPDF('evaluation')}
            disabled={loading !== null}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 
              ${loading === 'evaluation' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#10b981] text-white hover:bg-[#059669] shadow-lg shadow-emerald-600/20'}`}
          >
            {loading === 'evaluation' ? (
              <>
                <i className="fas fa-circle-notch fa-spin"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-download"></i>
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* Placeholder for Word reports */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 opacity-60">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-file-word text-xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Official Letters</h3>
          <p className="text-sm text-gray-500 mb-6">Internship offer and completion letters generated in Word format (Coming Soon).</p>
          <div className="w-full py-3 rounded-xl bg-gray-50 text-gray-400 text-center text-sm font-bold border border-dashed border-gray-200">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}
