import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api';

export const useSettingsStore = defineStore('settings', () => {
  const apiKeyStatus = ref({ bailian: false, deepseek: false, img65535: false });
  const loading = ref(false);

  async function fetchStatus() {
    try {
      const data = await api.get('/settings/status');
      apiKeyStatus.value = data;
    } catch (e) {
      console.error('Failed to fetch API key status:', e);
    }
  }

  async function saveApiKeys(keys) {
    loading.value = true;
    try {
      await api.post('/settings/apikeys', keys);
      await fetchStatus();
      return true;
    } catch (e) {
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchApiKeys() {
    try {
      return await api.get('/settings/apikeys');
    } catch (e) {
      return {};
    }
  }

  return { apiKeyStatus, loading, fetchStatus, saveApiKeys, fetchApiKeys };
});
