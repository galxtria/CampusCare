import React, { createContext, useCallback, useContext, useState } from 'react';
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let toastId = 0;

const ICONS = {
  success: { Icon: CircleCheck, classes: 'bg-emerald-50 text-emerald-600 ring-emerald-600/20' },
  error: { Icon: CircleAlert, classes: 'bg-red-50 text-red-600 ring-red-600/20' },
  info: { Icon: Info, classes: 'bg-blue-50 text-blue-600 ring-blue-600/20' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((key) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  const push = useCallback(
    (type, message) => {
      const key = ++toastId;
      setToasts((prev) => [...prev, { key, type, message }]);
      setTimeout(() => dismiss(key), 4000);
    },
    [dismiss]
  );

  const toast = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {toasts.map(({ key, type, message }) => {
          const { Icon, classes } = ICONS[type] || ICONS.info;
          return (
            <div
              key={key}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl bg-white p-3 shadow-lg ring-1 ${classes}`}
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm font-medium text-gray-800">{message}</p>
              <button
                onClick={() => dismiss(key)}
                className="rounded p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <ToastProvider>');
  return ctx;
}
