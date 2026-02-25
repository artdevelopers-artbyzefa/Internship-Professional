import React from 'react';

export default function Alert({ type = 'info', children }) {
  const styles = {
    info:    'bg-blue-100  text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };
  const icons = {
    info:    'fa-info-circle',
    success: 'fa-check-circle',
    warning: 'fa-triangle-exclamation',
  };
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl text-sm mb-4 ${styles[type]}`}>
      <i className={`fas ${icons[type]} mt-0.5 flex-shrink-0`}></i>
      <span>{children}</span>
    </div>
  );
}
