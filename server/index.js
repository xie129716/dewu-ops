const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const recognizeRoutes = require('./routes/recognize');
const copyRoutes = require('./routes/copy');
const generateRoutes = require('./routes/generate');
const workflowRoutes = require('./routes/workflow');
const historyRoutes = require('./routes/history');
const pointsRoutes = require('./routes/points');
const adminRoutes = require('./routes/admin');
const tasksRoutes = require('./routes/tasks');
const platformsRoutes = require('./routes/platforms');
const templatesRoutes = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', recognizeRoutes);
app.use('/api/copy', copyRoutes);
app.use('/api/image', generateRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/templates', templatesRoutes);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api/')) return;
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  if (err.message && err.message.includes('不支持的文件格式')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: '服务器内部错误' });
});

const { getSetting, setSystemConfig, getSystemConfig } = require('./services/storage');
const KEYS = ['bailian_api_key', 'deepseek_api_key', 'img65535_api_key'];
KEYS.forEach(k => {
  if (!getSystemConfig(k)) {
    const val = getSetting(0, k) || getSetting(1, k);
    if (val) setSystemConfig(k, val);
  }
});

app.listen(PORT, () => {
  require('./services/auth').createAdminIfMissing();
  console.log(`\n🚀 得物运营系统后端已启动`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/api/health\n`);
});
