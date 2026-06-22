function getStorageKey(userId) {
  return `dewu-local-history:${userId || 'guest'}`;
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_) {
    return fallback;
  }
}

function listLocalHistory(userId) {
  return safeParse(localStorage.getItem(getStorageKey(userId)), []);
}

function writeLocalHistory(userId, list) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(list));
}

function createLocalHistoryRecord(userId, record) {
  const list = listLocalHistory(userId);
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next = {
    id: localId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...record,
  };
  writeLocalHistory(userId, [next, ...list]);
  return next;
}

function updateLocalHistoryRecord(userId, id, patch) {
  const list = listLocalHistory(userId);
  const nextList = list.map(item => item.id === id ? { ...item, ...patch, updated_at: new Date().toISOString() } : item);
  writeLocalHistory(userId, nextList);
  return nextList.find(item => item.id === id) || null;
}

function upsertLocalHistoryRecord(userId, matcher, record) {
  const list = listLocalHistory(userId);
  const index = list.findIndex(item => matcher(item));
  if (index === -1) {
    return createLocalHistoryRecord(userId, record);
  }
  const next = { ...list[index], ...record, updated_at: new Date().toISOString() };
  list[index] = next;
  writeLocalHistory(userId, list);
  return next;
}

function deleteLocalHistoryRecord(userId, id) {
  const list = listLocalHistory(userId).filter(item => item.id !== id);
  writeLocalHistory(userId, list);
}

export {
  listLocalHistory,
  createLocalHistoryRecord,
  updateLocalHistoryRecord,
  upsertLocalHistoryRecord,
  deleteLocalHistoryRecord,
};
