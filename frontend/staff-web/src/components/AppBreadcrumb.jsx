import React from 'react';

const routeLabels = {
  dashboard: ['Home', 'Dashboard'],
  'theme-colors': ['Home', 'Theme', 'Colors'],
  'theme-typography': ['Home', 'Theme', 'Typography'],
  rooms: ['Home', 'Hotel', 'Sơ Đồ Phòng'],
  bookings: ['Home', 'Hotel', 'Đặt Phòng'],
  checkin: ['Home', 'Hotel', 'Check-In & Check-Out'],
  housekeeping: ['Home', 'Hotel', 'Buồng Phòng'],
  services: ['Home', 'Hotel', 'Order Dịch Vụ'],
  invoices: ['Home', 'Hotel', 'Hóa Đơn & Báo Cáo'],
  charts: ['Home', 'Components', 'Charts'],
  widgets: ['Home', 'Components', 'Widgets'],
  docs: ['Home', 'Extras', 'Docs'],
  users: ['Home', 'System', 'Users'],
  settings: ['Home', 'System', 'Settings'],
};

export default function AppBreadcrumb({ activeNav, onSelectNav }) {
  const crumbs = routeLabels[activeNav] || ['Home', activeNav];

  return (
    <div className="app-breadcrumb-container">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb-list">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <li
                key={idx}
                className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {!isLast ? (
                  <button
                    type="button"
                    className="breadcrumb-link"
                    onClick={() => {
                      if (idx === 0) onSelectNav('dashboard');
                    }}
                  >
                    {crumb}
                  </button>
                ) : (
                  <span>{crumb}</span>
                )}
                {!isLast && <span className="breadcrumb-separator">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
