<template>
  <div id="app">
    <nav class="app-nav">
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
    </nav>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
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

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 28px;
}

.brand-text {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.nav-links {
  display: flex;
  gap: 8px;
}

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

.nav-link:hover {
  color: #fff;
  background: rgba(255,255,255,0.08);
}

.nav-link.router-link-active {
  color: #fff;
  background: rgba(255,255,255,0.12);
}

.nav-icon {
  font-size: 16px;
}

.app-main {
  min-height: calc(100vh - 60px);
  background: #0f0f0f;
}
</style>
