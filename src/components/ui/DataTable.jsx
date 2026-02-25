import React from 'react';

export function DataTable({ columns, children, data }) {
  // Support both array of strings (manual) and array of objects (automated)
  const isAutomated = Array.isArray(data);
  const columnLabels = columns.map(col => typeof col === 'string' ? col : col.label);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse">
        <thead className="bg-[#F8FAFC]">
          <tr>
            {columnLabels.map(col => (
              <th key={col} className="px-4 py-4 text-left text-[11px] font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {isAutomated ? (
            data.map((row, i) => (
              <tr key={row._id || i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-4 text-sm text-gray-700">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : children}
        </tbody>
      </table>
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
