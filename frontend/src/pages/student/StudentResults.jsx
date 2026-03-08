import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import { gradeFromPct } from '../../utils/helpers.js';
import Card from '../../components/ui/Card.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';

export default function StudentResults() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    try {
      const data = await apiRequest('/student/my-marks');
      setMarks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // For total calculation, we'd use dynamic totalMarks from the assignment
  const total = marks.reduce((s, m) => s + m.marks, 0);
  const maxTotal = marks.reduce((s, m) => s + (m.assignment?.totalMarks || 100), 0);
  const pct = maxTotal > 0 ? Math.round(total / maxTotal * 100) : 0;
  const grade = maxTotal > 0 ? gradeFromPct(pct) : 'N/A';

  if (loading) return <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-2xl text-primary"></i></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Academic Results</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Transcript of internship evaluations and final grading.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="shadow-sm">
          <i className="fas fa-print mr-2"></i> Print Transcript
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-secondary text-white rounded-2xl p-5 text-center flex flex-col justify-center">
          <div className="text-3xl font-extrabold">{total}/{maxTotal || 0}</div>
          <div className="text-sm opacity-85 mt-1">Aggregate Score</div>
          <div className="text-3xl font-extrabold mt-2">{grade}</div>
        </div>
        <Card>
          <h3 className="text-lg font-bold text-gray-800 tracking-tight mb-3">Quick Summary</h3>
          {marks.length === 0 ? (
            <div className="text-sm text-gray-400 italic py-4">No marks released yet.</div>
          ) : (
            marks.slice(0, 3).map(m => (
                <div key={m._id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{m.assignment?.title}</div>
                    <div className="text-[10px] text-gray-400">Assessed on {new Date(m.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm font-bold text-primary">{m.marks} / {m.assignment?.totalMarks || 100}</div>
                </div>
            ))
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">Detailed Evaluation Transcript</h3>
        </div>
        
        {error && <Alert type="danger" className="mb-4">{error}</Alert>}
        
        {marks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <i className="fas fa-award text-3xl text-gray-200 mb-2"></i>
                <p className="text-sm text-gray-400">Academic evaluations will appear here once submitted by your supervisor.</p>
            </div>
        ) : (
            <DataTable columns={['Assignment','Obtained','Weightage','Performance','Status']}>
              {marks.map(m => {
                const weight = m.assignment?.totalMarks || 100;
                const p = Math.round(m.marks / weight * 100);
                return (
                  <TableRow key={m._id}>
                    <TableCell>
                        <div className="font-bold text-gray-800">{m.assignment?.title}</div>
                        <div className="text-[10px] text-gray-400 tracking-tighter">Internship Course</div>
                    </TableCell>
                    <TableCell><strong className="text-primary">{m.marks}</strong></TableCell>
                    <TableCell>{weight}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24"><ProgressBar value={p} /></div>
                        <span className="text-xs font-bold">{p}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-black rounded-full border border-green-100">
                           Released
                        </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </DataTable>
        )}

        <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl mt-6 text-[11px] text-gray-500 font-bold border border-gray-100">
          <i className="fas fa-shield-halved text-primary"></i> 
          This is an electronically generated transcript. Securely verified by Internship Office.
        </div>
      </Card>
    </div>
  );
}
