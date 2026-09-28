import React from 'react';

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="footer-left">
        <a href="https://coreui.io" target="_blank" rel="noreferrer" className="footer-brand">CoreUI</a>
        <span> &copy; 2026 creativeLabs / LuxStay Hotel Suite.</span>
      </div>
      <div className="footer-right">
        <span>Powered by </span>
        <a href="https://coreui.io/react" target="_blank" rel="noreferrer" className="footer-link">CoreUI &amp; React</a>
      </div>
    </footer>
  );
}
