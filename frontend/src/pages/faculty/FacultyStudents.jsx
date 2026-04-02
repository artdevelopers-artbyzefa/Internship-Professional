import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import SearchBar from '../../components/ui/SearchBar.jsx';
import { DataTable, TableRow, TableCell } from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { showToast } from '../../utils/notifications.jsx';
import { apiRequest } from '../../utils/api.js';
import { gradeColor } from '../../utils/helpers.js';

export default function FacultyStudents({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeMap, setGradeMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
    if (user?.role !== 'site_supervisor') {
      apiRequest('/faculty/report-data/evaluation')
        .then(d => {
          const map = {};
          (d?.tableData || []).forEach(row => { map[row[0]] = { grade: row[5], pct: row[4], status: row[6] }; });
          setGradeMap(map);
        })
        .catch((err) => { 
          // Error handled by apiRequest
        });
    }
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const endpoint = user?.role === 'site_supervisor' ? '/supervisor/my-students' : '/faculty/my-students';
      const data = await apiRequest(endpoint);
      setStudents(data);
    } catch (error) {
      // Error handled by apiRequest
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
      <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Assigned Students</h2>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
            {user?.role === 'site_supervisor'
              ? 'Registry of interns under your industrial mentorship.'
              : 'Registry of interns under your academic supervision.'}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <SearchBar 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search students..." 
            className="flex-1 md:min-w-[280px]" 
          />
          <Button variant="outline" size="sm" onClick={fetchStudents} className="p-3" disabled={loading}>
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">Student Registry</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20">
            <i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i>
          </div>
        ) : (
          <DataTable 
            data={filtered}
            columns={[
              { label: 'Name', key: 'name', render: (val) => <strong>{val}</strong> },
              { label: 'Reg. No.', key: 'reg' },
              { 
                label: 'Company', 
                key: 'company', 
                render: (val, row) => row.isFreelance ? (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-bold text-[10px] whitespace-nowrap">
                    <i className="fas fa-laptop-code mr-1"></i>{val}
                  </span>
                ) : val 
              },
              { 
                label: 'Grade', 
                key: 'reg', 
                render: (reg) => {
                  const g = gradeMap[reg];
                  if (!g || g.grade === 'N/A') return <span className="text-gray-300 text-xs font-bold">—</span>;
                  const gc = gradeColor(g.grade);
                  return (
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black tracking-widest border ${gc.bg} ${gc.text} ${gc.border}`}>{g.grade}</span>
                      <span className={`text-xs font-black ${parseInt(g.pct) >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>{g.pct}</span>
                    </div>
                  );
                }
              },
              { label: 'Status', key: 'status', render: (val) => <StatusBadge status={val} /> },
              { 
                label: 'Action', 
                key: '_id', 
                render: (id, row) => (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => navigate(`/faculty/students/${id || row.id}`)}
                    className="rounded-xl font-bold uppercase tracking-widest text-[9px]"
                  >
                    <i className="fas fa-eye mr-1"></i> Profile
                  </Button>
                )
              }
            ]}
          />
        )}
      </Card>
    </div>
  );
}
