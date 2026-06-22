const { getDB, getRoleByKey, setUserRoles, getUserRoleRows, getUserPermissionRows } = require('./storage');

function getUserRoles(userId) {
  return getUserRoleRows(userId).map(role => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
  }));
}

function getUserPermissions(userId) {
  return getUserPermissionRows(userId).map(permission => ({
    id: permission.id,
    key: permission.key,
    name: permission.name,
    description: permission.description,
    module: permission.module,
  }));
}

function hasPermission(permissionList = [], permissionKey) {
  return permissionList.some(permission => permission.key === permissionKey);
}

function ensureUserAccessSeed(userId) {
  const roles = getUserRoleRows(userId);
  if (roles.length) return;
  const user = getDB().prepare('SELECT id, is_admin FROM users WHERE id = ?').get(userId);
  if (!user) return;
  const fallbackRole = getRoleByKey(user.is_admin ? 'super_admin' : 'operator');
  if (fallbackRole) {
    setUserRoles(userId, [fallbackRole.id]);
  }
}

function buildUserAccess(userId) {
  ensureUserAccessSeed(userId);
  const roles = getUserRoles(userId);
  const permissions = getUserPermissions(userId);
  return {
    roles,
    permissions,
    roleKeys: roles.map(role => role.key),
    permissionKeys: permissions.map(permission => permission.key),
    isAdmin: roles.some(role => role.key === 'super_admin' || role.key === 'ops_admin'),
  };
}

module.exports = {
  getUserRoles,
  getUserPermissions,
  hasPermission,
  buildUserAccess,
};
