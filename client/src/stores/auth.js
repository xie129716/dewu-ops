import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('dewu_token') || '');

  const isLoggedIn = computed(() => !!token.value && !!user.value);

  // Set up the API Authorization header
  function applyToken() {
    if (token.value) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }

  async function login(payload) {
    // payload: { username, password } or { phone, password }
    const data = await api.post('/auth/login', payload);
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('dewu_token', data.token);
    applyToken();
    return data;
  }

  async function register(usernameOrPhone, codeOrPassword, maybePassword) {
    // Phone-based: (phone, code, password)
    // Username-based: (username, password)
    let payload;
    if (maybePassword) {
      payload = { phone: usernameOrPhone, code: codeOrPassword, password: maybePassword };
    } else {
      payload = { username: usernameOrPhone, password: codeOrPassword };
    }
    const data = await api.post('/auth/register', payload);
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
      user.value = data;
    } catch (e) {
      // Token expired or invalid
      logout();
    }
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('dewu_token');
    delete api.defaults.headers.common['Authorization'];
  }

  // Apply token on init
  applyToken();

  return { user, token, isLoggedIn, login, register, fetchUser, logout };
});
