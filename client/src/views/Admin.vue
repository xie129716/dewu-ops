<template>
  <!-- Login Gate -->
  <div class="auth-page" v-if="!isAdmin">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">🔐</span>
        <h1>得物运营 · 管理后台</h1>
        <p v-if="!auth.isLoggedIn">请用管理员账号登录</p>
        <p v-else style="color:var(--dewu-accent)">当前账号无管理员权限</p>
      </div>

      <template v-if="!auth.isLoggedIn">
        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <label>管理员账号</label>
            <input v-model="loginUser" class="input" placeholder="admin" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="loginPass" class="input" type="password" placeholder="管理员密码" />
          </div>
          <div v-if="loginErr" class="error-msg">{{ loginErr }}</div>
          <button type="submit" class="btn btn-accent btn-lg full-width" :disabled="loading">登录</button>
        </form>
      </template>
      <button v-else class="btn btn-ghost full-width" @click="auth.logout(); $router.push('/login')">切换账号</button>
    </div>
  </div>

  <!-- Admin Panel -->
  <div v-else class="admin-panel">
    <nav class="admin-nav">
      <span class="admin-title">⚙️ 管理后台</span>
      <div class="admin-nav-links">
        <button :class="{ active: tab === 'keys' }" @click="tab = 'keys'">🔑 API 配置</button>
        <button :class="{ active: tab === 'users' }" @click="tab = 'users'">👥 用户管理</button>
        <button :class="{ active: tab === 'stats' }" @click="tab = 'stats'">📊 概览</button>
      </div>
      <div class="admin-nav-right">
        <span>{{ auth.user?.username }}</span>
        <button class="btn btn-ghost btn-sm" @click="auth.logout(); $router.push('/login')">退出</button>
      </div>
    </nav>

    <div class="admin-body">
      <!-- API Keys Tab -->
      <div v-if="tab === 'keys'" class="tab-content">
        <div class="card"><div class="card-header"><h3>全局 API Key 配置</h3></div>
          <div class="key-grid">
            <div v-for="s in services" :key="s.key" class="key-card">
              <div class="key-header">
                <span>{{ s.icon }} {{ s.name }}</span>
                <span class="status-dot" :class="{ active: keyStatus[s.key] }"></span>
              </div>
              <p class="key-desc">{{ s.desc }}</p>
              <input v-model="keys[s.key]" class="input" type="password" :placeholder="keyMasked[s.key] || 'sk-...'" />
            </div>
          </div>
          <button class="btn btn-accent" :disabled="savingKeys" @click="saveKeys">{{ savingKeys ? '...' : '💾 保存' }}</button>
          <span v-if="saveMsg" class="save-msg" :class="saveOk ? 'ok' : 'err'">{{ saveMsg }}</span>
        </div>
      </div>

      <!-- Users Tab -->
      <div v-if="tab === 'users'" class="tab-content">
        <div class="card"><div class="card-header">
          <h3>用户列表 ({{ userTotal }})</h3>
          <input v-model="userSearch" class="input" style="width:200px" placeholder="搜索用户名..." @input="loadUsers" />
        </div>
          <table class="user-table" v-if="users.length">
            <thead><tr>
              <th>ID</th><th>用户名</th><th>积分</th><th>管理员</th><th>注册时间</th><th>操作</th>
            </tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.id" :class="{ 'row-admin': u.is_admin }">
                <td>{{ u.id }}</td>
                <td>{{ u.username }}</td>
                <td>{{ u.points }}</td>
                <td>{{ u.is_admin ? '👑' : '-' }}</td>
                <td>{{ u.created_at?.slice(0,10) }}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="editUser = {...u}">✏️</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else style="color:#666;padding:20px">暂无用户</p>
        </div>
      </div>

      <!-- Stats Tab -->
      <div v-if="tab === 'stats'" class="tab-content">
        <div class="stats-grid">
          <div class="card stat-card"><h2>{{ stats.userCount }}</h2><p>总用户数</p></div>
          <div class="card stat-card"><h2>{{ stats.historyCount }}</h2><p>生成记录</p></div>
          <div class="card stat-card"><h2>{{ stats.totalPoints }}</h2><p>流通积分</p></div>
          <div class="card stat-card"><h2>{{ stats.todayCheckins }}</h2><p>今日签到</p></div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <Teleport to="body">
        <div v-if="editUser" class="modal-overlay" @click.self="editUser = null">
          <div class="modal-card card">
            <div class="card-header"><h3>编辑用户 #{{ editUser.id }} — {{ editUser.username }}</h3></div>
            <div class="edit-form">
              <div class="form-row">
                <label>用户名</label>
                <input v-model="editUser.username" class="input" />
              </div>
              <div class="form-row">
                <label>积分</label>
                <input v-model.number="editUser.points" class="input" type="number" />
              </div>
              <div class="form-row">
                <label>新密码（不填则不修改）</label>
                <input v-model="editUser._newPwd" class="input" type="password" placeholder="留空不修改" />
              </div>
              <div class="form-actions">
                <button class="btn btn-accent" @click="saveUser">💾 保存</button>
                <button class="btn btn-ghost" @click="editUser = null">取消</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/api';

const auth = useAuthStore();
const isAdmin = computed(() => auth.isLoggedIn && auth.user?.isAdmin);

// Login
const loginUser = ref('admin');
const loginPass = ref('');
const loginErr = ref('');
const loading = ref(false);
async function handleLogin() {
  loginErr.value = '';
  loading.value = true;
  try {
    await auth.login({ username: loginUser.value, password: loginPass.value });
    if (!auth.user?.isAdmin) { loginErr.value = '非管理员账号'; auth.logout(); }
  } catch (e) { loginErr.value = e.message; }
  finally { loading.value = false; }
}

