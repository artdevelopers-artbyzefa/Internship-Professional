import React from 'react';

export default function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
           onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ModalTitle({ children }) {
  return <div className="text-base font-bold text-primary mb-1">{children}</div>;
}

export function ModalSub({ children }) {
  return <div className="text-sm text-gray-500 mb-5">{children}</div>;
}
