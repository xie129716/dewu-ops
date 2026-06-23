const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

const DEFAULT_ROLES = [
  { key: 'super_admin', name: '超级管理员', description: '拥有全部权限', isSystem: 1 },
  { key: 'ops_admin', name: '运营管理员', description: '管理模板、任务、配置与用户', isSystem: 1 },
  { key: 'operator', name: '运营执行', description: '运行工作流与查看自己的任务', isSystem: 1 },
  { key: 'viewer', name: '只读观察者', description: '只查看内容、任务与历史', isSystem: 1 },
];

const DEFAULT_PERMISSIONS = [
  { key: 'workflow.run', name: '运行工作流', module: 'workflow' },
  { key: 'copy.generate', name: '生成文案', module: 'copy' },
  { key: 'image.generate', name: '生成图片', module: 'image' },
  { key: 'prompt.view_manual', name: '查看手动 Prompt', module: 'prompt' },
  { key: 'template.view', name: '查看模板', module: 'template' },
  { key: 'template.manage', name: '管理模板', module: 'template' },
  { key: 'task.view', name: '查看任务', module: 'task' },
  { key: 'task.manage_all', name: '管理全部任务', module: 'task' },
  { key: 'history.view', name: '查看历史', module: 'history' },
  { key: 'history.view_all', name: '查看全部历史', module: 'history' },
  { key: 'config.view', name: '查看系统配置', module: 'config' },
  { key: 'config.manage', name: '管理系统配置', module: 'config' },
  { key: 'user.view', name: '查看用户', module: 'user' },
  { key: 'user.manage', name: '管理用户', module: 'user' },
  { key: 'role.manage', name: '管理角色权限', module: 'role' },
];

const ROLE_PERMISSION_MAP = {
  super_admin: ['*'],
  ops_admin: [
    'workflow.run', 'copy.generate', 'image.generate', 'prompt.view_manual',
    'template.view', 'template.manage', 'task.view', 'task.manage_all',
    'history.view', 'history.view_all', 'config.view', 'config.manage',
    'user.view', 'user.manage', 'role.manage',
  ],
  operator: [
    'workflow.run', 'copy.generate', 'image.generate', 'prompt.view_manual',
    'template.view', 'task.view', 'history.view',
  ],
  viewer: ['template.view', 'task.view', 'history.view'],
};

const DEFAULT_PLATFORMS = [
  { key: 'dewu', name: '得物', category: 'community_post', config: { supportsImage: true, supportsManualPrompt: true } },
  { key: 'douyin', name: '抖音', category: 'short_video', config: { supportsImage: true, supportsManualPrompt: true } },
  { key: 'xiaohongshu', name: '小红书', category: 'social_note', config: { supportsImage: true, supportsManualPrompt: true } },
  { key: 'wechat_oa', name: '微信公众号', category: 'article', config: { supportsImage: true, supportsManualPrompt: true } },
];

