import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Card from '../../components/ui/Card.jsx';
import { gradeFromPct } from '../../utils/helpers.js';

export default function HODApprovedResults() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    try {
      const data = await apiRequest('/office/all-marks');
      setMarks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
        key: 'student', 
        label: 'Student', 
        render: (val) => (
            <div className="text-xs font-bold">
                <p className="uppercase">{val?.name}</p>
                <p className="text-[10px] text-gray-400 font-medium">{val?.reg}</p>
            </div>
        )
    },
    { key: 'assignment', label: 'Assignment', render: (val) => <span className="text-xs font-medium text-gray-600">{val?.title}</span> },
    { 
        key: 'marks', 
        label: 'Obtained', 
        render: (val, row) => {
            const max = row.assignment?.totalMarks || 100;
            const pct = Math.round((val / max) * 100);
            return (
                <div>
                    <span className="text-xs font-black text-primary">{val} / {max}</span>
                    <span className="ml-2 text-[10px] font-bold text-gray-400">({pct}%)</span>
                </div>
            );
        }
    },
    { 
        key: 'grade', 
        label: 'Equivalent Grade', 
        render: (_, row) => {
            const pct = Math.round((row.marks / (row.assignment?.totalMarks || 100)) * 100);
            return <span className="text-sm font-black text-secondary">{gradeFromPct(pct)}</span>;
        }
    },
    { key: 'faculty', label: 'Evaluator', render: (val) => <span className="text-[10px] font-bold text-indigo-500 uppercase">{val?.name}</span> },
    {
        key: 'status',
        label: 'Status',
        render: () => (
            <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase border border-green-100">
                <i className="fas fa-lock"></i> Verified
            </div>
        )
    }
  ];

  if (loading) return <div className="text-center py-20"><i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i></div>;

  return (
    <Card>
      <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Academic Oversight</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Reviewing final normalized marks for all internships.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMarks} className="p-2.5">
            <i className="fas fa-sync-alt"></i>
          </Button>
      </div>

      {error && <Alert type="danger" className="mb-6">{error}</Alert>}
      
      {marks.length === 0 ? (
        <div className="text-center py-20 text-gray-400 italic">No approved results found.</div>
      ) : (
        <DataTable columns={columns} data={marks} />
      )}
    </Card>
  );
}

function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
    const variants = {
      primary: 'bg-primary text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700',
      secondary: 'bg-secondary text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600',
      outline: 'bg-white border-2 border-gray-100 text-gray-600 hover:border-primary hover:text-primary hover:bg-primary/5',
      danger: 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600'
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-6 py-2.5 text-sm',
      lg: 'px-8 py-3.5 text-base'
    };
  
    return (
      <button 
        className={`${variants[variant]} ${sizes[size]} font-black rounded-xl transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center ${className}`}
        {...props}
      >
        {children}
      </button>
    );
}
