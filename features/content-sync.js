// 学习内容三方合并：把官方新版本合并进本机生效层，保住家长自己的修改。
// 纯函数，不碰 DOM 与存储，便于在 Node 里直接单测。

import { sameGroupContent } from './content-files.js';

const KINDS = ['english', 'hanzi', 'recital'];

function groupMap(groups = []) {
  const map = new Map();
  groups.forEach((group) => { if (group?.id) map.set(group.id, group); });
  return map;
}

/**
 * @param previousOfficial 上一次同步的官方内容（kind 分层结构），首次同步时传内置内容
 * @param nextOfficial     这次拉到的官方内容（kind 分层结构）
 * @param local            本机生效层（adminContent）
 * @returns { content, summary } content 是合并后的本机内容，summary 列出各类变化
 */
export function mergeSyncedContent({ previousOfficial = {}, nextOfficial = {}, local = {} } = {}) {
  const content = {};
  const summary = { added: [], updated: [], keptLocal: [], removed: [] };

  KINDS.forEach((kind) => {
    const localKind = local[kind] || {};
    const deleted = new Set(Array.isArray(localKind.deletedGroupIds) ? localKind.deletedGroupIds : []);
    const localGroups = groupMap(localKind.groups);
    const previousGroups = groupMap(previousOfficial[kind]?.groups);
    const nextGroups = groupMap(nextOfficial[kind]?.groups);
    const merged = [];

    nextGroups.forEach((officialGroup) => {
      if (deleted.has(officialGroup.id)) return; // 用户删过：官方也不复活
      const localGroup = localGroups.get(officialGroup.id);
      if (!localGroup) {
        merged.push(officialGroup);
        summary.added.push({ id: officialGroup.id, name: officialGroup.name, kind });
        return;
      }
      const previous = previousGroups.get(officialGroup.id);
      const userModified = previous ? !sameGroupContent(kind, localGroup, previous) : true;
      if (!userModified) {
        merged.push(officialGroup);
        if (!sameGroupContent(kind, localGroup, officialGroup)) {
          summary.updated.push({ id: officialGroup.id, name: officialGroup.name, kind });
        }
        return;
      }
      // 保留本地内容，但目录归官方所有
      merged.push({ ...localGroup, directory: officialGroup.directory });
      summary.keptLocal.push({ id: officialGroup.id, name: localGroup.name || officialGroup.name, kind });
    });

    localGroups.forEach((localGroup) => {
      if (deleted.has(localGroup.id)) return;
      if (nextGroups.has(localGroup.id)) return;
      const previous = previousGroups.get(localGroup.id);
      if (!previous) {
        merged.push(localGroup); // 用户自建的分组：原样保留，不算冲突
        return;
      }
      if (sameGroupContent(kind, localGroup, previous)) {
        summary.removed.push({ id: localGroup.id, name: localGroup.name, kind }); // 用户没改过 → 随官方一起删除
        return;
      }
      merged.push(localGroup);
      summary.keptLocal.push({ id: localGroup.id, name: localGroup.name, kind });
    });

    content[kind] = { ...localKind, groups: merged };
  });

  return { content, summary };
}

// 「恢复官方内容」：用官方内容重建本机分组，保留用户删掉的记录与当前选择。
export function restoreOfficialContent({ official = {}, local = {} } = {}) {
  const content = {};
  KINDS.forEach((kind) => {
    const localKind = local[kind] || {};
    const deleted = new Set(Array.isArray(localKind.deletedGroupIds) ? localKind.deletedGroupIds : []);
    const groups = (official[kind]?.groups || []).filter((group) => !deleted.has(group.id));
    content[kind] = { ...localKind, groups };
  });
  return content;
}
