import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const ModalContext = createContext(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(null);

  const showConfirm = useCallback((config) => {
    return new Promise((resolve) => {
      setModalConfig({
        ...config,
        resolve,
        isOpen: true,
        isLoading: false,
      });
    });
  }, []);

  const closeConfirm = useCallback((result) => {
    if (modalConfig && modalConfig.resolve) {
      modalConfig.resolve(result);
    }
    setModalConfig(null);
  }, [modalConfig]);

  const showLoading = useCallback((title = 'Loading...', description = 'Please wait while we perform this task.') => {
    setLoadingConfig({ title, description, isProcessing: false, progress: 0 });
  }, []);

  const showProcessing = useCallback((title = 'Processing...', description = 'Please wait...', progress = 0) => {
    setLoadingConfig({ title, description, isProcessing: true, progress });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingConfig(null);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (modalConfig && !modalConfig.isLoading) {
          closeConfirm(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalConfig, closeConfirm]);

  const getModalIcon = (type) => {
    switch (type) {
      case 'danger':
        return <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-xl border border-rose-100"><FaExclamationTriangle /></div>;
      case 'warning':
        return <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-xl border border-amber-100"><FaExclamationTriangle /></div>;
      case 'success':
        return <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl border border-emerald-100"><FaCheckCircle /></div>;
      case 'info':
      default:
        return <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xl border border-blue-100"><FaInfoCircle /></div>;
    }
  };

  return (
    <ModalContext.Provider value={{ showConfirm, showLoading, showProcessing, hideLoading }}>
      {children}

      {/* Confirmation Modal Backdrop */}
      {modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-zoom-in">
            <div className="p-6 flex flex-col items-center text-center gap-4">
              {getModalIcon(modalConfig.type)}
              <div>
                <h3 className="font-bold text-slate-800 text-base leading-snug">
                  {modalConfig.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5 px-2">
                  {modalConfig.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => closeConfirm(false)}
                  disabled={modalConfig.isLoading}
                  className="flex-1 font-semibold py-2.5 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 disabled:opacity-50"
                >
                  {modalConfig.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    if (modalConfig.onConfirm) {
                      setModalConfig(prev => ({ ...prev, isLoading: true }));
                      try {
                        await modalConfig.onConfirm();
                      } catch (err) {
                        console.error(err);
                      }
                    }
                    closeConfirm(true);
                  }}
                  disabled={modalConfig.isLoading}
                  className={`
                    flex-1 font-semibold py-2.5 rounded-xl text-xs text-white transition-all shadow-sm flex items-center justify-center gap-1.5
                    ${modalConfig.type === 'danger'
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                      : modalConfig.type === 'success'
                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                        : 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-200'
                    }
                    disabled:opacity-75
                  `}
                >
                  {modalConfig.isLoading ? (
                    <FaSpinner className="animate-spin text-sm" />
                  ) : (
                    modalConfig.confirmText || 'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading & Processing Overlay */}
      {loadingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden p-6 flex flex-col items-center text-center gap-4 animate-zoom-in">
            <div className="relative flex items-center justify-center">
              <FaSpinner className="text-4xl text-cyan-500 animate-spin" />
              {loadingConfig.isProcessing && loadingConfig.progress > 0 && (
                <span className="absolute text-[10px] font-bold text-slate-600">
                  {loadingConfig.progress}%
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-snug">
                {loadingConfig.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {loadingConfig.description}
              </p>
            </div>

            {loadingConfig.isProcessing && loadingConfig.progress > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${loadingConfig.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
