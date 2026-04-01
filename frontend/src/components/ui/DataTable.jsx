import React from 'react';

export function DataTable({ columns, children, data }) {
  // Support both array of strings (manual) and array of objects (automated)
  const isAutomated = Array.isArray(data);
  const columnLabels = columns.map(col => typeof col === 'string' ? col : col.label);

  return (
    <div className="w-full">
      {/* Table view: Visible on desktop */}
      <div className={`${isAutomated ? 'hidden md:block' : 'block'} overflow-hidden rounded-xl md:rounded-2xl border border-gray-100 shadow-sm bg-white w-full`}>
        <table className="w-full border-collapse table-auto">
          <thead className="bg-gray-50/50">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-4 py-4 text-left text-[10px] font-black text-primary tracking-widest whitespace-nowrap border-b border-gray-100">
                  {typeof col === 'string' ? col : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {isAutomated ? (
              data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={row._id || i} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors group">
                    {columns.map((col, idx) => (
                      <td key={idx} className="px-4 py-4 text-xs text-gray-700 align-middle max-w-[120px] md:max-w-[160px] lg:max-w-[220px]">
                        <div className="truncate" title={typeof row[col.key] === 'string' ? row[col.key] : ''}>
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-600 font-medium italic">
                    No results found
                  </td>
                </tr>
              )
            ) : children}
          </tbody>
        </table>
      </div>

      {/* Premium Card view for mobile: Only for automated data */}
      {isAutomated && (
        <div className="md:hidden space-y-4">
          {data.length > 0 ? (
            data.map((row, i) => (
              <div key={row._id || i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm active:scale-[0.98] transition-transform text-left">
                <div className="space-y-4">
                  {columns.map((col, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-gray-600 tracking-widest">{typeof col === 'string' ? col : col.label}</span>
                      <div className="text-sm font-medium text-gray-800 break-words whitespace-normal max-w-full">
                        <div className="line-clamp-3">
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-600 text-sm font-medium italic border border-dashed border-gray-200">
              No results found
            </div>
          )}
        </div>
      )}
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
    <td className={`px-4 py-4 text-sm ${muted ? 'text-gray-600' : 'text-gray-700'} break-words whitespace-normal max-w-[150px] md:max-w-[200px] xl:max-w-[300px] ${className}`}>
      <div className="line-clamp-2">
        {children}
      </div>
    </td>
  );
}

export default DataTable;
