import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Download } from 'lucide-react';
import TrafficSummary from './TrafficSummary';

// Custom Tooltip component matching CoreUI index hover mode
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="traffic-tooltip">
        <p className="traffic-tooltip-title">{label}</p>
        {payload.map((item, index) => {
          let name = 'Visits';
          let color = '#3399ff';
          if (item.dataKey === 'newUsers') {
            name = 'New Users';
            color = '#2eb85c';
          } else if (item.dataKey === 'threshold') {
            name = 'Target Threshold';
            color = '#e55353';
          }
          return (
            <div key={index} className="traffic-tooltip-item">
              <span className="tooltip-color-dot" style={{ backgroundColor: color }} />
              <span className="tooltip-item-name">{name}:</span>
              <strong className="tooltip-item-val">{item.value}</strong>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function TrafficCard({
  traffic,
  trafficRange,
  onRangeChange,
  onExport,
  loading,
}) {
  const chartData = traffic?.data || [];
  const periodText = traffic?.periodText || 'January - July 2021';
  const summary = traffic?.summary;

  return (
    <div className="card traffic-card">
      <div className="traffic-card-header">
        <div className="traffic-title-group">
          <h2 className="traffic-title">Traffic</h2>
          <div className="traffic-subtitle">{periodText}</div>
        </div>

        <div className="traffic-actions-group">
          {/* Day / Month / Year Button Group */}
          <div className="btn-group-toggle" role="group" aria-label="Traffic Range">
            <button
              type="button"
              className={`btn-toggle ${trafficRange === 'day' ? 'active' : ''}`}
              onClick={() => onRangeChange('day')}
            >
              Day
            </button>
            <button
              type="button"
              className={`btn-toggle ${trafficRange === 'month' ? 'active' : ''}`}
              onClick={() => onRangeChange('month')}
            >
              Month
            </button>
            <button
              type="button"
              className={`btn-toggle ${trafficRange === 'year' ? 'active' : ''}`}
              onClick={() => onRangeChange('year')}
            >
              Year
            </button>
          </div>

          {/* Download Action Button */}
          <button
            type="button"
            className="btn-download-primary"
            onClick={onExport}
            title="Download CSV / Report"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className={`traffic-chart-container ${loading ? 'is-loading' : ''}`}>
        {loading && (
          <div className="traffic-chart-loader">
            <span className="spinner" />
          </div>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="trafficBlueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3399ff" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#3399ff" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines only */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e7ea" />

            <XAxis
              dataKey="name"
              axisLine={{ stroke: '#d8dbe0' }}
              tickLine={false}
              tick={{ fill: '#768192', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 220]}
              ticks={[50, 100, 150, 200]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#768192', fontSize: 12 }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* 1. Blue Line (Visits) - Smooth curve with light area fill */}
            <Area
              type="monotone"
              dataKey="visits"
              stroke="#3399ff"
              strokeWidth={2}
              fill="url(#trafficBlueGrad)"
              activeDot={{ r: 5, fill: '#3399ff', stroke: '#ffffff', strokeWidth: 2 }}
              dot={false}
            />

            {/* 2. Green Line (New Users) - Smooth curve without fill */}
            <Line
              type="monotone"
              dataKey="newUsers"
              stroke="#2eb85c"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#2eb85c', stroke: '#ffffff', strokeWidth: 2 }}
            />

            {/* 3. Red Dashed Line (Threshold limit ~65) */}
            <Line
              type="monotone"
              dataKey="threshold"
              stroke="#e55353"
              strokeWidth={1.5}
              strokeDasharray="8 5"
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 5-Column Summary Row Underneath */}
      <TrafficSummary summary={summary} />
    </div>
  );
}
