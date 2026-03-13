import React from 'react';

export function DataTable({ columns, children, data }) {
  // Support both array of strings (manual) and array of objects (automated)
  const isAutomated = Array.isArray(data);
  const columnLabels = columns.map(col => typeof col === 'string' ? col : col.label);

  return (
    <div className="w-full">
      {/* Table view for md and up */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50/50">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 text-left text-[10px] font-black text-primary uppercase tracking-[0.15em] whitespace-nowrap border-b border-gray-100">
                  {typeof col === 'string' ? col : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {isAutomated ? (
              data.map((row, i) => (
                <tr key={row._id || i} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors group">
                  {columns.map((col, idx) => (
                    <td key={idx} className="px-6 py-5 text-sm text-gray-700">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : children}
          </tbody>
        </table>
      </div>

      {/* Card view for mobile */}
      <div className="md:hidden space-y-4">
        {isAutomated ? (
          data.map((row, i) => (
            <div key={row._id || i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm active:scale-[0.98] transition-transform">
              <div className="space-y-4">
                {columns.map((col, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{typeof col === 'string' ? col : col.label}</span>
                    <div className="text-sm font-medium text-gray-800">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
            Manual Table Content (Responsive View Not Available)
          </div>
        )}
      </div>
    </div>
  );
}

export function TableRow({ children }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
      {children}
    </tr>
  );
}

export function TableCell({ children, muted = false, className = '' }) {
  return (
    <td className={`px-4 py-4 text-sm ${muted ? 'text-gray-400' : 'text-gray-700'} ${className}`}>
      {children}
    </td>
  );
}

export default DataTable;
