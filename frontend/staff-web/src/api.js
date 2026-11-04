import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    const url = config?.url || '';
    if (err.response?.status === 401 && config && !config._authRetry &&
        !url.includes('/auth/login') && !url.includes('/auth/refresh') &&
        !url.includes('/auth/logout')) {
      config._authRetry = true;
      try {
        await api.post('/auth/refresh');
        return api(config);
      } catch (refreshError) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject(refreshError);
      }
    }
    if (err.response?.status === 401 && !config?._skipAuthRedirect) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(err);
  }
);

export default api;
