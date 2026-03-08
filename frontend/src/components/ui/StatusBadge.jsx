import React from 'react';

export default function StatusBadge({ status }) {
  const styles = {
    'Pending':     'bg-yellow-100 text-yellow-800',
    'Approved':    'bg-green-100  text-green-800',
    'Rejected':    'bg-red-100    text-red-800',
    'Locked':      'bg-gray-100   text-gray-700',
    'Returned':    'bg-orange-50  text-orange-700',
    'Submitted':   'bg-green-100  text-green-800',
    'Active':      'bg-blue-100   text-blue-800',
    'Draft':       'bg-yellow-100 text-yellow-800',
    'Pending HOD': 'bg-orange-50  text-orange-700',
  };
  const icons = {
    'Pending':     'fa-clock',
    'Approved':    'fa-check',
    'Rejected':    'fa-xmark',
    'Locked':      'fa-lock',
    'Returned':    'fa-rotate-left',
    'Submitted':   'fa-check-circle',
    'Active':      'fa-circle-dot',
    'Draft':       'fa-pen',
    'Pending HOD': 'fa-hourglass-half',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-yellow-100 text-yellow-800'}`}>
      <i className={`fas ${icons[status] || 'fa-circle'}`}></i> {status}
    </span>
  );
}
