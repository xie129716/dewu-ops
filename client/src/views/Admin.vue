<template>
  <!-- Not logged in or not admin -->
  <div class="auth-page" v-if="!isAdmin">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">🔐</span>
        <h1>管理员登录</h1>
        <p v-if="!auth.isLoggedIn">请用管理员账号登录</p>
        <p v-else style="color:var(--dewu-accent)">当前账号无管理员权限</p>
      </div>

      <template v-if="!auth.isLoggedIn">
        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <label>管理员账号</label>
            <input v-model="username" class="input" placeholder="admin" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="password" class="input" type="password" placeholder="管理员密码" />
          </div>
          <div v-if="error" class="error-msg">{{ error }}</div>
          <button type="submit" class="btn btn-accent btn-lg full-width" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
      </template>
      <button v-else class="btn btn-ghost full-width" @click="auth.logout(); $router.push('/login')">
        退出当前账号，换管理员登录
      </button>
    </div>
  </div>

  <!-- Admin Panel -->
  <div v-else class="page-container">
    <div class="page-header">
      <h1>🔐 管理员配置</h1>
      <p>全局 API Key（所有用户共用）| 管理员：{{ auth.user?.username }}</p>
    </div>

    <div class="card admin-card">
      <div class="card-header"><h3>服务状态</h3></div>
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

    <button class="btn btn-ghost btn-sm" @click="auth.logout(); $router.push('/login')">退出管理</button>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import api from '@/api';

const auth = useAuthStore();
const router = useRouter();

const username = ref('admin');
const password = ref('');
const error = ref('');
const loading = ref(false);
const saving = ref(false);
const saveMsg = ref('');
const saveOk = ref(false);

const isAdmin = computed(() => auth.isLoggedIn && auth.user?.isAdmin);

const apiStatus = reactive({ bailian: false, deepseek: false, img65535: false });
const keys = reactive({ bailian: '', deepseek: '', img65535: '' });

const services = [
  { key: 'bailian', name: '阿里云百炼', desc: '识图 qwen-vl-max', placeholder: 'sk-...' },
  { key: 'deepseek', name: 'DeepSeek', desc: '文案 deepseek-v4-pro', placeholder: 'sk-...' },
  { key: 'img65535', name: '65535 平台', desc: '生图 gpt-image-2', placeholder: 'sk-...' },
];

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login({ username: username.value, password: password.value });
    if (!auth.user?.isAdmin) {
      error.value = '该账号不是管理员';
      auth.logout();
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saveMsg.value = '';
  saving.value = true;
  try {
    await api.post('/settings/apikeys', {
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
  if (auth.isLoggedIn && auth.user?.isAdmin) {
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
.auth-header p { color: var(--dewu-text-muted); font-size: 14px; margin-top: 4px; }
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; color: var(--dewu-text-secondary); font-weight: 500; }
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
