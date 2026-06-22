<template>
  <div id="app">
    <nav v-if="auth.isLoggedIn" class="app-nav">
      <div class="nav-brand">
        <router-link to="/" class="brand-link">
          <span class="brand-icon">👟</span>
          <span class="brand-text">得物运营</span>
        </router-link>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-link">
          <span>📋</span>
          <span>工作台</span>
        </router-link>
        <router-link to="/history" class="nav-link">
          <span>📁</span>
          <span>历史记录</span>
        </router-link>
        <router-link v-if="auth.hasPermission('task.view')" to="/tasks" class="nav-link">
          <span>🧭</span>
          <span>任务中心</span>
        </router-link>
        <router-link to="/settings" class="nav-link">
          <span>⚙️</span>
          <span>设置</span>
        </router-link>
        <router-link v-if="auth.isAdmin" to="/admin" class="nav-link">
          <span>🛡️</span>
          <span>管理后台</span>
        </router-link>
      </div>
      <div class="nav-user">
        <span class="points-badge">⭐ {{ auth.points }}</span>
        <span class="user-greeting">{{ auth.user?.username }}</span>
        <button class="btn btn-ghost btn-sm" @click="handleLogout">退出</button>
      </div>
    </nav>
    <main class="app-main" :class="{ 'no-nav': !auth.isLoggedIn }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.app-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  height: 56px;
  background: color-mix(in srgb, var(--dewu-surface) 90%, transparent);
  border-bottom: 1px solid var(--dewu-border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

.brand-icon { font-size: 24px; }

.brand-text {
  font-size: 17px;
  font-weight: 700;
  color: var(--dewu-heading);
  letter-spacing: -0.02em;
}


.nav-links { display: flex; gap: 2px; flex-wrap: wrap; }

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: var(--dewu-radius-sm);
  color: var(--dewu-text-muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link:hover {
  color: var(--dewu-text);
  background: rgba(255, 255, 255, 0.06);
}

.nav-link.router-link-active {
  color: var(--dewu-heading);
  background: rgba(255, 255, 255, 0.08);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-badge {
  background: linear-gradient(135deg, var(--dewu-gold), #E8C547);
  color: var(--dewu-base);
  padding: 4px 12px;
  border-radius: var(--dewu-radius-full);
  font-size: 13px;
  font-weight: 700;
}

.user-greeting {
  color: var(--dewu-text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.app-main {
  min-height: calc(100vh - 56px);
  background: var(--dewu-base);
}

.app-main.no-nav {
  min-height: 100vh;
}
</style>
