<template>
  <div class="progress-bar">
    <div
      v-for="(step, i) in steps"
      :key="i"
      class="step"
      :class="{
        'step--active': currentStep === i,
        'step--done': currentStep > i,
        'step--error': error && currentStep === i,
      }"
    >
      <div class="step-indicator">
        <span v-if="currentStep > i" class="step-check">✓</span>
        <span v-else-if="error && currentStep === i" class="step-cross">✗</span>
        <span v-else class="step-num">{{ i + 1 }}</span>
      </div>
      <div class="step-info">
        <span class="step-label">{{ step.label }}</span>
        <span v-if="processing && currentStep === i" class="step-status">进行中</span>
        <span v-else-if="currentStep > i" class="step-status done">完成</span>
      </div>
      <div
        v-if="i < steps.length - 1"
        class="step-line"
        :class="{ 'step-line--done': currentStep > i + 1 }"
      ></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentStep: { type: Number, default: 0 },
  error: { type: String, default: '' },
  processing: { type: Boolean, default: false },
});

const steps = [
  { label: '上传图片' },
  { label: '商品识别' },
  { label: '文案生成' },
  { label: '图片生成' },
];
</script>

<style scoped>
.progress-bar {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  padding: 24px 0;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  max-width: 140px;
}

.step-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--dewu-card);
  border: 2px solid var(--dewu-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--dewu-text-muted);
  transition: all 0.3s;
}

.step--active .step-indicator {
  border-color: var(--dewu-accent);
  color: var(--dewu-accent);
  box-shadow: 0 0 12px var(--dewu-accent-glow);
  animation: step-pulse 1.5s infinite;
}

.step--done .step-indicator {
  background: var(--dewu-green);
  border-color: var(--dewu-green);
  color: #fff;
}

.step--error .step-indicator {
  background: var(--dewu-accent);
  border-color: var(--dewu-accent);
  color: #fff;
}

@keyframes step-pulse {
  0%, 100% { box-shadow: 0 0 4px var(--dewu-accent-glow); }
  50% { box-shadow: 0 0 18px var(--dewu-accent-glow); }
}

.step-check,
.step-cross {
  font-size: 16px;
  font-weight: 700;
}

.step-info {
  text-align: center;
  margin-top: 10px;
}

.step-label {
  display: block;
  font-size: 13px;
  color: var(--dewu-text-muted);
  font-weight: 500;
}

.step--active .step-label { color: var(--dewu-heading); }
.step--done .step-label { color: var(--dewu-green); }

.step-status {
  display: block;
  font-size: 11px;
  color: var(--dewu-text-muted);
  margin-top: 3px;
}

.step-status.done { color: var(--dewu-green); }

.step-line {
  position: absolute;
  top: 20px;
  left: calc(50% + 22px);
  right: calc(-50% + 22px);
  height: 2px;
  background: var(--dewu-border);
}

.step-line--done { background: var(--dewu-green); }
</style>
