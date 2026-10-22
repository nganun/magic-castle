// 通用小工具：数值裁剪与 HTML 转义。
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