// Tabs
const tab = ref('keys');

// API Keys
const services = [
  { key: 'bailian', icon: '☁️', name: '阿里云百炼', desc: '识图 qwen-vl-max' },
  { key: 'deepseek', icon: '🤖', name: 'DeepSeek', desc: '文案 deepseek-v4-pro' },
  { key: 'img65535', icon: '🖼️', name: '65535 平台', desc: '生图 gpt-image-2' },
];
const keys = reactive({ bailian: '', deepseek: '', img65535: '' });
const keyStatus = reactive({ bailian: false, deepseek: false, img65535: false });
const keyMasked = reactive({ bailian: '', deepseek: '', img65535: '' });
const savingKeys = ref(false);
const saveMsg = ref('');
const saveOk = ref(false);

async function loadKeys() {
  try {
    const d = await api.get('/admin/apikeys');
    keyStatus.bailian = d.bailian; keyStatus.deepseek = d.deepseek; keyStatus.img65535 = d.img65535;
    keyMasked.bailian = d.bailian_masked; keyMasked.deepseek = d.deepseek_masked; keyMasked.img65535 = d.img65535_masked;
  } catch(e) {}
}
async function saveKeys() {
  savingKeys.value = true; saveMsg.value = '';
  try {
    const payload = {};
    if (keys.bailian) payload.bailian_api_key = keys.bailian;
    if (keys.deepseek) payload.deepseek_api_key = keys.deepseek;
    if (keys.img65535) payload.img65535_api_key = keys.img65535;
    await api.post('/admin/apikeys', payload);
    saveOk.value = true; saveMsg.value = '保存成功';
    keys.bailian = ''; keys.deepseek = ''; keys.img65535 = '';
    await loadKeys();
  } catch(e) { saveOk.value = false; saveMsg.value = e.message; }
  finally { savingKeys.value = false; }
}

// Users
const users = ref([]);
const userTotal = ref(0);
const userSearch = ref('');
const editUser = ref(null);

async function loadUsers() {
  try {
    const d = await api.get('/admin/users', { params: { search: userSearch.value } });
    users.value = d.list; userTotal.value = d.total;
  } catch(e) {}
}
async function saveUser() {
  try {
    await api.patch(`/admin/users/${editUser.value.id}`, {
      username: editUser.value.username,
      points: editUser.value.points,
      password: editUser.value._newPwd || undefined,
    });
    editUser.value = null;
    await loadUsers();
  } catch(e) { alert(e.message); }
}

// Stats
const stats = reactive({ userCount: 0, historyCount: 0, totalPoints: 0, todayCheckins: 0 });
async function loadStats() {
  try { Object.assign(stats, await api.get('/admin/stats')); } catch(e) {}
}

onMounted(async () => {
  if (!isAdmin.value) return;
  await loadKeys();
  await loadUsers();
  await loadStats();
});

watch(tab, (t) => {
  if (t === 'users') loadUsers();
  if (t === 'stats') loadStats();
});
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #0f0f0f; }
.auth-card { background: var(--dewu-card); border: 1px solid var(--dewu-border); border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; }
.auth-header { text-align: center; margin-bottom: 32px; }
.auth-icon { font-size: 48px; }
.auth-header h1 { font-size: 22px; color: #fff; margin-top: 12px; }
.auth-header p { color: var(--dewu-text-muted); font-size: 14px; margin-top: 4px; }
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; color: var(--dewu-text-secondary); font-weight: 500; }
.error-msg { color: var(--dewu-accent); font-size: 13px; padding: 8px 12px; background: rgba(255, 77, 79, 0.08); border-radius: 6px; }
.full-width { width: 100%; }

/* Admin layout */
.admin-panel { min-height: 100vh; background: #0f0f0f; }
.admin-nav {
  display: flex; align-items: center; padding: 0 24px; height: 56px;
  background: #1a1a1a; border-bottom: 1px solid #2a2a2a; gap: 24px;
}
.admin-title { font-size: 16px; font-weight: 700; color: #fff; }
.admin-nav-links { display: flex; gap: 4px; flex: 1; }
.admin-nav-links button {
  padding: 8px 16px; border: none; background: none; color: #999;
  font-size: 14px; cursor: pointer; border-radius: 6px; transition: all 0.15s;
}
.admin-nav-links button:hover, .admin-nav-links button.active { color: #fff; background: rgba(255,255,255,0.08); }
.admin-nav-right { display: flex; align-items: center; gap: 12px; color: #ccc; font-size: 14px; }
.admin-body { padding: 24px; max-width: 1200px; margin: 0 auto; }

/* Keys */
.key-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 20px; }
.key-card { background: #161616; border: 1px solid #222; border-radius: 8px; padding: 16px; }
.key-header { display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px; }
.key-desc { font-size: 12px; color: #666; margin-bottom: 12px; }
.save-msg { margin-left: 12px; font-size: 13px; }
.save-msg.ok { color: var(--dewu-green); }
.save-msg.err { color: var(--dewu-accent); }

/* Users */
.user-table { width: 100%; border-collapse: collapse; }
.user-table th, .user-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #1a1a1a; font-size: 14px; }
.user-table th { color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; }
.user-table td { color: #ccc; }
.row-admin td { color: #fa8c16; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.stat-card { text-align: center; padding: 24px; }
.stat-card h2 { font-size: 36px; color: #fff; }
.stat-card p { color: #666; margin-top: 4px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { width: 420px; }
.edit-form { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-row label { font-size: 13px; color: var(--dewu-text-secondary); }
.form-actions { display: flex; gap: 10px; margin-top: 8px; }
</style>
