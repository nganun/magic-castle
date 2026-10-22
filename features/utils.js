// 通用小工具：数值裁剪与 HTML 转义。
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

// 0~100 的中文读法（数字泡泡用中文念数字）
const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
export function chineseNumber(value) {
  const count = Math.floor(Number(value));
  if (!Number.isFinite(count) || count < 0 || count > 100) return String(value);
  if (count < 10) return CN_DIGITS[count];
  if (count === 10) return '十';
  if (count === 100) return '一百';
  if (count < 20) return `十${CN_DIGITS[count - 10]}`;
  const tens = Math.floor(count / 10);
  const ones = count % 10;
  return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ''}`;
}
