import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === id ? { ...toast, exiting: true } : toast
      )
    );

    setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID();
    const newToast = { id, message, type, exiting: false };
    
    setToasts((currentToasts) => [...currentToasts, newToast]);
    
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  return { toasts, addToast, removeToast };
}
