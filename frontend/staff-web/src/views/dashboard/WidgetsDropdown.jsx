import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Tooltip,
} from 'recharts';
import { MoreVertical, ArrowDown, ArrowUp } from 'lucide-react';

export default function WidgetsDropdown({ stats }) {
  const [openDropdown, setOpenDropdown] = useState(null);

  // Default series if stats is loading
  const usersSeries = stats?.users?.series?.map((val, idx) => ({ val, i: idx })) || [
    { val: 65, i: 0 }, { val: 59, i: 1 }, { val: 84, i: 2 }, { val: 84, i: 3 },
    { val: 51, i: 4 }, { val: 55, i: 5 }, { val: 40, i: 6 },
  ];

  const incomeSeries = stats?.income?.series?.map((val, idx) => ({ val, i: idx })) || [
    { val: 1, i: 0 }, { val: 18, i: 1 }, { val: 9, i: 2 }, { val: 17, i: 3 },
    { val: 34, i: 4 }, { val: 22, i: 5 }, { val: 11, i: 6 },
  ];

  const conversionSeries = stats?.conversion?.series?.map((val, idx) => ({ val, i: idx })) || [
    { val: 78, i: 0 }, { val: 81, i: 1 }, { val: 80, i: 2 }, { val: 45, i: 3 },
    { val: 34, i: 4 }, { val: 12, i: 5 }, { val: 40, i: 6 },
  ];

  const sessionsSeries = stats?.sessions?.series?.map((val, idx) => ({ val, i: idx })) || [
    { val: 78, i: 0 }, { val: 81, i: 1 }, { val: 80, i: 2 }, { val: 45, i: 3 },
    { val: 34, i: 4 }, { val: 12, i: 5 }, { val: 40, i: 6 }, { val: 85, i: 7 },
    { val: 65, i: 8 }, { val: 23, i: 9 }, { val: 12, i: 10 }, { val: 98, i: 11 },
    { val: 34, i: 12 }, { val: 84, i: 13 }, { val: 67, i: 14 }, { val: 82, i: 15 },
  ];

  const toggleDropdown = (id, e) => {
    e.stopPropagation();
    setOpenDropdown(prev => (prev === id ? null : id));
  };

  const renderDropdownMenu = (id) => {
    if (openDropdown !== id) return null;
    return (
      <div className="widget-menu" onClick={e => e.stopPropagation()}>
        <button type="button" className="widget-menu-item" onClick={() => setOpenDropdown(null)}>Action</button>
        <button type="button" className="widget-menu-item" onClick={() => setOpenDropdown(null)}>Another action</button>
        <button type="button" className="widget-menu-item" onClick={() => setOpenDropdown(null)}>Something else</button>
      </div>
    );
  };

  return (
    <div className="widgets-dropdown-grid" onClick={() => setOpenDropdown(null)}>
      {/* 1. USERS WIDGET (Primary #321fdb) */}
      <div className="widget-card widget-primary">
        <div className="widget-header">
          <div className="widget-main-stat">
            <span className="widget-value">{stats?.users?.value || '26K'}</span>
            <span className="widget-change">
              (-12.4% <ArrowDown size={13} style={{ display: 'inline' }} />)
            </span>
          </div>
          <div className="widget-actions">
            <button
              type="button"
              className="widget-menu-btn"
              onClick={(e) => toggleDropdown('users', e)}
              aria-label="Options"
            >
              <MoreVertical size={18} />
            </button>
            {renderDropdownMenu('users')}
          </div>
        </div>
        <div className="widget-label">Users</div>
        <div className="widget-chart-wrapper">
          <ResponsiveContainer width="100%" height={70}>
            <LineChart data={usersSeries} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return <div className="mini-tooltip">{payload[0].value}</div>;
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="val"
                stroke="rgba(255,255,255,.65)"
                strokeWidth={2}
                dot={{ r: 4, fill: '#321fdb', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#ffffff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. INCOME WIDGET (Info #3399ff) */}
      <div className="widget-card widget-info">
        <div className="widget-header">
          <div className="widget-main-stat">
            <span className="widget-value">{stats?.income?.value || '$6.200'}</span>
            <span className="widget-change">
              (40.9% <ArrowUp size={13} style={{ display: 'inline' }} />)
            </span>
          </div>
          <div className="widget-actions">
            <button
              type="button"
              className="widget-menu-btn"
              onClick={(e) => toggleDropdown('income', e)}
              aria-label="Options"
            >
              <MoreVertical size={18} />
            </button>
            {renderDropdownMenu('income')}
          </div>
        </div>
        <div className="widget-label">Income</div>
        <div className="widget-chart-wrapper">
          <ResponsiveContainer width="100%" height={70}>
            <LineChart data={incomeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return <div className="mini-tooltip">{payload[0].value}</div>;
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="val"
                stroke="rgba(255,255,255,.65)"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3399ff', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#ffffff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. CONVERSION RATE WIDGET (Warning #f9b115) */}
      <div className="widget-card widget-warning">
        <div className="widget-header">
          <div className="widget-main-stat">
            <span className="widget-value">{stats?.conversion?.value || '2.49%'}</span>
            <span className="widget-change">
              (84.7% <ArrowUp size={13} style={{ display: 'inline' }} />)
            </span>
          </div>
          <div className="widget-actions">
            <button
              type="button"
              className="widget-menu-btn"
              onClick={(e) => toggleDropdown('conversion', e)}
              aria-label="Options"
            >
              <MoreVertical size={18} />
            </button>
            {renderDropdownMenu('conversion')}
          </div>
        </div>
        <div className="widget-label">Conversion Rate</div>
        <div className="widget-chart-wrapper">
          <ResponsiveContainer width="100%" height={70}>
            <AreaChart data={conversionSeries} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="warningAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return <div className="mini-tooltip">{payload[0].value}%</div>;
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke="rgba(255,255,255,.7)"
                strokeWidth={2}
                fill="url(#warningAreaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. SESSIONS WIDGET (Danger #e55353) */}
      <div className="widget-card widget-danger">
        <div className="widget-header">
          <div className="widget-main-stat">
            <span className="widget-value">{stats?.sessions?.value || '44K'}</span>
            <span className="widget-change">
              (-23.6% <ArrowDown size={13} style={{ display: 'inline' }} />)
            </span>
          </div>
          <div className="widget-actions">
            <button
              type="button"
              className="widget-menu-btn"
              onClick={(e) => toggleDropdown('sessions', e)}
              aria-label="Options"
            >
              <MoreVertical size={18} />
            </button>
            {renderDropdownMenu('sessions')}
          </div>
        </div>
        <div className="widget-label">Sessions</div>
        <div className="widget-chart-wrapper">
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={sessionsSeries} margin={{ top: 10, right: 5, left: 5, bottom: 0 }} barCategoryGap="20%">
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return <div className="mini-tooltip">{payload[0].value}</div>;
                  }
                  return null;
                }}
              />
              <Bar dataKey="val" fill="rgba(255,255,255,.35)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
