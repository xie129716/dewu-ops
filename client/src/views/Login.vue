<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">👟</span>
        <h1>得物运营系统</h1>
        <p>登录你的账号</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>用户名 / 手机号</label>
          <input v-model="account" class="input" placeholder="输入用户名或手机号" autocomplete="username" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" class="input" type="password" placeholder="输入密码" autocomplete="current-password" />
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button type="submit" class="btn btn-accent btn-lg full-width" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="auth-footer">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const account = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  if (!account.value || !password.value) {
    error.value = '请填写账号和密码';
    return;
  }
  loading.value = true;
  try {
    // Auto-detect: phone number or username
    const isPhone = /^1[3-9]\d{9}$/.test(account.value);
    const payload = isPhone
      ? { phone: account.value, password: password.value }
      : { username: account.value, password: password.value };
    await auth.login(payload);
    router.push('/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  background: var(--dewu-card);
  border: 1px solid var(--dewu-border);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-icon { font-size: 48px; }

.auth-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 12px 0 4px;
}

.auth-header p {
  color: var(--dewu-text-muted);
  font-size: 14px;
}

.auth-form { display: flex; flex-direction: column; gap: 16px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-group label {
  font-size: 13px;
  color: var(--dewu-text-secondary);
  font-weight: 500;
}

.error-msg {
  color: var(--dewu-accent);
  font-size: 13px;
  padding: 8px 12px;
  background: rgba(255, 77, 79, 0.08);
  border-radius: 6px;
}

.full-width { width: 100%; }

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--dewu-text-muted);
}

.auth-footer a { color: var(--dewu-blue); text-decoration: none; }
.auth-footer a:hover { text-decoration: underline; }
</style>
