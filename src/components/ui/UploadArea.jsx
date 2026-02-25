import React from 'react';

export default function UploadArea({ label = 'Drag & drop your file here', hint = 'Click to browse · PDF, DOCX (max 10MB)' }) {
  return (
    <div className="border-2 border-dashed border-secondary rounded-2xl p-10 text-center cursor-pointer bg-lightbg hover:bg-blue-100 hover:border-primary transition-all duration-200 mt-5">
      <i className="fas fa-cloud-arrow-up text-4xl text-secondary mb-3 block"></i>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      <span className="text-xs text-gray-500">{hint}</span>
    </div>
  );
}
