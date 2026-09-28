import api from '../api';

const defaultStats = {
  users: {
    value: '26K',
    change: '(-12.4% ↓)',
    isPositive: false,
    series: [65, 59, 84, 84, 51, 55, 40],
  },
  income: {
    value: '$6.200',
    change: '(40.9% ↑)',
    isPositive: true,
    series: [1, 18, 9, 17, 34, 22, 11],
  },
  conversion: {
    value: '2.49%',
    change: '(84.7% ↑)',
    isPositive: true,
    series: [78, 81, 80, 45, 34, 12, 40],
  },
  sessions: {
    value: '44K',
    change: '(-23.6% ↓)',
    isPositive: false,
    series: [78, 81, 80, 45, 34, 12, 40, 85, 65, 23, 12, 98, 34, 84, 67, 82],
  },
};

const defaultTrafficData = {
  day: {
    periodText: 'Monday - Sunday (Current Week)',
    data: [
      { name: 'Mon', visits: 53, newUsers: 40, threshold: 65 },
      { name: 'Tue', visits: 95, newUsers: 70, threshold: 65 },
      { name: 'Wed', visits: 140, newUsers: 95, threshold: 65 },
      { name: 'Thu', visits: 110, newUsers: 80, threshold: 65 },
      { name: 'Fri', visits: 165, newUsers: 125, threshold: 65 },
      { name: 'Sat', visits: 190, newUsers: 140, threshold: 65 },
      { name: 'Sun', visits: 175, newUsers: 130, threshold: 65 },
    ],
    summary: [
      { label: 'Visits', value: '18.420 Users (42%)', percent: 42, color: '#2eb85c' },
      { label: 'Unique', value: '14.150 Users (25%)', percent: 25, color: '#3399ff' },
      { label: 'Pageviews', value: '52.300 Views (55%)', percent: 55, color: '#f9b115' },
      { label: 'New Users', value: '15.200 Users (75%)', percent: 75, color: '#e55353' },
      { label: 'Bounce Rate', value: '38.20%', percent: 38.2, color: '#321fdb' },
    ],
  },
  month: {
    periodText: 'January - July 2021',
    data: [
      { name: 'January', visits: 65, newUsers: 50, threshold: 65 },
      { name: 'February', visits: 140, newUsers: 95, threshold: 65 },
      { name: 'March', visits: 115, newUsers: 80, threshold: 65 },
      { name: 'April', visits: 160, newUsers: 110, threshold: 65 },
      { name: 'May', visits: 145, newUsers: 90, threshold: 65 },
      { name: 'June', visits: 175, newUsers: 120, threshold: 65 },
      { name: 'July', visits: 165, newUsers: 115, threshold: 65 },
    ],
    summary: [
      { label: 'Visits', value: '29.703 Users (40%)', percent: 40, color: '#2eb85c' },
      { label: 'Unique', value: '24.093 Users (20%)', percent: 20, color: '#3399ff' },
      { label: 'Pageviews', value: '78.706 Views (60%)', percent: 60, color: '#f9b115' },
      { label: 'New Users', value: '22.123 Users (80%)', percent: 80, color: '#e55353' },
      { label: 'Bounce Rate', value: '40.15%', percent: 40.15, color: '#321fdb' },
    ],
  },
  year: {
    periodText: '2018 - 2024 (Annual Trends)',
    data: [
      { name: '2018', visits: 120, newUsers: 85, threshold: 65 },
      { name: '2019', visits: 145, newUsers: 105, threshold: 65 },
      { name: '2020', visits: 110, newUsers: 80, threshold: 65 },
      { name: '2021', visits: 160, newUsers: 115, threshold: 65 },
      { name: '2022', visits: 185, newUsers: 130, threshold: 65 },
      { name: '2023', visits: 195, newUsers: 145, threshold: 65 },
      { name: '2024', visits: 210, newUsers: 155, threshold: 65 },
    ],
    summary: [
      { label: 'Visits', value: '142.850 Users (45%)', percent: 45, color: '#2eb85c' },
      { label: 'Unique', value: '110.200 Users (22%)', percent: 22, color: '#3399ff' },
      { label: 'Pageviews', value: '380.400 Views (68%)', percent: 68, color: '#f9b115' },
      { label: 'New Users', value: '95.600 Users (82%)', percent: 82, color: '#e55353' },
      { label: 'Bounce Rate', value: '35.40%', percent: 35.4, color: '#321fdb' },
    ],
  },
};

const defaultSocial = {
  facebook: { friends: '89k', feeds: '459' },
  twitter: { followers: '973k', tweets: '1.792' },
  linkedin: { contacts: '500+', feeds: '1.292' },
};

export const fetchDashboardStats = async () => {
  try {
    const res = await api.get('/dashboard/stats', { _skipAuthRedirect: true });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
  } catch {
    // Graceful fallback to default specification data
  }
  return defaultStats;
};

export const fetchDashboardTraffic = async (range = 'month') => {
  try {
    const res = await api.get(`/dashboard/traffic?range=${range}`, { _skipAuthRedirect: true });
    if (res.data?.success && res.data.data) {
      const d = res.data.data;
      const formatted = d.labels.map((label, idx) => ({
        name: label,
        visits: d.visits[idx] ?? 0,
        newUsers: d.newUsers[idx] ?? 0,
        threshold: d.threshold ?? 65,
      }));
      const summaryArr = [
        { label: 'Visits', value: d.summary.visits.value, percent: d.summary.visits.percentage, color: '#2eb85c' },
        { label: 'Unique', value: d.summary.unique.value, percent: d.summary.unique.percentage, color: '#3399ff' },
        { label: 'Pageviews', value: d.summary.pageviews.value, percent: d.summary.pageviews.percentage, color: '#f9b115' },
        { label: 'New Users', value: d.summary.newUsers.value, percent: d.summary.newUsers.percentage, color: '#e55353' },
        { label: 'Bounce Rate', value: d.summary.bounceRate.value, percent: d.summary.bounceRate.percentage, color: '#321fdb' },
      ];
      return {
        periodText: d.periodText,
        data: formatted,
        summary: summaryArr,
      };
    }
  } catch {
    // Graceful fallback
  }
  return defaultTrafficData[range] || defaultTrafficData.month;
};

export const fetchDashboardSocial = async () => {
  try {
    const res = await api.get('/dashboard/social', { _skipAuthRedirect: true });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
  } catch {
    // Graceful fallback
  }
  return defaultSocial;
};
