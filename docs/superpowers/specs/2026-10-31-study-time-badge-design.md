# 魔法城堡学习时长可视化徽章设计规范

**文档状态**: Approved / Ready for Implementation  
**日期**: 2026-10-31  

---

## 1. 目标与用户体验
让小朋友与家长能够随时随地直观了解当天的累计学习（探险）时长，激发学习成就感，并配合儿童语音播报。

---

## 2. 详细交互与视觉设计

### 1) 顶栏常驻计时胶囊（`#studyTimePill`）
- **位置**：置于顶部栏 `.top-actions` 中，位于魔法星按钮（`#gemCountBtn`）与静音按钮之间；
- **视觉风格**：
  - 采用柔和的紫色/金色渐变胶囊；
  - 结构：`<button class="study-time-pill" id="studyTimePill" type="button" aria-label="今天已探险 0 分钟"><span class="hourglass-icon">⏳</span><b id="studyTimeTotal">0m</b></button>`；
  - 遵循 44px 防误触隐形热区规范；
- **交互与语音播报**：
  - 点击触发轻触音效与露娜语音：
    > `“荆宝，今天已经认真探险了 X 分钟啦！继续加油哦！”`（不足 1 分钟时念“刚刚开始探险”）。

### 2) 魔法城堡首页悬浮时长卡片（`#homeStudyStatus`）
- **位置**：位于首页大地图 `.theme-map` 下方（与 `#dailyRoute` 相呼应，或居中置于探索路线下方）；
- **视觉风格**：
  - 半透明磨砂玻璃胶囊：`background: rgba(255, 255, 255, 0.88); border: 2.5px solid #e9ddf3;`；
  - 文案：`⏳ 今日已探险 X 分钟`，字号 14px，加粗；
- **交互与语音播报**：
  - 点击同样触发露娜场景化鼓励语音。

---

## 3. 数据绑定与更新机制
- 在 `updateProgress()` 中统一读取 `studyTodaySeconds()`；
- 计算分钟数 `Math.floor(studyTodaySeconds() / 60)`；
- 实时刷新 `#studyTimeTotal` 与 `#homeStudyStatus`；
- 学习计时更新或切屏时均实时响应。

---

## 4. 约束与测试
- 严格发版红线：不修改版本号，不发版；
- 全量自动化测试：保证 56 项测试持续满分绿灯。
