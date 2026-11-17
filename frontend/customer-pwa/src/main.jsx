import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Tự động hủy đăng ký Service Worker và xóa cache cũ trên localhost để tránh dính mã cũ
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#FEF2F2', color: '#991B1B', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Đã xảy ra lỗi giao diện:</h2>
          <pre style={{ background: '#FFF', padding: '12px', borderRadius: '8px', border: '1px solid #FCA5A5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '16px', padding: '10px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Xóa Cache &amp; Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
