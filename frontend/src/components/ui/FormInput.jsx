import React from 'react';

export function FormGroup({ label, error, children }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>}
      {children}
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
    </div>
  );
}

export function InputWrap({ iconLeft, iconRight, onToggleRight, children }) {
  return (
    <div className="relative">
      {iconLeft && (
        <i className={`fas ${iconLeft} absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm`}></i>
      )}
      {children}
      {iconRight && (
        <i className={`fas ${iconRight} absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm cursor-pointer`}
          onClick={onToggleRight}></i>
      )}
    </div>
  );
}

const inputBase = 'w-full border border-gray-200 rounded-xl font-poppins text-sm text-gray-700 outline-none transition-all duration-200 focus:border-secondary focus:ring-2 focus:ring-blue-500/10 py-2.5';

export function TextInput({ iconLeft, iconRight, onToggleRight, type = 'text', placeholder, value, onChange, className = '', ...props }) {
  const pl = iconLeft ? 'pl-9' : 'pl-3.5';
  const pr = iconRight ? 'pr-9' : 'pr-3.5';
  return (
    <InputWrap iconLeft={iconLeft} iconRight={iconRight} onToggleRight={onToggleRight}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`${inputBase} ${pl} ${pr} ${className}`}
        {...props}
      />
    </InputWrap>
  );
}

export function SelectInput({ iconLeft, value, onChange, children, className = '', ...props }) {
  const pl = iconLeft ? 'pl-9' : 'pl-3.5';
  return (
    <InputWrap iconLeft={iconLeft}>
      <select
        value={value}
        onChange={onChange}
        className={`${inputBase} ${pl} pr-9 bg-white appearance-none ${className}`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%236B7280'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
        {...props}
      >
        {children}
      </select>
    </InputWrap>
  );
}

export function TextareaInput({ value, onChange, rows = 3, placeholder, className = '', ...props }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      className={`${inputBase} pl-3.5 pr-3.5 resize-vertical ${className}`}
      {...props}
    />
  );
}
