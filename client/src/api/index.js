import axios from 'axios';

// 生产环境通过 VITE_API_BASE 环境变量指定后端地址
// Vercel 部署时在 dashboard 设置: VITE_API_BASE=https://your-backend.railway.app/api
const baseURL = import.meta.env.VITE_API_BASE || '/api';

const api = axios.create({
  baseURL,
  timeout: 300000, // 5 minutes for long operations
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || '请求失败';
    console.error('[API Error]', message);

    // Auto-redirect to login on 401 (except for auth endpoints)
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      localStorage.removeItem('dewu_token');
      window.location.href = '/login';
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
