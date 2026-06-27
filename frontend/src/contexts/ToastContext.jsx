import React, { createContext, useContext, useState, useCallback } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-100',
          text: 'text-emerald-800',
          icon: <FaCheckCircle className="text-emerald-500 text-base" />,
          progress: 'bg-emerald-500'
        };
      case 'error':
        return {
          bg: 'bg-rose-50 border-rose-100',
          text: 'text-rose-800',
          icon: <FaExclamationCircle className="text-rose-500 text-base" />,
          progress: 'bg-rose-500'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-100',
          text: 'text-amber-800',
          icon: <FaExclamationTriangle className="text-amber-500 text-base" />,
          progress: 'bg-amber-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-100',
          text: 'text-blue-800',
          icon: <FaInfoCircle className="text-blue-500 text-base" />,
          progress: 'bg-blue-500'
        };
    }
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed top-6 right-6 z-55 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto
                flex items-start gap-3 p-4
                rounded-2xl border shadow-lg
                backdrop-blur-md
                animate-slide-in-right
                transition-all duration-300
                ${styles.bg} ${styles.text}
              `}
            >
              <div className="shrink-0 mt-0.5">{styles.icon}</div>
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <FaTimes className="text-[10px]" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
