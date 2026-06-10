<template>
  <div class="auth-page" v-if="!authed">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">🔐</span>
        <h1>管理员登录</h1>
      </div>
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <input v-model="password" class="input" type="password" placeholder="管理员密码" />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button type="submit" class="btn btn-accent btn-lg full-width">验证</button>
      </form>
    </div>
  </div>

  <div v-else class="page-container">
    <div class="page-header">
      <h1>🔐 管理员配置</h1>
      <p>系统 API Key 管理（所有用户共用）</p>
    </div>

    <div class="card admin-card">
      <div class="card-header">
        <h3>服务状态</h3>
      </div>
      <div class="status-grid">
        <div v-for="s in services" :key="s.key" class="status-item">
          <span class="status-dot" :class="{ active: apiStatus[s.key] }"></span>
          <span>{{ s.name }}</span>
        </div>
      </div>
    </div>

    <div class="card admin-card">
      <div class="card-header"><h3>API Key 配置</h3></div>
      <div class="admin-form">
        <div class="form-row" v-for="s in services" :key="s.key">
          <label>{{ s.name }} ({{ s.desc }})</label>
          <input v-model="keys[s.key]" class="input" type="password" :placeholder="s.placeholder" />
        </div>
        <button class="btn btn-accent" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '💾 保存全部' }}
        </button>
        <div v-if="saveMsg" class="save-msg" :class="saveOk ? 'ok' : 'err'">{{ saveMsg }}</div>
      </div>
    </div>

    <button class="btn btn-ghost btn-sm" @click="authed = false">退出管理</button>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '@/api';

const authed = ref(sessionStorage.getItem('admin_authed') === '1');
const password = ref('');
const error = ref('');
const saving = ref(false);
const saveMsg = ref('');
const saveOk = ref(false);

const apiStatus = reactive({ bailian: false, deepseek: false, img65535: false });
const keys = reactive({ bailian: '', deepseek: '', img65535: '' });

const services = [
  { key: 'bailian', name: '阿里云百炼', desc: '识图 qwen-vl-max', placeholder: 'sk-...' },
  { key: 'deepseek', name: 'DeepSeek', desc: '文案 deepseek-v4-pro', placeholder: 'sk-...' },
  { key: 'img65535', name: '65535 平台', desc: '生图 gpt-image-2', placeholder: 'sk-...' },
];

async function handleLogin() {
  error.value = '';
  try {
    await api.post('/settings/apikeys', {
      adminSecret: password.value,
    });
    sessionStorage.setItem('admin_authed', '1');
    authed.value = true;
    await loadStatus();
  } catch (e) {
    error.value = e.message;
  }
}

async function handleSave() {
  saveMsg.value = '';
  saving.value = true;
  try {
    await api.post('/settings/apikeys', {
      adminSecret: sessionStorage.getItem('admin_pwd') || password.value,
      bailian_api_key: keys.bailian || undefined,
      deepseek_api_key: keys.deepseek || undefined,
      img65535_api_key: keys.img65535 || undefined,
    });
    saveOk.value = true;
    saveMsg.value = '保存成功';
    await loadStatus();
  } catch (e) {
    saveOk.value = false;
    saveMsg.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function loadStatus() {
  try {
    const data = await api.get('/settings/status');
    apiStatus.bailian = data.bailian;
    apiStatus.deepseek = data.deepseek;
    apiStatus.img65535 = data.img65535;
  } catch (e) { /* ignore */ }
}

onMounted(() => {
  if (authed.value) {
    sessionStorage.setItem('admin_pwd', password.value || sessionStorage.getItem('admin_pwd') || '');
    loadStatus();
  }
});
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { background: var(--dewu-card); border: 1px solid var(--dewu-border); border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; }
.auth-header { text-align: center; margin-bottom: 32px; }
.auth-icon { font-size: 48px; }
.auth-header h1 { font-size: 22px; font-weight: 700; color: #fff; margin-top: 12px; }
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.error-msg { color: var(--dewu-accent); font-size: 13px; padding: 8px 12px; background: rgba(255, 77, 79, 0.08); border-radius: 6px; }
.full-width { width: 100%; }

.admin-card { margin-bottom: 20px; }
.status-grid { display: flex; gap: 24px; }
.status-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--dewu-text-secondary); }
.admin-form { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-row label { font-size: 13px; color: var(--dewu-text-secondary); }
.save-msg { margin-top: 8px; font-size: 13px; }
.save-msg.ok { color: var(--dewu-green); }
.save-msg.err { color: var(--dewu-accent); }
</style>
