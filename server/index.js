const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const recognizeRoutes = require('./routes/recognize');
const copyRoutes = require('./routes/copy');
const generateRoutes = require('./routes/generate');
const workflowRoutes = require('./routes/workflow');
const historyRoutes = require('./routes/history');
const pointsRoutes = require('./routes/points');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check (before auth middleware)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', recognizeRoutes);
app.use('/api/copy', copyRoutes);
app.use('/api/image', generateRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/admin', adminRoutes);

// --- Production: serve built frontend ---
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
// SPA fallback: all non-API routes serve index.html (Express 5.x syntax)
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api/')) return;
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  if (err.message && err.message.includes('不支持的文件格式')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: '服务器内部错误' });
});

// Migrate per-user API keys to system config (one-time)
const { getSetting, setSystemConfig, getSystemConfig } = require('./services/storage');
const KEYS = ['bailian_api_key', 'deepseek_api_key', 'img65535_api_key'];
KEYS.forEach(k => {
  if (!getSystemConfig(k)) {
    const val = getSetting(0, k) || getSetting(1, k);
    if (val) setSystemConfig(k, val);
  }
});

// Start server
app.listen(PORT, () => {
  require('./services/auth').createAdminIfMissing();
  console.log(`\n🚀 得物运营系统后端已启动`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/api/health\n`);
});
