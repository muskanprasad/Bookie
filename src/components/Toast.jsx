export default function Toast({ toasts, removeToast }) {
  if (toasts.length === 0) return null;
  
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.type === 'success' && <span>✓</span>}
          {toast.type === 'error' && <span>⚠️</span>}
          {toast.type === 'info' && <span>ℹ️</span>}
          <div className="toast-message">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}
