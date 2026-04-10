import React from 'react';

const SkeletonRow = ({ columns }) => (
  <tr className="animate-pulse border-b border-slate-50 last:border-0">
    {columns.map((_, i) => (
      <td key={i} className="px-6 py-5">
        <div className={`h-4 bg-slate-100 rounded-lg ${i === 0 ? 'w-32' : i === 1 ? 'w-24' : 'w-20'}`}></div>
        {i === 0 && <div className="h-2 w-20 bg-slate-50 rounded mt-2"></div>}
      </td>
    ))}
  </tr>
);

const MobileSkeleton = ({ columns }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm animate-pulse space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
        <div className="h-2 w-16 bg-slate-50 rounded"></div>
        <div className="h-3 w-24 bg-slate-100 rounded"></div>
      </div>
    ))}
  </div>
);

export function DataTable({ columns, children, data, loading }) {
  const isAutomated = Array.isArray(data);

  if (loading) {
    return (
      <div className="w-full space-y-4">
        {/* Mobile Skeletons */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {[...Array(5)].map((_, i) => <MobileSkeleton key={i} columns={columns} />)}
        </div>
        {/* Desktop Skeletons */}
        <div className="hidden md:block overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-5 text-left text-slate-400 font-black uppercase tracking-widest border-b border-slate-100 text-[10px]">
                    {typeof col === 'string' ? col : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} columns={columns} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!isAutomated && children) {
    return (
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    );
  }

  if (isAutomated && data.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-black text-slate-800">No Data Available</h3>
        <p className="text-sm text-slate-500 font-medium">There are no records to display at this time.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Mobile Card View (shown only on small screens) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {data.map((row, i) => (
          <div 
            key={row._id || i} 
            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all hover:border-primary/20"
          >
            {columns.map((col, idx) => {
              // Skip "Action" column for separate handling or keep it at the end
              if (col.key === 'action' || col.label === 'Action') return null;
              
              const content = col.render ? col.render(row[col.key], row) : row[col.key];
              
              return (
                <div key={idx} className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0 gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
                    {typeof col === 'string' ? col : col.label}
                  </span>
                  <div className="text-right flex-1 flex justify-end overflow-hidden">
                    <div className="text-xs font-bold text-slate-800 break-words">
                      {content}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Mobile Actions specifically at the bottom */}
            {columns.find(c => c.key === 'action' || c.label === 'Action') && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                {columns.find(c => c.key === 'action' || c.label === 'Action').render(null, row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View (shown on medium screens and up) */}
      <div className="hidden md:block overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/50">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`px-6 py-5 text-left text-slate-400 font-black uppercase tracking-widest border-b border-slate-100 text-[10px] ${col.className || ''}`}
                  >
                    {typeof col === 'string' ? col : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((row, i) => (
                <tr 
                  key={row._id || i} 
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  {columns.map((col, idx) => (
                    <td
                      key={idx}
                      className={`px-6 py-4 text-slate-700 align-middle ${col.className || ''}`}
                    >
                      <div className="text-sm font-semibold tracking-tight">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function TableRow({ children, className = '', onClick }) {
    return (
        <tr 
            onClick={onClick}
            className={`hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        >
            {children}
        </tr>
    );
}

export function TableCell({ children, className = '', muted }) {
    return (
        <td className={`px-6 py-4 align-middle ${className}`}>
            <div className={`text-sm font-semibold tracking-tight ${muted ? 'text-slate-400 font-medium' : 'text-slate-700'}`}>
                {children}
            </div>
        </td>
    );
}

export default DataTable;