const DEFAULT_TEMPLATES = [
  {
    code: 'dewu-seeding',
    name: '得物社区种草',
    description: '适合得物风格种草内容与商品图优化',
    scene_type: 'community_post',
    template_type: 'system',
    target_platforms: ['dewu'],
    step_config: { recognize: true, copy: true, image: true },
    variable_schema: [
      { key: 'audience', label: '目标人群', type: 'text', default: '潮流年轻用户' },
      { key: 'tone', label: '语气风格', type: 'text', default: '潮流种草、真实推荐' },
      { key: 'sellingPoints', label: '核心卖点', type: 'textarea', default: '' },
    ],
    content_prompt_template: '围绕 {{brand}} {{productName}} 生成适合得物社区的种草文案，输出标题、正文、标签、hashtags。目标人群：{{audience}}；语气：{{tone}}；核心卖点：{{sellingPoints}}。正文要有真实安利感和社区传播感。',
    image_prompt_template: '保持 {{brand}} {{productName}} 主体外观完全不变，输出适合得物社区与电商种草的高级商品展示图，强调质感、光影和高级感。',
    output_schema: { type: 'dewu_post' },
  },
  {
    code: 'douyin-script',
    name: '抖音带货短视频脚本',
    description: '适合短视频口播、标题与分镜结构',
    scene_type: 'short_video_script',
    template_type: 'system',
    target_platforms: ['douyin'],
    step_config: { recognize: true, copy: true, image: true },
    variable_schema: [
      { key: 'audience', label: '目标人群', type: 'text', default: '价格敏感且喜欢潮流单品的年轻用户' },
      { key: 'tone', label: '口播语气', type: 'text', default: '节奏快、强钩子、转化导向' },
      { key: 'cta', label: '行动号召', type: 'text', default: '引导收藏、评论、下单' },
      { key: 'sellingPoints', label: '核心卖点', type: 'textarea', default: '' },
    ],
    content_prompt_template: '为 {{brand}} {{productName}} 生成抖音带货短视频脚本，输出脚本标题、3秒钩子、口播文案、分镜脚本、视频 caption 和 hashtags。目标人群：{{audience}}；语气：{{tone}}；CTA：{{cta}}；核心卖点：{{sellingPoints}}。重点突出商品卖点、使用场景、转化理由。',
    image_prompt_template: '输出适合作为抖音带货封面与商品展示的高清商品图，突出主体、对比、氛围和点击率，可直接用于短视频封面和口播场景插图。',
    output_schema: { type: 'douyin_script' },
  },
  {
    code: 'xiaohongshu-note',
    name: '小红书图文种草',
    description: '适合标题党但真实克制的小红书图文笔记',
    scene_type: 'social_note',
    template_type: 'system',
    target_platforms: ['xiaohongshu'],
    step_config: { recognize: true, copy: true, image: true },
    variable_schema: [
      { key: 'audience', label: '目标人群', type: 'text', default: '注重审美与实用性的年轻女性用户' },
      { key: 'tone', label: '语气风格', type: 'text', default: '真实分享、生活化、种草感强' },
      { key: 'scene', label: '使用场景', type: 'text', default: '日常穿搭/出街' },
      { key: 'sellingPoints', label: '核心卖点', type: 'textarea', default: '' },
    ],
    content_prompt_template: '为 {{brand}} {{productName}} 生成小红书图文笔记，输出标题、正文、标签、hashtags 和封面文案。目标人群：{{audience}}；语气：{{tone}}；重点使用场景：{{scene}}；核心卖点：{{sellingPoints}}。内容要有真实分享感、适合收藏转发。',
    image_prompt_template: '输出适合小红书封面和配图的生活方式商品图，画面干净有质感，强调真实场景、生活化氛围和封面点击率。',
    output_schema: { type: 'xiaohongshu_note' },
  },
  {
    code: 'wechat-article',
    name: '公众号商品文章',
    description: '适合公众号图文长文与导购文章',
    scene_type: 'article',
    template_type: 'system',
    target_platforms: ['wechat_oa'],
    step_config: { recognize: true, copy: true, image: true },
    variable_schema: [
      { key: 'audience', label: '目标人群', type: 'text', default: '希望系统了解商品价值的理性消费用户' },
      { key: 'tone', label: '文章风格', type: 'text', default: '清晰、专业、有导购逻辑' },
      { key: 'cta', label: '行动号召', type: 'text', default: '引导了解详情与咨询购买' },
      { key: 'sellingPoints', label: '核心卖点', type: 'textarea', default: '' },
    ],
    content_prompt_template: '为 {{brand}} {{productName}} 生成微信公众号商品文章，输出文章标题、摘要、提纲、正文、CTA 和关键词。目标人群：{{audience}}；文章风格：{{tone}}；CTA：{{cta}}；核心卖点：{{sellingPoints}}。正文要层次清晰，适合图文推送和导购阅读。',
    image_prompt_template: '输出适合公众号头图与配图的商品图，强调高级质感、可读性与图文搭配，适合作为封面和正文插图。',
    output_schema: { type: 'wechat_article' },
  },
];

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
    migrate();
    seedSystemData();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      check_date TEXT NOT NULL,
      points_earned INTEGER DEFAULT 20,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, check_date)
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, key)
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_image TEXT,
      recognition_result TEXT,
      copy_result TEXT,
      generated_images TEXT,
      status TEXT DEFAULT 'completed',
      job_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      module TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      config_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      scene_type TEXT,
      template_type TEXT DEFAULT 'system',
      target_platforms_json TEXT,
      step_config_json TEXT,
      variable_schema_json TEXT,
      content_prompt_template TEXT,
      image_prompt_template TEXT,
      output_schema_json TEXT,
      enabled INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'queued',
      priority INTEGER DEFAULT 50,
      user_id INTEGER NOT NULL,
      platform_key TEXT,
      template_id INTEGER,
      history_id INTEGER,
      parent_task_id INTEGER,
      input_json TEXT,
      prompt_snapshot_json TEXT,
      output_json TEXT,
      error_json TEXT,
      external_job_id TEXT,
      progress_step TEXT,
      progress_message TEXT,
      attempts INTEGER DEFAULT 0,
      scheduled_at TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT,
      payload_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function migrate() {
  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!userCols.includes('points')) db.exec('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0');
  if (!userCols.includes('is_admin')) db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
  if (!userCols.includes('phone')) {
    try { db.exec('ALTER TABLE users ADD COLUMN phone TEXT'); } catch (_) {}
  }

  const historyCols = db.prepare('PRAGMA table_info(history)').all().map(c => c.name);
  addColumnIfMissing(historyCols, 'history', 'job_id', 'TEXT');
  addColumnIfMissing(historyCols, 'history', 'task_id', 'INTEGER');
  addColumnIfMissing(historyCols, 'history', 'platform_key', 'TEXT');
  addColumnIfMissing(historyCols, 'history', 'template_id', 'INTEGER');
  addColumnIfMissing(historyCols, 'history', 'workflow_mode', "TEXT DEFAULT 'manual'");
  addColumnIfMissing(historyCols, 'history', 'prompt_snapshot_json', 'TEXT');
  addColumnIfMissing(historyCols, 'history', 'result_snapshot_json', 'TEXT');

  const taskCols = db.prepare('PRAGMA table_info(tasks)').all().map(c => c.name);
  addColumnIfMissing(taskCols, 'tasks', 'platform_key', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'template_id', 'INTEGER');
  addColumnIfMissing(taskCols, 'tasks', 'history_id', 'INTEGER');
  addColumnIfMissing(taskCols, 'tasks', 'parent_task_id', 'INTEGER');
  addColumnIfMissing(taskCols, 'tasks', 'input_json', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'prompt_snapshot_json', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'output_json', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'error_json', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'external_job_id', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'progress_step', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'progress_message', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'attempts', 'INTEGER DEFAULT 0');
  addColumnIfMissing(taskCols, 'tasks', 'scheduled_at', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'started_at', 'TEXT');
  addColumnIfMissing(taskCols, 'tasks', 'finished_at', 'TEXT');
}

