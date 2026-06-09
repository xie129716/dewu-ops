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
        <span v-if="processing && currentStep === i" class="step-status">进行中...</span>
        <span v-else-if="currentStep > i" class="step-status done">完成</span>
      </div>
      <div v-if="i < steps.length - 1" class="step-line" :class="{ 'step-line--done': currentStep > i + 1 }"></div>
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
  padding: 20px 0;
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #222;
  border: 2px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--dewu-text-muted);
  transition: all 0.3s;
}

.step--active .step-indicator {
  border-color: #fff;
  color: #fff;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
  animation: pulse 1.5s infinite;
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

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 255, 255, 0.1); }
  50% { box-shadow: 0 0 16px rgba(255, 255, 255, 0.3); }
}

.step-check, .step-cross {
  font-size: 16px;
  font-weight: 700;
}

.step-info {
  text-align: center;
  margin-top: 8px;
}

.step-label {
  display: block;
  font-size: 12px;
  color: var(--dewu-text-muted);
}

.step--active .step-label {
  color: #fff;
}

.step--done .step-label {
  color: var(--dewu-green);
}

.step-status {
  display: block;
  font-size: 11px;
  color: var(--dewu-text-muted);
  margin-top: 2px;
}

.step-status.done {
  color: var(--dewu-green);
}

.step-line {
  position: absolute;
  top: 18px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: #333;
}

.step-line--done {
  background: var(--dewu-green);
}
</style>
