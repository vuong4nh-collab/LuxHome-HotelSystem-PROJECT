import { useState, useEffect, useCallback } from 'react';
import {
  fetchDashboardStats,
  fetchDashboardTraffic,
  fetchDashboardSocial,
} from '../services/dashboardService';

export function useDashboard() {
  const [stats, setStats] = useState(null);
  const [trafficRange, setTrafficRange] = useState('month');
  const [traffic, setTraffic] = useState(null);
  const [social, setSocial] = useState(null);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);

  // Fetch initial stats and social
  const loadInitialData = useCallback(async () => {
    setLoadingAll(true);
    try {
      const [sData, socData] = await Promise.all([
        fetchDashboardStats(),
        fetchDashboardSocial(),
      ]);
      setStats(sData);
      setSocial(socData);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  // Fetch traffic when range changes
  const loadTraffic = useCallback(async (range) => {
    setLoadingTraffic(true);
    try {
      const tData = await fetchDashboardTraffic(range);
      setTraffic(tData);
    } finally {
      setLoadingTraffic(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadTraffic(trafficRange);
  }, [trafficRange, loadTraffic]);

  const handleRangeChange = (newRange) => {
    if (newRange !== trafficRange) {
      setTrafficRange(newRange);
    }
  };

  const exportTrafficData = () => {
    if (!traffic || !traffic.data) return;
    const headers = ['Time', 'Visits', 'New Users', 'Threshold Target'];
    const rows = traffic.data.map(item => [
      `"${item.name}"`,
      item.visits,
      item.newUsers,
      item.threshold,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traffic_report_${trafficRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    stats,
    trafficRange,
    traffic,
    social,
    loadingTraffic,
    loadingAll,
    setTrafficRange: handleRangeChange,
    exportTrafficData,
    refreshAll: loadInitialData,
  };
}
