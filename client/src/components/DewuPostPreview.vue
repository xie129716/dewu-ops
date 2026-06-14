<template>
  <div class="dewu-post">
    <!-- Top accent bar — freemake-style gradient -->
    <div class="post-accent"></div>

    <!-- Post Header -->
    <div class="post-header">
      <div class="user-avatar">
        <div class="avatar-circle">{{ avatarChar }}</div>
      </div>
      <div class="user-info">
        <div class="user-name-row">
          <span class="user-name">{{ displayName }}</span>
          <span class="user-badge">👑</span>
        </div>
        <div class="post-meta">
          <span class="post-time">{{ timeText }}</span>
          <span class="meta-divider">·</span>
          <span class="post-location" v-if="location">📍 {{ location }}</span>
        </div>
      </div>
      <button class="follow-btn">+ 关注</button>
    </div>

    <!-- Product Tags -->
    <div class="post-tags" v-if="tags.length">
      <span v-for="tag in tags" :key="tag" class="post-tag">{{ tag }}</span>
    </div>

    <!-- Image Carousel -->
    <div class="post-images" v-if="displayImages.length">
      <div class="carousel">
        <div
          class="carousel-track"
          :style="{ transform: `translateX(-${currentImage * 100}%)` }"
        >
          <div v-for="(img, i) in displayImages" :key="i" class="carousel-slide">
            <img :src="img" alt="生成商品图" />
          </div>
        </div>

        <!-- Dots -->
        <div v-if="displayImages.length > 1" class="carousel-dots">
          <span
            v-for="(_, i) in displayImages"
            :key="i"
            class="dot"
            :class="{ 'dot--active': currentImage === i }"
            @click="currentImage = i"
          ></span>
        </div>

        <!-- Counter -->
        <div v-if="displayImages.length > 1" class="carousel-counter">
          {{ currentImage + 1 }} / {{ displayImages.length }}
        </div>

        <!-- Nav arrows -->
        <button
          v-if="displayImages.length > 1 && currentImage > 0"
          class="carousel-btn carousel-btn--left"
          @click="currentImage--"
        >‹</button>
        <button
          v-if="displayImages.length > 1 && currentImage < displayImages.length - 1"
          class="carousel-btn carousel-btn--right"
          @click="currentImage++"
        >›</button>
      </div>
    </div>

    <!-- Placeholder -->
    <div v-else class="post-images">
      <div class="image-placeholder">
        <div class="placeholder-icon">🖼️</div>
        <p>等待图片生成...</p>
      </div>
    </div>

    <!-- Product Info -->
    <div class="post-product-info">
      <div class="product-header">
        <span class="product-brand" v-if="brand">{{ brand }}</span>
        <span class="product-name">{{ productName || '潮流单品' }}</span>
        <span class="product-category" v-if="category">{{ category }}</span>
      </div>
      <div class="product-price" v-if="priceRange">
        <span class="price-label">参考价</span>
        <span class="price-value">¥{{ priceRange }}</span>
      </div>
    </div>

    <!-- Copy Content -->
    <div class="post-content" v-if="title || content">
      <h4 class="content-title" v-if="title">{{ title }}</h4>
      <p class="content-body" :class="{ 'content-body--expanded': contentExpanded }">
        {{ content || '精彩内容即将呈现...' }}
      </p>
      <button
        v-if="content && content.length > 80"
        class="content-expand"
        @click="contentExpanded = !contentExpanded"
      >
        {{ contentExpanded ? '收起' : '展开全文' }}
      </button>
    </div>

    <!-- Hashtags -->
    <div class="post-hashtags" v-if="hashtags.length">
      <span v-for="ht in hashtags" :key="ht" class="hashtag">{{ ht }}</span>
    </div>

    <!-- Action Bar -->
    <div class="post-actions">
      <button class="action-btn" @click="liked = !liked">
        <span class="action-icon">{{ liked ? '❤️' : '🤍' }}</span>
        <span class="action-num">{{ likedCount }}</span>
      </button>
      <button class="action-btn">
        <span class="action-icon">💬</span>
        <span class="action-num">{{ commentCount }}</span>
      </button>
      <button class="action-btn">
        <span class="action-icon">🔄</span>
        <span class="action-num">{{ shareCount }}</span>
      </button>
      <button class="action-btn want-btn" @click="wanted = !wanted">
        <span class="action-icon">{{ wanted ? '🛒' : '🛍️' }}</span>
        <span class="action-label">{{ wanted ? '已想要' : '想要' }}</span>
      </button>
    </div>

    <!-- Download -->
    <div class="post-download" v-if="displayImages.length">
      <button
        class="btn btn-primary btn-sm"
        v-for="(img, i) in displayImages"
        :key="'dl-' + i"
        @click="$emit('download', img, `dewu-generated-${i + 1}.png`)"
      >
        💾 下载图片{{ displayImages.length > 1 ? ' ' + (i + 1) : '' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  generatedImages: { type: Array, default: () => [] },
  brand: { type: String, default: '' },
  productName: { type: String, default: '' },
  category: { type: String, default: '' },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  hashtags: { type: Array, default: () => [] },
  priceRange: { type: String, default: '' },
  displayName: { type: String, default: '潮流玩家' },
  location: { type: String, default: '' },
});

defineEmits(['download']);

