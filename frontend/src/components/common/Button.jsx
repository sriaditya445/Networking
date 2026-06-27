import React from 'react';
import { FaSpinner } from 'react-icons/fa';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon,
  className = '',
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 focus:ring-slate-100';
      case 'danger':
        return 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-100 focus:ring-rose-200';
      case 'success':
        return 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-100 focus:ring-emerald-200';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-100';
      case 'primary':
      default:
        return 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm shadow-cyan-100 focus:ring-cyan-200';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-[11px] rounded-lg';
      case 'lg':
        return 'px-6 py-3 text-sm rounded-2xl';
      case 'md':
      default:
        return 'px-4 py-2 text-xs rounded-xl';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-1.5
        font-semibold tracking-wide
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.98]
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <FaSpinner className="animate-spin text-sm" />
      ) : (
        icon && <span className="text-sm shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}
