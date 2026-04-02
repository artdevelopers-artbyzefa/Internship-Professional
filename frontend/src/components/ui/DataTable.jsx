import React from 'react';

export function DataTable({ columns, children, data }) {
  const isAutomated = Array.isArray(data);

  return (
    <div className="w-full">
      <div className="block overflow-x-auto rounded-xl md:rounded-2xl border border-gray-100 shadow-sm bg-white w-full">
        <table className="w-full border-collapse table-auto" role="grid">
          <thead className="bg-gray-50/50">
            <tr role="row">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-2 md:px-4 py-2 md:py-3 text-left text-primary font-bold whitespace-normal md:whitespace-nowrap border-b border-gray-100 text-[8px] md:text-[11px] ${col.className || ''}`}
                  role="columnheader"
                >
                  {typeof col === 'string' ? col : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {isAutomated ? (
              data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={row._id || i} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors group" role="row">
                    {columns.map((col, idx) => (
                      <td
                        key={idx}
                        className={`px-1 md:px-4 py-1.5 md:py-4 text-gray-700 align-middle break-all md:break-normal ${col.className || ''}`}
                        role="gridcell"
                      >
                        <div className="line-clamp-1 text-[8px] md:text-sm font-medium" title={typeof row[col.key] === 'string' ? row[col.key] : ''}>
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr role="row">
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-600 font-medium italic" role="gridcell">
                    No results found
                  </td>
                </tr>
              )
            ) : children}
          </tbody>
        </table>
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
    <td className={`px-4 py-4 text-sm ${muted ? 'text-gray-600' : 'text-gray-700'} break-words whitespace-normal min-w-[120px] max-w-[200px] md:max-w-[250px] xl:max-w-[400px] ${className}`}>
      <div className="line-clamp-2">
        {children}
      </div>
    </td>
  );
}

export default DataTable;
