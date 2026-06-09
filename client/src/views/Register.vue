<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">👟</span>
        <h1>得物运营系统</h1>
        <p>手机号注册</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <!-- Phone -->
        <div class="form-group">
          <label>手机号</label>
          <input
            v-model="phone"
            class="input"
            type="tel"
            maxlength="11"
            placeholder="输入手机号"
            autocomplete="tel"
            @input="phone = phone.replace(/\D/g, '')"
          />
        </div>

        <!-- SMS Code + Send Button -->
        <div class="form-group">
          <label>短信验证码</label>
          <div class="code-row">
            <input
              v-model="code"
              class="input code-input"
              type="text"
              maxlength="6"
              placeholder="6位验证码"
              autocomplete="one-time-code"
              @input="code = code.replace(/\D/g, '')"
            />
            <button
              type="button"
              class="btn btn-ghost send-btn"
              :disabled="countdown > 0 || !phoneValid"
              @click="handleSendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>

        <!-- Password -->
        <div class="form-group">
          <label>设置密码</label>
          <input
            v-model="password"
            class="input"
            type="password"
            placeholder="至少6位"
            autocomplete="new-password"
          />
        </div>

        <!-- Error -->
        <div v-if="error" class="error-msg">{{ error }}</div>
        <!-- Dev code hint -->
        <div v-if="devCode" class="dev-hint">🔧 开发模式验证码：<strong>{{ devCode }}</strong></div>

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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/api';

const router = useRouter();
const auth = useAuthStore();

const phone = ref('');
const code = ref('');
const password = ref('');
const bizToken = ref('');
const error = ref('');
const devCode = ref('');
const loading = ref(false);
const countdown = ref(0);
let timer = null;

const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value));

async function handleSendCode() {
  error.value = '';
  devCode.value = '';
  if (!phoneValid.value) {
    error.value = '请输入正确的手机号';
    return;
  }
  try {
    const data = await api.post('/auth/send-code', { phone: phone.value });
    bizToken.value = data.bizToken;
    if (data.devCode) {
      devCode.value = data.devCode;
    }
    // Start countdown
    countdown.value = 60;
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(timer);
        timer = null;
      }
    }, 1000);
  } catch (e) {
    error.value = e.message;
  }
}

async function handleRegister() {
  error.value = '';
  if (!phoneValid.value) {
    error.value = '请输入正确的手机号';
    return;
  }
  if (!code.value || code.value.length !== 6) {
    error.value = '请输入6位短信验证码';
    return;
  }
  if (!bizToken.value) {
    error.value = '请先获取验证码';
    return;
  }
  if (!password.value || password.value.length < 6) {
    error.value = '密码长度至少6位';
    return;
  }
  loading.value = true;
  try {
    await auth.register(phone.value, code.value, password.value, bizToken.value);
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
  max-width: 420px;
}

.auth-header { text-align: center; margin-bottom: 32px; }
.auth-icon { font-size: 48px; }
.auth-header h1 { font-size: 22px; font-weight: 700; color: #fff; margin: 12px 0 4px; }
.auth-header p { color: var(--dewu-text-muted); font-size: 14px; }

.auth-form { display: flex; flex-direction: column; gap: 16px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; color: var(--dewu-text-secondary); font-weight: 500; }

.code-row { display: flex; gap: 10px; }
.code-input { flex: 1; }
.send-btn {
  white-space: nowrap;
  min-width: 110px;
  font-size: 13px;
}
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.error-msg {
  color: var(--dewu-accent);
  font-size: 13px;
  padding: 8px 12px;
  background: rgba(255, 77, 79, 0.08);
  border-radius: 6px;
}

.dev-hint {
  color: var(--dewu-orange);
  font-size: 13px;
  padding: 8px 12px;
  background: rgba(250, 140, 22, 0.08);
  border-radius: 6px;
  text-align: center;
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