function addColumnIfMissing(existingCols, table, column, typeSql) {
  if (!existingCols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`);
  }
}

function seedSystemData() {
  seedRoles();
  seedPermissions();
  seedRolePermissions();
  seedPlatforms();
  seedTemplates();
  seedUserRoles();
}

function seedRoles() {
  const d = getDB();
  const stmt = d.prepare(`
    INSERT INTO roles (key, name, description, is_system)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET name = excluded.name, description = excluded.description, is_system = excluded.is_system
  `);
  DEFAULT_ROLES.forEach(role => stmt.run(role.key, role.name, role.description, role.isSystem));
}

function seedPermissions() {
  const d = getDB();
  const stmt = d.prepare(`
    INSERT INTO permissions (key, name, description, module)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET name = excluded.name, description = excluded.description, module = excluded.module
  `);
  DEFAULT_PERMISSIONS.forEach(permission => {
    stmt.run(permission.key, permission.name, permission.description || permission.name, permission.module);
  });
}

function seedRolePermissions() {
  const d = getDB();
  const roleMap = Object.fromEntries(d.prepare('SELECT id, key FROM roles').all().map(row => [row.key, row.id]));
  const permissionMap = Object.fromEntries(d.prepare('SELECT id, key FROM permissions').all().map(row => [row.key, row.id]));
  const exists = d.prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?').get.bind(
    d.prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?')
  );
  const insert = d.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');

  Object.entries(ROLE_PERMISSION_MAP).forEach(([roleKey, permissions]) => {
    const roleId = roleMap[roleKey];
    if (!roleId) return;
    permissions.forEach(permissionKey => {
      if (permissionKey === '*') {
        Object.values(permissionMap).forEach(permissionId => insert.run(roleId, permissionId));
        return;
      }
      const permissionId = permissionMap[permissionKey];
      if (permissionId && !exists(roleId, permissionId)) {
        insert.run(roleId, permissionId);
      }
    });
  });
}

function seedPlatforms() {
  const d = getDB();
  const stmt = d.prepare(`
    INSERT INTO platforms (key, name, category, enabled, config_json, updated_at)
    VALUES (?, ?, ?, 1, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET name = excluded.name, category = excluded.category, config_json = excluded.config_json, updated_at = datetime('now')
  `);
  DEFAULT_PLATFORMS.forEach(platform => {
    stmt.run(platform.key, platform.name, platform.category, JSON.stringify(platform.config || {}));
  });
}

function seedTemplates() {
  const d = getDB();
  const stmt = d.prepare(`
    INSERT INTO templates (
      name, code, description, scene_type, template_type, target_platforms_json,
      step_config_json, variable_schema_json, content_prompt_template, image_prompt_template,
      output_schema_json, enabled, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      scene_type = excluded.scene_type,
      target_platforms_json = excluded.target_platforms_json,
      step_config_json = excluded.step_config_json,
      variable_schema_json = excluded.variable_schema_json,
      content_prompt_template = excluded.content_prompt_template,
      image_prompt_template = excluded.image_prompt_template,
      output_schema_json = excluded.output_schema_json,
      updated_at = datetime('now')
  `);

  DEFAULT_TEMPLATES.forEach(template => {
    stmt.run(
      template.name,
      template.code,
      template.description,
      template.scene_type,
      template.template_type,
      JSON.stringify(template.target_platforms),
      JSON.stringify(template.step_config),
      JSON.stringify(template.variable_schema),
      template.content_prompt_template,
      template.image_prompt_template,
      JSON.stringify(template.output_schema)
    );
  });
}

function seedUserRoles() {
  const d = getDB();
  const roleMap = Object.fromEntries(d.prepare('SELECT id, key FROM roles').all().map(row => [row.key, row.id]));
  const users = d.prepare('SELECT id, is_admin FROM users').all();
  const hasRole = d.prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?');
  const insert = d.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)');
  users.forEach(user => {
    const roleId = user.is_admin ? roleMap.super_admin : roleMap.operator;
    if (roleId && !hasRole.get(user.id, roleId)) {
      insert.run(user.id, roleId);
    }
  });
}

function parseJSON(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

// ---- System Config ----
function getSystemConfig(key) {
  const row = getDB().prepare('SELECT value FROM system_config WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSystemConfig(key, value) {
  getDB().prepare(`
    INSERT INTO system_config (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

// ---- Legacy Per-user Settings ----
function saveSetting(userId, key, value) {
  getDB().prepare(`
    INSERT INTO settings (user_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(userId, key, value);
}

function getSetting(userId, key) {
  const row = getDB().prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?').get(userId, key);
  return row ? row.value : null;
}

// ---- Points ----
function getUserPoints(userId) {
  const row = getDB().prepare('SELECT points FROM users WHERE id = ?').get(userId);
  return row ? row.points : 0;
}

function addPoints(userId, amount) {
  getDB().prepare('UPDATE users SET points = points + ? WHERE id = ?').run(amount, userId);
}

function deductPoints(userId, amount) {
  const d = getDB();
  const row = d.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  if (!row || row.points < amount) return false;
  d.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(amount, userId);
  return true;
}

// ---- Check-in ----
function checkinToday(userId) {
  const d = getDB();
  const today = new Date().toISOString().slice(0, 10);
  try {
    d.prepare('INSERT INTO checkins (user_id, check_date, points_earned) VALUES (?, ?, 20)').run(userId, today);
    addPoints(userId, 20);
    return true;
  } catch (_) {
    return false;
  }
}

function hasCheckedInToday(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = getDB().prepare('SELECT id FROM checkins WHERE user_id = ? AND check_date = ?').get(userId, today);
  return !!row;
}

// ---- Roles & Permissions ----
function listRoles() {
  return getDB().prepare('SELECT * FROM roles ORDER BY id ASC').all();
}

function listPermissions() {
  return getDB().prepare('SELECT * FROM permissions ORDER BY module ASC, id ASC').all();
}

function getRoleByKey(key) {
  return getDB().prepare('SELECT * FROM roles WHERE key = ?').get(key);
}

function getRoleById(id) {
  return getDB().prepare('SELECT * FROM roles WHERE id = ?').get(id);
}

function getUserRoleRows(userId) {
  return getDB().prepare(`
    SELECT r.id, r.key, r.name, r.description
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.id ASC
  `).all(userId);
}

function getUserPermissionRows(userId) {
  const d = getDB();
  const roles = getUserRoleRows(userId);
  if (!roles.length) return [];
  if (roles.some(role => role.key === 'super_admin')) {
    return listPermissions();
  }
  return d.prepare(`
    SELECT DISTINCT p.id, p.key, p.name, p.description, p.module
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = ?
    ORDER BY p.module ASC, p.id ASC
  `).all(userId);
}

function setUserRoles(userId, roleIds) {
  const d = getDB();
  const del = d.prepare('DELETE FROM user_roles WHERE user_id = ?');
  const ins = d.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)');
  const tx = d.transaction(() => {
    del.run(userId);
    roleIds.forEach(roleId => ins.run(userId, roleId));
  });
  tx();
}

// ---- Platforms ----
function listPlatforms() {
  return getDB().prepare('SELECT * FROM platforms ORDER BY id ASC').all().map(parsePlatformRow);
}

function getPlatformByKey(key) {
  const row = getDB().prepare('SELECT * FROM platforms WHERE key = ?').get(key);
  return row ? parsePlatformRow(row) : null;
}

function parsePlatformRow(row) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    category: row.category,
    enabled: !!row.enabled,
    config: parseJSON(row.config_json, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---- Templates ----
function listTemplates({ platformKey, enabledOnly = true } = {}) {
  let sql = 'SELECT * FROM templates WHERE 1=1';
  const params = [];
  if (enabledOnly) sql += ' AND enabled = 1';
  if (platformKey) {
    sql += ' AND target_platforms_json LIKE ?';
    params.push(`%"${platformKey}"%`);
  }
  sql += ' ORDER BY template_type DESC, id ASC';
  return getDB().prepare(sql).all(...params).map(parseTemplateRow);
}

function getTemplateById(id) {
  const row = getDB().prepare('SELECT * FROM templates WHERE id = ?').get(id);
  return row ? parseTemplateRow(row) : null;
}

function createTemplate(template) {
  const d = getDB();
  const result = d.prepare(`
    INSERT INTO templates (
      name, code, description, scene_type, template_type, target_platforms_json,
      step_config_json, variable_schema_json, content_prompt_template, image_prompt_template,
      output_schema_json, enabled, created_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    template.name,
    template.code,
    template.description || '',
    template.scene_type || '',
    template.template_type || 'custom',
    JSON.stringify(template.target_platforms || []),
    JSON.stringify(template.step_config || {}),
    JSON.stringify(template.variable_schema || []),
    template.content_prompt_template || '',
    template.image_prompt_template || '',
    JSON.stringify(template.output_schema || {}),
    template.enabled === false ? 0 : 1,
    template.created_by || null,
  );
  return getTemplateById(result.lastInsertRowid);
}

function updateTemplate(id, patch = {}) {
  const current = getTemplateById(id);
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
  };
  getDB().prepare(`
    UPDATE templates SET
      name = ?,
      code = ?,
      description = ?,
      scene_type = ?,
      template_type = ?,
      target_platforms_json = ?,
      step_config_json = ?,
      variable_schema_json = ?,
      content_prompt_template = ?,
      image_prompt_template = ?,
      output_schema_json = ?,
      enabled = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    next.name,
    next.code,
    next.description || '',
    next.scene_type || '',
    next.template_type || 'custom',
    JSON.stringify(next.target_platforms || []),
    JSON.stringify(next.step_config || {}),
    JSON.stringify(next.variable_schema || []),
    next.content_prompt_template || '',
    next.image_prompt_template || '',
    JSON.stringify(next.output_schema || {}),
    next.enabled === false ? 0 : 1,
    id,
  );
  return getTemplateById(id);
}

function cloneTemplate(id, overrides = {}) {
  const current = getTemplateById(id);
  if (!current) return null;
  const code = overrides.code || `${current.code}-copy-${Date.now()}`;
  return createTemplate({
    ...current,
    ...overrides,
    code,
    name: overrides.name || `${current.name}（副本）`,
    template_type: 'custom',
  });
}

function setPlatformEnabled(key, enabled) {
  getDB().prepare(`
    UPDATE platforms SET enabled = ?, updated_at = datetime('now') WHERE key = ?
  `).run(enabled ? 1 : 0, key);
  return getPlatformByKey(key);
}

function parseTemplateRow(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    scene_type: row.scene_type,
    template_type: row.template_type,
    target_platforms: parseJSON(row.target_platforms_json, []),
    step_config: parseJSON(row.step_config_json, {}),
    variable_schema: parseJSON(row.variable_schema_json, []),
    content_prompt_template: row.content_prompt_template || '',
    image_prompt_template: row.image_prompt_template || '',
    output_schema: parseJSON(row.output_schema_json, {}),
    enabled: !!row.enabled,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---- Tasks ----
function createTask(task) {
  const d = getDB();
  const result = d.prepare(`
    INSERT INTO tasks (
      type, source, status, priority, user_id, platform_key, template_id, history_id,
      parent_task_id, input_json, prompt_snapshot_json, output_json, error_json,
      external_job_id, progress_step, progress_message, attempts, scheduled_at,
      started_at, finished_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    task.type,
    task.source || 'manual',
    task.status || 'queued',
    task.priority ?? 50,
    task.user_id,
    task.platform_key || null,
    task.template_id || null,
    task.history_id || null,
    task.parent_task_id || null,
    task.input_json ? JSON.stringify(task.input_json) : null,
    task.prompt_snapshot_json ? JSON.stringify(task.prompt_snapshot_json) : null,
    task.output_json ? JSON.stringify(task.output_json) : null,
    task.error_json ? JSON.stringify(task.error_json) : null,
    task.external_job_id || null,
    task.progress_step || null,
    task.progress_message || null,
    task.attempts || 0,
    task.scheduled_at || null,
    task.started_at || null,
    task.finished_at || null,
  );
  return getTaskById(result.lastInsertRowid);
}

function updateTask(taskId, patch = {}) {
  const current = getTaskById(taskId);
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
  };
  getDB().prepare(`
    UPDATE tasks SET
      type = ?,
      source = ?,
      status = ?,
      priority = ?,
      user_id = ?,
      platform_key = ?,
      template_id = ?,
      history_id = ?,
      parent_task_id = ?,
      input_json = ?,
      prompt_snapshot_json = ?,
      output_json = ?,
      error_json = ?,
      external_job_id = ?,
      progress_step = ?,
      progress_message = ?,
      attempts = ?,
      scheduled_at = ?,
      started_at = ?,
      finished_at = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    next.type,
    next.source,
    next.status,
    next.priority ?? 50,
    next.user_id,
    next.platform_key || null,
    next.template_id || null,
    next.history_id || null,
    next.parent_task_id || null,
    next.input_json ? JSON.stringify(next.input_json) : null,
    next.prompt_snapshot_json ? JSON.stringify(next.prompt_snapshot_json) : null,
    next.output_json ? JSON.stringify(next.output_json) : null,
    next.error_json ? JSON.stringify(next.error_json) : null,
    next.external_job_id || null,
    next.progress_step || null,
    next.progress_message || null,
    next.attempts || 0,
    next.scheduled_at || null,
    next.started_at || null,
    next.finished_at || null,
    taskId,
  );
  return getTaskById(taskId);
}

function getTaskById(id) {
  const row = getDB().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return row ? parseTaskRow(row) : null;
}

function listTasks({ userId, canManageAll = false, status, platformKey, page = 1, pageSize = 20 } = {}) {
  const d = getDB();
  const where = [];
  const params = [];
  if (!canManageAll) {
    where.push('user_id = ?');
    params.push(userId);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (platformKey) {
    where.push('platform_key = ?');
    params.push(platformKey);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  const total = d.prepare(`SELECT COUNT(*) as count FROM tasks ${whereSql}`).get(...params).count;
  const rows = d.prepare(`SELECT * FROM tasks ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);
  return { total, page, pageSize, list: rows.map(parseTaskRow) };
}

function appendTaskEvent(taskId, event_type, message, payload_json) {
  getDB().prepare(`
    INSERT INTO task_events (task_id, event_type, message, payload_json)
    VALUES (?, ?, ?, ?)
  `).run(taskId, event_type, message || null, payload_json ? JSON.stringify(payload_json) : null);
}

function listTaskEvents(taskId) {
  return getDB().prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY id ASC').all(taskId).map(row => ({
    ...row,
    payload_json: parseJSON(row.payload_json, null),
  }));
}

function getPendingExternalTasks() {
  const rows = getDB().prepare(`
    SELECT * FROM tasks
    WHERE status = 'waiting_external' AND external_job_id IS NOT NULL
    ORDER BY id ASC
  `).all();
  return rows.map(parseTaskRow);
}

function parseTaskRow(row) {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    status: row.status,
    priority: row.priority,
    user_id: row.user_id,
    platform_key: row.platform_key,
    template_id: row.template_id,
    history_id: row.history_id,
    parent_task_id: row.parent_task_id,
    input_json: parseJSON(row.input_json, null),
    prompt_snapshot_json: parseJSON(row.prompt_snapshot_json, null),
    output_json: parseJSON(row.output_json, null),
    error_json: parseJSON(row.error_json, null),
    external_job_id: row.external_job_id,
    progress_step: row.progress_step,
    progress_message: row.progress_message,
    attempts: row.attempts || 0,
    scheduled_at: row.scheduled_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---- History CRUD ----
function createHistory(userId, record) {
  const d = getDB();
  const stmt = d.prepare(`
    INSERT INTO history (
      user_id, original_image, recognition_result, copy_result, generated_images,
      status, job_id, task_id, platform_key, template_id, workflow_mode,
      prompt_snapshot_json, result_snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId,
    record.original_image || null,
    record.recognition_result ? JSON.stringify(record.recognition_result) : null,
    record.copy_result ? JSON.stringify(record.copy_result) : null,
    record.generated_images ? JSON.stringify(record.generated_images) : null,
    record.status || 'completed',
    record.job_id || null,
    record.task_id || null,
    record.platform_key || 'dewu',
    record.template_id || null,
    record.workflow_mode || 'manual',
    record.prompt_snapshot_json ? JSON.stringify(record.prompt_snapshot_json) : null,
    record.result_snapshot_json ? JSON.stringify(record.result_snapshot_json) : null,
  );
  return getHistoryById(userId, result.lastInsertRowid);
}

function getHistoryList(userId, page = 1, pageSize = 20) {
  const d = getDB();
  const offset = (page - 1) * pageSize;
  const total = d.prepare('SELECT COUNT(*) as count FROM history WHERE user_id = ?').get(userId).count;
  const rows = d.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?').all(userId, pageSize, offset);
  return { total, page, pageSize, list: rows.map(parseHistoryRow) };
}

function getHistoryById(userId, id) {
  const row = getDB().prepare('SELECT * FROM history WHERE id = ? AND user_id = ?').get(id, userId);
  return row ? parseHistoryRow(row) : null;
}

function deleteHistory(userId, id) {
  getDB().prepare('DELETE FROM history WHERE id = ? AND user_id = ?').run(id, userId);
}

function updateHistoryStatus(userId, id, patchOrStatus, generatedImages, jobId) {
  const current = getHistoryById(userId, id);
  if (!current) return null;

  let patch;
  if (typeof patchOrStatus === 'object' && patchOrStatus !== null) {
    patch = patchOrStatus;
  } else {
    patch = {
      status: patchOrStatus,
      generated_images: generatedImages,
      job_id: jobId,
    };
  }

  const next = {
    ...current,
    ...patch,
  };

  getDB().prepare(`
    UPDATE history SET
      original_image = ?,
      recognition_result = ?,
      copy_result = ?,
      generated_images = ?,
      status = ?,
      job_id = ?,
      task_id = ?,
      platform_key = ?,
      template_id = ?,
      workflow_mode = ?,
      prompt_snapshot_json = ?,
      result_snapshot_json = ?
    WHERE id = ? AND user_id = ?
  `).run(
    next.original_image || null,
    next.recognition_result ? JSON.stringify(next.recognition_result) : null,
    next.copy_result ? JSON.stringify(next.copy_result) : null,
    next.generated_images ? JSON.stringify(next.generated_images) : null,
    next.status || 'completed',
    next.job_id || null,
    next.task_id || null,
    next.platform_key || 'dewu',
    next.template_id || null,
    next.workflow_mode || 'manual',
    next.prompt_snapshot_json ? JSON.stringify(next.prompt_snapshot_json) : null,
    next.result_snapshot_json ? JSON.stringify(next.result_snapshot_json) : null,
    id,
    userId,
  );
  return getHistoryById(userId, id);
}

function getPendingHistory() {
  const rows = getDB().prepare(`
    SELECT * FROM history
    WHERE status = 'pending_image' AND job_id IS NOT NULL
    ORDER BY id ASC
  `).all();
  return rows.map(parseHistoryRow);
}

function parseHistoryRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    original_image: row.original_image,
    recognition_result: parseJSON(row.recognition_result, null),
    copy_result: parseJSON(row.copy_result, null),
    generated_images: parseJSON(row.generated_images, null),
    status: row.status,
    job_id: row.job_id || null,
    task_id: row.task_id || null,
    platform_key: row.platform_key || 'dewu',
    template_id: row.template_id || null,
    workflow_mode: row.workflow_mode || 'manual',
    prompt_snapshot_json: parseJSON(row.prompt_snapshot_json, null),
    result_snapshot_json: parseJSON(row.result_snapshot_json, null),
    created_at: row.created_at,
  };
}

module.exports = {
  getDB,
  saveSetting,
  getSetting,
  getSystemConfig,
  setSystemConfig,
  getUserPoints,
  addPoints,
  deductPoints,
  checkinToday,
  hasCheckedInToday,
  listRoles,
  listPermissions,
  getRoleByKey,
  getRoleById,
  getUserRoleRows,
  getUserPermissionRows,
  setUserRoles,
  listPlatforms,
  getPlatformByKey,
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  cloneTemplate,
  setPlatformEnabled,
  createTask,
  updateTask,
  getTaskById,
  listTasks,
  appendTaskEvent,
  listTaskEvents,
  getPendingExternalTasks,
  createHistory,
  getHistoryList,
  getHistoryById,
  deleteHistory,
  updateHistoryStatus,
  getPendingHistory,
};
