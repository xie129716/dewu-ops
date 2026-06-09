<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">👟</span>
        <h1>得物运营系统</h1>
        <p>注册新账号</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="username" class="input" placeholder="2-20个字符" autocomplete="username" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" class="input" type="password" placeholder="至少6位" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label>确认密码</label>
          <input v-model="confirmPassword" class="input" type="password" placeholder="再次输入密码" autocomplete="new-password" />
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button type="submit" class="btn btn-accent btn-lg full-width" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <div class="auth-footer">
        已有账号？<router-link to="/login">立即登录</router-link>
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

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleRegister() {
  error.value = '';
  if (!username.value || !password.value) {
    error.value = '请填写用户名和密码';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  loading.value = true;
  try {
    await auth.register(username.value, password.value);
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

.auth-header { text-align: center; margin-bottom: 32px; }
.auth-icon { font-size: 48px; }
.auth-header h1 { font-size: 22px; font-weight: 700; color: #fff; margin: 12px 0 4px; }
.auth-header p { color: var(--dewu-text-muted); font-size: 14px; }

.auth-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; color: var(--dewu-text-secondary); font-weight: 500; }

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
