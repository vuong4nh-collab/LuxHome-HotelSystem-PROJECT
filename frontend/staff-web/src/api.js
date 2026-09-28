import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token (support both keys for consistency)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('luxstay_token') || localStorage.getItem('hotel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 without hard window.location.href page reload loop
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('luxstay_token');
      localStorage.removeItem('luxstay_user');
      localStorage.removeItem('hotel_token');
      localStorage.removeItem('hotel_user');

      // Only notify app to switch to login state if not skipped
      if (!err.config?._skipAuthRedirect) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(err);
  }
);

export default api;

