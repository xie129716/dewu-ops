<template>
  <div id="app">
    <nav v-if="auth.isLoggedIn" class="app-nav">
      <div class="nav-brand">
        <span class="brand-icon">👟</span>
        <span class="brand-text">得物运营系统</span>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-link">
          <span class="nav-icon">📋</span> 工作台
        </router-link>
        <router-link to="/history" class="nav-link">
          <span class="nav-icon">📁</span> 历史记录
        </router-link>
        <router-link to="/settings" class="nav-link">
          <span class="nav-icon">⚙️</span> 设置
        </router-link>
      </div>
      <div class="nav-user">
        <span class="points-badge">🪙 {{ auth.points }} 积分</span>
        <span class="user-greeting">👤 {{ auth.user?.username }}</span>
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
  padding: 0 32px;
  height: 60px;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand { display: flex; align-items: center; gap: 10px; }
.brand-icon { font-size: 28px; }
.brand-text { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 1px; }

.nav-links { display: flex; gap: 8px; }

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  color: #999;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}
.nav-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
.nav-link.router-link-active { color: #fff; background: rgba(255,255,255,0.12); }
.nav-icon { font-size: 16px; }

.nav-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-badge {
  background: linear-gradient(135deg, #fa8c16, #ffc53d);
  color: #000;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
}
.user-greeting { color: #ccc; font-size: 14px; }

.app-main { min-height: calc(100vh - 60px); background: #0f0f0f; }
.app-main.no-nav { min-height: 100vh; }
</style>
