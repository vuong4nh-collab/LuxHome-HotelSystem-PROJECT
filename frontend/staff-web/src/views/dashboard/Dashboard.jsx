import React from 'react';
import WidgetsDropdown from './WidgetsDropdown';
import TrafficCard from './TrafficCard';
import SocialWidgets from './SocialWidgets';
import { useDashboard } from '../../hooks/useDashboard';

export default function Dashboard() {
  const {
    stats,
    trafficRange,
    traffic,
    social,
    loadingTraffic,
    setTrafficRange,
    exportTrafficData,
  } = useDashboard();

  return (
    <div className="dashboard-view-container">
      {/* 4 Colored Stat Widgets with Mini Charts */}
      <WidgetsDropdown stats={stats} />

      {/* Main Traffic Card with 3-line chart & 5-metric summary bar */}
      <TrafficCard
        traffic={traffic}
        trafficRange={trafficRange}
        onRangeChange={setTrafficRange}
        onExport={exportTrafficData}
        loading={loadingTraffic}
      />

      {/* 3 Social Media Metric Cards */}
      <SocialWidgets social={social} />
    </div>
  );
}
