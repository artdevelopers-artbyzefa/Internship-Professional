import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import { apiRequest } from '../../utils/api.js';
import SearchBar from '../../components/ui/SearchBar.jsx';
import Button from '../../components/ui/Button.jsx';

export default function OfficeEvaluation() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/office/evaluations');
      setEvaluations(data || []);
    } catch (err) {
      // Error handled by apiRequest
    } finally {
      setLoading(false);
    }
  };

  const filtered = evaluations.filter(e =>
    e.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.student?.reg?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-20"><i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Consolidated Evaluations</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Registry of internal and site supervisor assessments.</p>
        </div>
        <div className="flex items-center gap-4">
          <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student name or reg..." />
          <Button variant="outline" size="sm" onClick={fetchEvaluations}><i className="fas fa-sync"></i></Button>
        </div>
      </div>

      <Card>
        <DataTable columns={['Student', 'Reg. No.', 'Source', 'Total Marks', 'Status', 'Submitted At']}>
          {filtered.length > 0 ? (
            filtered.map((e, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <div className="font-bold text-gray-800">{e.student?.name}</div>
                </TableCell>
                <TableCell muted>{e.student?.reg}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${e.source === 'site_supervisor' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                    {e.source?.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell><strong className="text-primary">{e.totalMarks}/{e.maxTotal || 150}</strong></TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${e.status === 'Submitted' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                    {e.status}
                  </span>
                </TableCell>
                <TableCell muted className="text-[10px]">
                  {e.submittedAt ? new Date(e.submittedAt).toLocaleDateString() : 'Draft'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-gray-400 font-medium">No evaluations found.</TableCell>
            </TableRow>
          )}
        </DataTable>
      </Card>
    </div>
  );
}
