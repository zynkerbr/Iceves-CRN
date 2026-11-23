import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastContextType {
  showToast: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showToast = useCallback((message: string, duration = 2400) => {
    setToastMessage(message);
    setIsVisible(true);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setToastMessage(null), 300);
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={`toast ${isVisible ? 'show' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </ToastContext.Provider>
  );
}
