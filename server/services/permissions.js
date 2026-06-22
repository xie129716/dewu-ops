const { getUserRoleRows, getUserPermissionRows } = require('./storage');

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

function buildUserAccess(userId) {
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
