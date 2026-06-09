<template>
  <div class="dewu-post">
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

    <!-- Image Carousel — only generated images -->
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
        <div v-if="displayImages.length > 1" class="carousel-dots">
          <span
            v-for="(_, i) in displayImages"
            :key="i"
            class="dot"
            :class="{ 'dot--active': currentImage === i }"
            @click="currentImage = i"
          ></span>
        </div>
        <div v-if="displayImages.length > 1" class="carousel-counter">
          {{ currentImage + 1 }} / {{ displayImages.length }}
        </div>
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

    <!-- Placeholder when no generated images yet -->
    <div v-else class="post-images">
      <div class="image-placeholder">
        <div class="placeholder-icon">🖼️</div>
        <p>等待图片生成...</p>
      </div>
    </div>

    <!-- Product Name & Category -->
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

    <!-- Download Button -->
    <div class="post-download" v-if="displayImages.length">
      <button
        class="btn btn-primary btn-sm"
        v-for="(img, i) in displayImages"
        :key="'dl-' + i"
        @click="$emit('download', img, `dewu-generated-${i + 1}.png`)"
      >
        💾 下载图片 {{ displayImages.length > 1 ? i + 1 : '' }}
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
  background: #111;
  border-radius: 12px;
  overflow: hidden;
  max-width: 500px;
  margin: 0 auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

/* --- Header --- */
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
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.user-info { flex: 1; }

.user-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-name { font-size: 14px; font-weight: 600; color: #fff; }
.user-badge { font-size: 12px; }

.post-meta { font-size: 11px; color: #888; margin-top: 1px; }
.meta-divider { margin: 0 4px; }

.follow-btn {
  padding: 5px 14px;
  border-radius: 16px;
  border: 1px solid #444;
  background: transparent;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
}
.follow-btn:hover { border-color: #fff; color: #fff; }

/* --- Tags --- */
.post-tags {
  display: flex;
  gap: 6px;
  padding: 0 16px 12px;
}

.post-tag {
  padding: 2px 8px;
  background: rgba(255, 77, 79, 0.12);
  color: #ff7875;
  border-radius: 4px;
  font-size: 11px;
}

/* --- Images --- */
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
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
}
.dot--active { background: #fff; }

.carousel-counter {
  position: absolute;
  bottom: 12px; right: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.carousel-btn {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  width: 36px; height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.carousel-btn--left { left: 8px; }
.carousel-btn--right { right: 8px; }

/* --- Placeholder --- */
.image-placeholder {
  aspect-ratio: 1;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #555;
}

.placeholder-icon { font-size: 48px; opacity: 0.3; }
.image-placeholder p { font-size: 14px; }

/* --- Product Info --- */
.post-product-info {
  padding: 14px 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.product-header { flex: 1; }

.product-brand {
  font-size: 12px;
  color: var(--dewu-accent-hover);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.product-name {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-top: 2px;
}

.product-category {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: #888;
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 4px;
}

.product-price { text-align: right; }

.price-label { font-size: 11px; color: #888; display: block; }

.price-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--dewu-accent);
}

/* --- Content --- */
.post-content { padding: 12px 16px; }

.content-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
}

.content-body {
  font-size: 14px;
  line-height: 1.7;
  color: #bbb;
  max-height: 60px;
  overflow: hidden;
  transition: max-height 0.3s;
}

.content-body--expanded { max-height: none; }

.content-expand {
  background: none;
  border: none;
  padding: 0;
  color: #888;
  font-size: 13px;
  cursor: pointer;
  margin-top: 4px;
}

/* --- Hashtags --- */
.post-hashtags {
  padding: 0 16px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hashtag { color: #5b9bd5; font-size: 12px; }

/* --- Actions --- */
.post-actions {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #222;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}
.action-btn:hover { background: rgba(255, 255, 255, 0.05); }

.action-icon { font-size: 16px; }
.action-num { font-size: 12px; }

.want-btn {
  margin-left: auto;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  color: #fff;
  border-radius: 20px;
  padding: 6px 16px;
}
.want-btn:hover { background: linear-gradient(135deg, #ff7875, #ff4d4f); }

.action-label { font-size: 13px; font-weight: 600; }

/* --- Download --- */
.post-download {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
  flex-wrap: wrap;
}
</style>
