// 通用篇目浏览器（朗诵篇目 / 汉字分组 / 英文分组共用）：
// 目录树由分组的 directory 现算，任意层级、任意名字，代码不写死任何关键词。

import { createStorage } from './storage.js';
import { escapeHtml } from './utils.js';

const storage = createStorage(() => {});
const BROWSER_PATHS_KEY = 'luna-browser-paths';
let browserPaths = (() => { const saved = storage.load(BROWSER_PATHS_KEY, {}); return saved && typeof saved === 'object' ? saved : {}; })();
const browserExpanded = {};

export const BROWSER_ICONS = {
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5.4"/><path d="M6.4 11 12 5.4 17.6 11"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6.6 12 11.6 17 6.6"/><path d="M7 12 12 17 17 12"/></svg>',
  collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17.4 12 12.4 17 17.4"/><path d="M7 12 12 7 17 12"/></svg>',
};

export function countTreeItems(node) {
  return node.groups.length + [...node.dirs.values()].reduce((sum, child) => sum + countTreeItems(child), 0);
}

export function browserScopePath(scope) {
  const saved = browserPaths[scope];
  // null = 还没进过（用默认层级：当前分组所在目录）；[] = 用户主动回到根层
  return Array.isArray(saved) ? saved.filter((part) => typeof part === 'string') : null;
}

export function setBrowserScopePath(scope, path) {
  browserPaths[scope] = path;
  storage.save(BROWSER_PATHS_KEY, browserPaths);
}

export function browserMarkup(scope, options) {
  const { node, path, activeId, rootTitle, pathPrefix, activeLabel, unitLabel = '篇' } = options;
  const items = [
    ...[...node.dirs.values()].map((folder) => `<button class="content-browser-item is-folder" type="button" data-browser-folder="${escapeHtml(folder.name)}"><span class="content-browser-icon" aria-hidden="true">📁</span>${escapeHtml(folder.name)}<em>${countTreeItems(folder)} ${unitLabel}</em></button>`),
    ...node.groups.map((group) => `<button class="content-browser-item is-article ${group.id === activeId ? 'active' : ''}" type="button" data-browser-group="${escapeHtml(group.id)}">${escapeHtml(group.name)}${group.id === activeId ? `<em>${activeLabel}</em>` : ''}</button>`),
  ].join('');
  const header = path.length ? `${pathPrefix}/${path.join('/')}` : rootTitle;
  const expanded = Boolean(browserExpanded[scope]);
  const upButton = path.length ? `<button class="content-browser-action" type="button" data-browser-up aria-label="回到上一层" title="上一层">${BROWSER_ICONS.up}</button>` : '';
  const toggleButton = `<button class="content-browser-action" type="button" data-browser-toggle aria-label="${expanded ? '收起' : '展开全部'}" title="${expanded ? '收起' : '展开'}">${expanded ? BROWSER_ICONS.collapse : BROWSER_ICONS.expand}</button>`;
  return `<nav class="content-browser ${expanded ? 'is-expanded' : ''}" aria-label="${escapeHtml(pathPrefix)}"><div class="content-browser-head"><span class="content-browser-title">${escapeHtml(header)}</span><span class="content-browser-actions">${upButton}${toggleButton}</span></div><div class="content-browser-items">${items || '<span class="content-browser-empty">这一层还没有内容</span>'}</div></nav>`;
}

export function bindContentBrowser(root, { scope, path, onSelect, onChange }) {
  root.querySelectorAll('[data-browser-folder]').forEach((button) => button.addEventListener('click', () => {
    setBrowserScopePath(scope, [...path, button.dataset.browserFolder]);
    onChange();
  }));
  root.querySelectorAll('[data-browser-up]').forEach((button) => button.addEventListener('click', () => {
    setBrowserScopePath(scope, path.slice(0, -1));
    onChange();
  }));
  root.querySelectorAll('[data-browser-toggle]').forEach((button) => button.addEventListener('click', () => {
    browserExpanded[scope] = !browserExpanded[scope];
    onChange();
  }));
  root.querySelectorAll('[data-browser-group]').forEach((button) => button.addEventListener('click', () => onSelect(button.dataset.browserGroup)));
  // 紧凑模式是单行滑动，把当前选中的那一项挪到可见处
  const items = root.querySelector('.content-browser-items');
  const active = root.querySelector('.content-browser-item.is-article.active');
  if (items && active && !browserExpanded[scope]) items.scrollLeft = Math.max(0, active.offsetLeft - items.offsetLeft - 8);
}
