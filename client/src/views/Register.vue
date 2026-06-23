<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">👟</span>
        <h1>多平台运营系统</h1>
        <p>创建你的账号</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="username"
            class="input"
            placeholder="2-20个字符"
            autocomplete="username"
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input
            v-model="password"
            class="input"
            type="password"
            placeholder="至少6位"
            autocomplete="new-password"
          />
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
const error = ref('');
const loading = ref(false);

async function handleRegister() {
  error.value = '';
  if (!username.value || !password.value) {
    error.value = '请填写用户名和密码';
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
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255, 107, 53, 0.06) 0%, transparent 50%),
    var(--dewu-base);
}

.auth-card {
  background: var(--dewu-card);
  border: 1px solid var(--dewu-border);
  border-radius: var(--dewu-radius);
  padding: 44px 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--dewu-shadow-lg);
}

.auth-header {
  text-align: center;
  margin-bottom: 36px;
}

.auth-icon { font-size: 44px; }

.auth-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--dewu-heading);
  margin: 16px 0 6px;
  letter-spacing: -0.02em;
}

.auth-header p {
  color: var(--dewu-text-muted);
  font-size: 14px;
}

/* ——— Form ——— */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  color: var(--dewu-text-secondary);
  font-weight: 500;
}

.error-msg {
  color: var(--dewu-accent);
  font-size: 13px;
  padding: 10px 14px;
  background: rgba(255, 107, 53, 0.08);
  border: 1px solid rgba(255, 107, 53, 0.15);
  border-radius: var(--dewu-radius-sm);
}

.full-width { width: 100%; }

/* ——— Footer ——— */
.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--dewu-text-muted);
}

.auth-footer a {
  color: var(--dewu-accent);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

.auth-footer a:hover {
  color: var(--dewu-accent-hover);
}
</style>
