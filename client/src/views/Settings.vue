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
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();
const status = reactive({ bailian: false, deepseek: false, img65535: false });

const services = [
  { key: 'bailian', icon: '☁️', name: '阿里云百炼', desc: '识图 — qwen-vl-max' },
  { key: 'deepseek', icon: '🤖', name: 'DeepSeek', desc: '文案 — deepseek-v4-pro' },
  { key: 'img65535', icon: '🖼️', name: '65535 平台', desc: '生图 — gpt-image-2' },
];

onMounted(async () => {
  await settingsStore.fetchStatus();
  status.bailian = settingsStore.apiKeyStatus.bailian;
  status.deepseek = settingsStore.apiKeyStatus.deepseek;
  status.img65535 = settingsStore.apiKeyStatus.img65535;
});
</script>

<style scoped>
.settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.setting-card .card-header { margin-bottom: 0; padding-bottom: 12px; }
.setting-title { display: flex; align-items: center; gap: 12px; }
.setting-icon { font-size: 28px; }
.setting-title h3 { font-size: 16px; }
.setting-title p { font-size: 12px; color: var(--dewu-text-muted); margin-top: 2px; }
</style>
