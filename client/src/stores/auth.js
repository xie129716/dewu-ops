import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('dewu_token') || '');

  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const points = computed(() => user.value?.points || 0);

  function applyToken() {
    if (token.value) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }

  async function login(payload) {
    const data = await api.post('/auth/login', payload);
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('dewu_token', data.token);
    applyToken();
    return data;
  }

  async function register(username, password) {
    const data = await api.post('/auth/register', { username, password });
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('dewu_token', data.token);
    applyToken();
    return data;
  }

  async function fetchUser() {
    if (!token.value) return;
    applyToken();
    try {
      const data = await api.get('/auth/me');
      user.value = { id: data.id, username: data.username, points: data.points || 0, isAdmin: !!data.isAdmin };
    } catch (e) {
      logout();
    }
  }

  async function refreshPoints() {
    try {
      const data = await api.get('/points/balance');
      if (user.value) user.value.points = data.points;
    } catch (e) { /* ignore */ }
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('dewu_token');
    delete api.defaults.headers.common['Authorization'];
  }

  applyToken();

  return { user, token, isLoggedIn, points, login, register, fetchUser, refreshPoints, logout };
});
