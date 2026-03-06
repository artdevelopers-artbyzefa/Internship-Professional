import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';

export default function FacultyEvaluation() {
  const [marks, setMarks] = useState({ technical:0, professional:0, reports:0, presentation:0 });
  const maxes = { technical:50, professional:30, reports:40, presentation:30 };
  const [locked, setLocked] = useState(false);

  const total    = Object.values(marks).reduce((s, v) => s + Number(v), 0);
  const maxTotal = Object.values(maxes).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student Evaluation</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Institutional marking for technical skills and professional conduct.</p>
        </div>
        {locked && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-xs text-emerald-600 font-black tracking-wider">
            <i className="fas fa-check-circle"></i> VERIFIED & LOCKED
          </div>
        )}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">Evaluation Form · Ali Hassan</h3>
        </div>

      {!locked ? (
        <>
          <Alert type="info">Enter marks for each evaluation component below.</Alert>
          {[['Technical Skills','technical',50],['Professional Conduct','professional',30],
            ['Report Quality','reports',40],['Final Presentation','presentation',30]].map(([l,k,max]) => (
            <div key={k} className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{l}</label>
                <span className="text-xs text-gray-400">Max: {max}</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max={max} value={marks[k]}
                  onChange={e => setMarks({ ...marks, [k]: e.target.value })}
                  className="flex-1 accent-secondary" />
                <input type="number" min="0" max={max} value={marks[k]}
                  onChange={e => setMarks({ ...marks, [k]: e.target.value })}
                  className="w-16 border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-center font-poppins outline-none focus:border-secondary" />
              </div>
            </div>
          ))}

          <div className="bg-lightbg border-2 border-secondary rounded-xl p-4 text-center mb-5">
            <div className="text-3xl font-extrabold text-primary">{total}/{maxTotal}</div>
            <div className="text-xs text-gray-400 mt-1">Total Score · {Math.round(total/maxTotal*100)}%</div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline"><i className="fas fa-floppy-disk"></i> Save Draft</Button>
            <Button variant="primary" onClick={() => setLocked(true)}><i className="fas fa-paper-plane"></i> Submit Final</Button>
          </div>
        </>
      ) : (
        <div className="text-center py-10">
          <div className="text-5xl text-success mb-4"><i className="fas fa-check-circle"></i></div>
          <div className="text-base font-bold text-primary mb-2">Evaluation Submitted</div>
          <div className="text-sm text-gray-400">Score: {total}/{maxTotal} · Forwarded to HOD for approval</div>
          <div className="flex items-center justify-center gap-2 bg-gray-100 px-4 py-3 rounded-xl mt-4 text-sm text-gray-500 font-medium">
            <i className="fas fa-lock"></i> Locked & Pending HOD Approval
          </div>
        </div>
      )}
    </Card>
    </div>
  );
}
