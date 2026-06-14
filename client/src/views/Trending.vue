<template>
  <div class="page-container">
    <div class="page-header">
      <h1>🔥 爆款分析</h1>
      <p>实时抓取 1688 / 淘宝 / B站 潮品趋势数据</p>
    </div>

    <!-- Category selector + Analyze button -->
    <div class="card analyze-bar">
      <div class="category-pills">
        <button v-for="c in categories" :key="c" class="pill" :class="{ active: selected === c }" @click="selected = c">
          {{ c }}
        </button>
      </div>
      <button class="btn btn-accent btn-lg" :disabled="loading" @click="runAnalysis">
        {{ loading ? '分析中...' : '🔍 开始分析' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card loading-card">
      <div class="streaming-spinner"></div>
      <p>正在抓取全网潮品数据...</p>
      <p class="loading-hint">搜索 1688、淘宝、B站，预计 30 秒</p>
    </div>

    <!-- Results -->
    <div v-if="results && !loading">
      <div v-for="(platform, key) in results.platforms" :key="key" class="platform-section">
        <div class="card platform-card">
          <div class="card-header">
            <h3>{{ platformLabels[key] }} <span class="count">({{ platform.length }} 条)</span></h3>
          </div>

          <div v-if="!platform.length" class="empty-hint">暂无数据（可能需要登录对应平台）</div>

          <div class="trend-grid">
            <div v-for="(item, i) in platform.slice(0, 12)" :key="i" class="trend-item card-enter" :style="{ animationDelay: i * 50 + 'ms' }">
              <div class="trend-rank">{{ i + 1 }}</div>
              <div class="trend-info">
                <div class="trend-title">{{ item.title }}</div>
                <div class="trend-meta">
                  <span v-if="item.price" class="meta-tag price">¥{{ item.price }}</span>
                  <span v-if="item.sales" class="meta-tag sales">📦 {{ item.sales }}</span>
                  <span v-if="item.shop" class="meta-tag shop">🏪 {{ item.shop }}</span>
                  <span v-if="item.author" class="meta-tag author">👤 {{ item.author }}</span>
                  <span v-if="item.score" class="meta-tag score">🔥 {{ item.score }}</span>
                </div>
              </div>
              <a v-if="item.url" :href="item.url" target="_blank" class="trend-link">→</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!results && !loading" class="card empty-state">
      <div class="empty-icon">🔍</div>
      <p>选择品类，点击"开始分析"查看全网爆款趋势</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '@/api';

const categories = ['运动鞋', '服装', '包袋', '配饰'];
const selected = ref('运动鞋');
const loading = ref(false);
const results = ref(null);

const platformLabels = {
  '1688': '🏭 1688 批发趋势',
  'taobao': '🛒 淘宝零售趋势',
  'bilibili': '📺 B站内容趋势',
};

async function runAnalysis() {
  loading.value = true;
  results.value = null;
  try {
    const data = await api.post('/trending/analyze', { category: selected.value });
    results.value = data;
  } catch (e) {
    alert('分析失败: ' + e.message);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.analyze-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.category-pills { display: flex; gap: 8px; }

.pill {
  padding: 8px 20px;
  border: 1px solid var(--dewu-border);
  border-radius: 20px;
  background: transparent;
  color: var(--dewu-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.pill:hover { border-color: var(--dewu-border-hover); color: var(--dewu-text); }
.pill.active {
  background: var(--dewu-accent);
  border-color: var(--dewu-accent);
  color: #fff;
}

.loading-card { text-align: center; padding: 60px; }
.streaming-spinner {
  width: 40px; height: 40px;
  border: 3px solid var(--dewu-border);
  border-top-color: var(--dewu-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
.loading-hint { color: var(--dewu-text-muted); font-size: 13px; margin-top: 4px; }

.platform-section { margin-bottom: 24px; }
.count { font-size: 13px; color: var(--dewu-text-muted); font-weight: 400; }

.trend-grid { display: flex; flex-direction: column; gap: 6px; }

.trend-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--dewu-surface);
  border-radius: var(--dewu-radius-sm);
  transition: background 0.15s;
  animation: card-in 0.3s ease both;
}
.trend-item:hover { background: var(--dewu-card); }

.trend-rank {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--dewu-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--dewu-text-muted);
  flex-shrink: 0;
}
.trend-item:nth-child(1) .trend-rank { background: var(--dewu-gold); color: var(--dewu-base); }
.trend-item:nth-child(2) .trend-rank { background: #C0C0C0; color: var(--dewu-base); }
.trend-item:nth-child(3) .trend-rank { background: #CD7F32; color: var(--dewu-base); }

.trend-info { flex: 1; min-width: 0; }
.trend-title { font-size: 14px; color: var(--dewu-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.trend-meta { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.meta-tag { font-size: 12px; color: var(--dewu-text-muted); }
.meta-tag.price { color: var(--dewu-accent); font-weight: 600; }
.trend-link { color: var(--dewu-blue); text-decoration: none; font-size: 18px; flex-shrink: 0; }
.trend-link:hover { color: #fff; }

.empty-state { text-align: center; padding: 80px 20px; }
.empty-icon { font-size: 48px; opacity: 0.3; margin-bottom: 12px; }
.empty-hint { color: var(--dewu-text-muted); font-size: 14px; padding: 20px; text-align: center; }

@keyframes card-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
