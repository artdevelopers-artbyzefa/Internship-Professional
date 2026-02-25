import React from 'react';

export default function Button({ children, variant = 'primary', size = '', block = false, onClick, disabled = false, className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold font-poppins rounded-xl transition-all duration-200 cursor-pointer border-0';
  const sizes = {
    '':   'px-5 py-2.5 text-sm',
    'sm': 'px-3.5 py-1.5 text-xs',
  };
  const variants = {
    'primary':        'bg-secondary text-white hover:bg-blue-700 hover:-translate-y-px hover:shadow-lg hover:shadow-blue-500/30',
    'outline':        'bg-transparent text-secondary border border-secondary hover:bg-lightbg',
    'danger-outline': 'bg-transparent text-danger border border-danger',
    'success':        'bg-success text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${block ? 'w-full' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
