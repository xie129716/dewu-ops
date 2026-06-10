<template>
  <div class="settings-page page-container">
    <div class="page-header">
      <h1>⚙️ 系统状态</h1>
      <p>AI 服务连接状态</p>
    </div>

    <div class="settings-grid">
      <div class="card setting-card" v-for="s in services" :key="s.key">
        <div class="card-header">
          <div class="setting-title">
            <span class="setting-icon">{{ s.icon }}</span>
            <div>
              <h3>{{ s.name }}</h3>
              <p>{{ s.desc }}</p>
            </div>
          </div>
          <span class="status-dot" :class="{ active: status[s.key] }"></span>
        </div>
      </div>
    </div>

    <!-- Admin API Key Config -->
    <div class="admin-section card" v-if="showAdmin">
      <div class="card-header"><h3>🔑 管理员配置</h3></div>
      <div class="admin-form">
        <div class="form-row">
          <input v-model="adminSecret" class="input" type="password" placeholder="管理员密码" />
        </div>
        <div class="form-row">
          <label>百炼 API Key</label>
          <input v-model="keys.bailian" class="input" type="password" placeholder="sk-..." />
        </div>
        <div class="form-row">
          <label>DeepSeek API Key</label>
          <input v-model="keys.deepseek" class="input" type="password" placeholder="sk-..." />
        </div>
        <div class="form-row">
          <label>65535 API Key</label>
          <input v-model="keys.img65535" class="input" type="password" placeholder="sk-..." />
        </div>
        <button class="btn btn-accent" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '💾 保存' }}
        </button>
      </div>
      <div v-if="saveMsg" class="save-msg" :class="saveOk ? 'ok' : 'err'">{{ saveMsg }}</div>
    </div>
    <button class="btn btn-ghost btn-sm" @click="showAdmin = !showAdmin">
      {{ showAdmin ? '收起' : '🔧 管理员配置' }}
    </button>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import api from '@/api';

const settingsStore = useSettingsStore();
const status = reactive({ bailian: false, deepseek: false, img65535: false });
const showAdmin = ref(false);
const adminSecret = ref('');
const keys = reactive({ bailian: '', deepseek: '', img65535: '' });
const saving = ref(false);
const saveMsg = ref('');
const saveOk = ref(false);

const services = [
  { key: 'bailian', icon: '☁️', name: '阿里云百炼', desc: '识图 — qwen-vl-max' },
  { key: 'deepseek', icon: '🤖', name: 'DeepSeek', desc: '文案 — deepseek-v4-pro' },
  { key: 'img65535', icon: '🖼️', name: '65535 平台', desc: '生图 — gpt-image-2' },
];

async function handleSave() {
  saveMsg.value = '';
  saving.value = true;
  try {
    await api.post('/settings/apikeys', {
      adminSecret: adminSecret.value,
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
  await settingsStore.fetchStatus();
  status.bailian = settingsStore.apiKeyStatus.bailian;
  status.deepseek = settingsStore.apiKeyStatus.deepseek;
  status.img65535 = settingsStore.apiKeyStatus.img65535;
}

onMounted(loadStatus);
</script>

<style scoped>
.settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px; }
.setting-card .card-header { margin-bottom: 0; padding-bottom: 12px; }
.setting-title { display: flex; align-items: center; gap: 12px; }
.setting-icon { font-size: 28px; }
.setting-title h3 { font-size: 16px; }
.setting-title p { font-size: 12px; color: var(--dewu-text-muted); margin-top: 2px; }
.admin-section { margin-top: 20px; }
.admin-form { display: flex; flex-direction: column; gap: 12px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-row label { font-size: 13px; color: var(--dewu-text-secondary); }
.save-msg { margin-top: 12px; font-size: 13px; }
.save-msg.ok { color: var(--dewu-green); }
.save-msg.err { color: var(--dewu-accent); }
</style>
