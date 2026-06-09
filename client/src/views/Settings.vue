<template>
  <div class="settings-page page-container">
    <div class="page-header">
      <h1>⚙️ 设置</h1>
      <p>配置各个 AI 模块的 API Key，密钥将安全保存在服务端</p>
    </div>

    <div class="settings-grid">
      <!-- Bailian -->
      <div class="card setting-card">
        <div class="card-header">
          <div class="setting-title">
            <span class="setting-icon">☁️</span>
            <div>
              <h3>阿里云百炼</h3>
              <p>识图模块 — qwen-vl-max</p>
            </div>
          </div>
          <span class="status-dot" :class="{ active: status.bailian }"></span>
        </div>
        <div class="setting-body">
          <label class="input-label">API Key</label>
          <input
            v-model="keys.bailian_api_key"
            :type="showBailian ? 'text' : 'password'"
            class="input"
            placeholder="sk-..."
          />
          <button class="btn btn-ghost btn-sm toggle-btn" @click="showBailian = !showBailian">
            {{ showBailian ? '🙈 隐藏' : '👁️ 显示' }}
          </button>
        </div>
      </div>

      <!-- DeepSeek -->
      <div class="card setting-card">
        <div class="card-header">
          <div class="setting-title">
            <span class="setting-icon">🤖</span>
            <div>
              <h3>DeepSeek 开放平台</h3>
              <p>文案生成模块 — deepseek-v4-pro</p>
            </div>
          </div>
          <span class="status-dot" :class="{ active: status.deepseek }"></span>
        </div>
        <div class="setting-body">
          <label class="input-label">API Key</label>
          <input
            v-model="keys.deepseek_api_key"
            :type="showDeepseek ? 'text' : 'password'"
            class="input"
            placeholder="sk-..."
          />
          <button class="btn btn-ghost btn-sm toggle-btn" @click="showDeepseek = !showDeepseek">
            {{ showDeepseek ? '🙈 隐藏' : '👁️ 显示' }}
          </button>
        </div>
      </div>

      <!-- 65535 -->
      <div class="card setting-card">
        <div class="card-header">
          <div class="setting-title">
            <span class="setting-icon">🖼️</span>
            <div>
              <h3>65535 图片平台</h3>
              <p>生图模块 — gpt-image-2</p>
            </div>
          </div>
          <span class="status-dot" :class="{ active: status.img65535 }"></span>
        </div>
        <div class="setting-body">
          <label class="input-label">API Key</label>
          <input
            v-model="keys.img65535_api_key"
            :type="show65535 ? 'text' : 'password'"
            class="input"
            placeholder="sk-..."
          />
          <button class="btn btn-ghost btn-sm toggle-btn" @click="show65535 = !show65535">
            {{ show65535 ? '🙈 隐藏' : '👁️ 显示' }}
          </button>
        </div>
      </div>
    </div>

    <div class="save-section">
      <button
        class="btn btn-accent btn-lg"
        :disabled="settingsStore.loading"
        @click="handleSave"
      >
        {{ settingsStore.loading ? '保存中...' : '💾 保存全部配置' }}
      </button>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

const showBailian = ref(false);
const showDeepseek = ref(false);
const show65535 = ref(false);

const keys = reactive({
  bailian_api_key: '',
  deepseek_api_key: '',
  img65535_api_key: '',
});

const status = reactive({
  bailian: false,
  deepseek: false,
  img65535: false,
});

const toast = ref({ show: false, message: '', type: 'success' });

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 3000);
}

async function loadKeys() {
  try {
    const masked = await settingsStore.fetchApiKeys();
    // Don't overwrite if user has typed something
    if (masked.bailian_api_key && !keys.bailian_api_key) keys.bailian_api_key = masked.bailian_api_key;
    if (masked.deepseek_api_key && !keys.deepseek_api_key) keys.deepseek_api_key = masked.deepseek_api_key;
    if (masked.img65535_api_key && !keys.img65535_api_key) keys.img65535_api_key = masked.img65535_api_key;
  } catch (e) { /* ignore */ }
}

async function loadStatus() {
  await settingsStore.fetchStatus();
  status.bailian = settingsStore.apiKeyStatus.bailian;
  status.deepseek = settingsStore.apiKeyStatus.deepseek;
  status.img65535 = settingsStore.apiKeyStatus.img65535;
}

async function handleSave() {
  try {
    await settingsStore.saveApiKeys({
      bailian_api_key: keys.bailian_api_key,
      deepseek_api_key: keys.deepseek_api_key,
      img65535_api_key: keys.img65535_api_key,
    });
    await loadStatus();
    showToast('✅ API Keys 保存成功');
  } catch (e) {
    showToast('❌ 保存失败: ' + e.message, 'error');
  }
}

onMounted(async () => {
  await loadKeys();
  await loadStatus();
});
</script>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.setting-card .card-header {
  margin-bottom: 0;
  padding-bottom: 12px;
}

.setting-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-icon {
  font-size: 28px;
}

.setting-title h3 {
  font-size: 16px;
}

.setting-title p {
  font-size: 12px;
  color: var(--dewu-text-muted);
  margin-top: 2px;
}

.setting-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 12px;
  color: var(--dewu-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.toggle-btn {
  align-self: flex-start;
}

.save-section {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}
</style>