const currentImage = ref(0);
const contentExpanded = ref(false);
const liked = ref(false);
const wanted = ref(false);
const likedCount = ref(328);
const commentCount = ref(56);
const shareCount = ref(127);

const displayImages = computed(() => {
  return props.generatedImages
    .map(g => (typeof g === 'string' ? g : g.url))
    .filter(Boolean);
});

const avatarChar = computed(() => props.displayName.charAt(0));

const timeText = computed(() => {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日`;
});
</script>

<style scoped>
.dewu-post {
  background: var(--dewu-card);
  border-radius: var(--dewu-radius);
  overflow: hidden;
  max-width: 500px;
  margin: 0 auto;
  border: 1px solid var(--dewu-border);
  position: relative;
}

/* ——— Accent bar — freemake-inspired gradient stripe ——— */
.post-accent {
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--dewu-accent),
    var(--dewu-gold),
    var(--dewu-blue)
  );
}

/* ——— Header ——— */
.post-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 10px;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--dewu-accent), var(--dewu-gold));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-info { flex: 1; min-width: 0; }

.user-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dewu-heading);
}

.user-badge { font-size: 12px; }

.post-meta {
  font-size: 11px;
  color: var(--dewu-text-muted);
  margin-top: 1px;
}

.meta-divider { margin: 0 4px; }

.follow-btn {
  padding: 5px 14px;
  border-radius: var(--dewu-radius-full);
  border: 1px solid var(--dewu-border);
  background: transparent;
  color: var(--dewu-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.follow-btn:hover {
  border-color: var(--dewu-border-hover);
  color: var(--dewu-heading);
}

/* ——— Tags ——— */
.post-tags {
  display: flex;
  gap: 6px;
  padding: 0 16px 12px;
  flex-wrap: wrap;
}

.post-tag {
  padding: 2px 10px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--dewu-accent-hover);
  border-radius: var(--dewu-radius-full);
  font-size: 11px;
  font-weight: 500;
}

/* ——— Images ——— */
.post-images { position: relative; }

.carousel {
  position: relative;
  overflow: hidden;
  background: #000;
}

.carousel-track {
  display: flex;
  transition: transform 0.3s ease;
}

.carousel-slide {
  min-width: 100%;
  aspect-ratio: 1;
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.carousel-dots {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: background 0.2s;
}

.dot:hover { background: rgba(255, 255, 255, 0.6); }
.dot--active { background: #fff; }

.carousel-counter {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  color: #fff;
  padding: 2px 8px;
  border-radius: var(--dewu-radius-full);
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.carousel-btn:hover { background: rgba(0, 0, 0, 0.7); }
.carousel-btn--left { left: 8px; }
.carousel-btn--right { right: 8px; }

/* ——— Placeholder ——— */
.image-placeholder {
  aspect-ratio: 1;
  background: #0a0a0e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--dewu-text-muted);
}

.placeholder-icon { font-size: 48px; opacity: 0.25; }
.image-placeholder p { font-size: 14px; }

/* ——— Product Info ——— */
.post-product-info {
  padding: 16px 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.product-header { flex: 1; min-width: 0; }

.product-brand {
  font-size: 12px;
  color: var(--dewu-accent-hover);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

.product-name {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--dewu-heading);
  margin-top: 2px;
  letter-spacing: -0.01em;
}

.product-category {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--dewu-text-muted);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 10px;
  border-radius: var(--dewu-radius-full);
  font-weight: 500;
}

.product-price { text-align: right; flex-shrink: 0; }

.price-label {
  font-size: 11px;
  color: var(--dewu-text-muted);
  display: block;
}

.price-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--dewu-accent);
  font-variant-numeric: tabular-nums;
}

/* ——— Content ——— */
.post-content { padding: 14px 16px; }

.content-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dewu-heading);
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}

.content-body {
  font-size: 14px;
  line-height: 1.75;
  color: var(--dewu-text-secondary);
  max-height: 64px;
  overflow: hidden;
  transition: max-height 0.3s;
}

.content-body--expanded { max-height: none; }

.content-expand {
  background: none;
  border: none;
  padding: 0;
  color: var(--dewu-text-muted);
  font-size: 13px;
  cursor: pointer;
  margin-top: 6px;
  font-weight: 500;
  transition: color 0.15s;
}

.content-expand:hover { color: var(--dewu-text-secondary); }

/* ——— Hashtags ——— */
.post-hashtags {
  padding: 0 16px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hashtag {
  color: var(--dewu-blue);
  font-size: 12px;
  font-weight: 500;
}

/* ——— Actions ——— */
.post-actions {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--dewu-border);
  gap: 2px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: none;
  border: none;
  color: var(--dewu-text-muted);
  cursor: pointer;
  border-radius: var(--dewu-radius-sm);
  transition: all 0.15s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--dewu-text-secondary);
}

.action-icon { font-size: 16px; }

.action-num {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.want-btn {
  margin-left: auto;
  background: linear-gradient(135deg, var(--dewu-accent), #FF8759);
  color: #fff;
  border-radius: var(--dewu-radius-full);
  padding: 6px 18px;
}

.want-btn:hover {
  background: linear-gradient(135deg, #FF8759, var(--dewu-accent));
  color: #fff;
}

.action-label { font-size: 13px; font-weight: 600; }

/* ——— Download ——— */
.post-download {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
  flex-wrap: wrap;
}
</style>
