import React from 'react';

export default function TrafficSummary({ summary }) {
  const defaultSummary = [
    { label: 'Visits', value: '29.703 Users (40%)', percent: 40, color: '#2eb85c' },
    { label: 'Unique', value: '24.093 Users (20%)', percent: 20, color: '#3399ff' },
    { label: 'Pageviews', value: '78.706 Views (60%)', percent: 60, color: '#f9b115' },
    { label: 'New Users', value: '22.123 Users (80%)', percent: 80, color: '#e55353' },
    { label: 'Bounce Rate', value: '40.15%', percent: 40.15, color: '#321fdb' },
  ];

  const items = summary && summary.length === 5 ? summary : defaultSummary;

  return (
    <div className="traffic-summary-row">
      {items.map((item, idx) => (
        <div key={idx} className="traffic-summary-col">
          <span className="summary-label">{item.label}</span>
          <strong className="summary-value">{item.value}</strong>
          <div className="summary-progress-bg">
            <div
              className="summary-progress-bar"
              style={{
                width: `${Math.min(100, Math.max(0, item.percent))}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
