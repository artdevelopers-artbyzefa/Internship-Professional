import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import SearchBar from '../../components/ui/SearchBar.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { showToast } from '../../utils/notifications.jsx';
import { apiRequest } from '../../utils/api.js';

export default function FacultyStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/faculty/my-students');
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.reg.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Assigned Students</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Registry of interns under your academic supervision.</p>
        </div>
        <div className="flex items-center gap-3">
           <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="min-w-[280px]" />
           <Button variant="outline" size="sm" onClick={fetchStudents} className="p-2.5" disabled={loading}>
             <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
           </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="text-sm font-bold text-primary">Student Registry</div>
        </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i>
        </div>
      ) : (
        <DataTable columns={['Name','Reg. No.','Company','Status','Actions']}>
          {filtered.length > 0 ? (
            filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell><strong>{s.name}</strong></TableCell>
                <TableCell muted>{s.reg}</TableCell>
                <TableCell>{s.company}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/faculty/students/${s.id}`)}
                  >
                    <i className="fas fa-eye"></i> View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-gray-400 font-medium">
                No students found.
              </TableCell>
            </TableRow>
          )}
        </DataTable>
      )}
      </Card>
    </div>
  );
}
