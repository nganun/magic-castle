# 魔法城堡全维度体验与性能综合优化方案

**文档状态**: Approved / Ready for Implementation  
**日期**: 2026-10-31  

---

## 1. 目标与背景

为了在保持《魔法城堡》儿童向高级童话绘本美感的同时，进一步强化 3~7 岁幼儿的操作容错度、性能表现和学习自驱力，本优化方案覆盖以下 5 个核心领域：
1. **隐形触控热区（Fat-Finger Friendly）**：解决顶栏紧凑排列下的精准触控问题。
2. **星光奇遇自驱学习闭环（Drive to Learn）**：让未解锁节点的激励直接转化为去上课的行动力。
3. **音频播放防抖（Audio Throttling）**：防止儿童高频连续敲击引起的音频并发爆音与卡顿。
4. **触觉轻震动反馈（Haptic Feedback）**：在高光时刻（答对、解锁、通关）给予轻微触觉反馈。
5. **长列表渲染优化（Rendering Performance）**：为路线图 58 个矢量节点注入现代 CSS 离屏渲染优化。

---

## 2. 详细技术实现

### 2.1 隐形触控热区拓展
- **位置**：`style.css`
- **逻辑**：在 `.gem-count`、`.sound-toggle`、`.parent-button` 上运用 `position: relative`，并通过 `::before` 拓展 `position: absolute; inset: -6px -4px;` 的透明热区，使得视觉上零间距，但触控面积达标 44px。

### 2.2 星光奇遇之路“立即学习”引导闭环
- **位置**：`app.js`（`renderRoadmap()`）
- **逻辑**：当孩子点击当前目标节点时，除了语音鼓励，还提供直接开始学习的入口，支持直接导航到当前课程（`setScreen('lesson')`）。

### 2.3 音频防抖与触觉轻震动
- **位置**：`app.js`
- **逻辑**：
  - 新增 `sfxLastPlayed = {}` 记录音效触发时间戳，80ms 内同名音效防抖。
  - 新增 `triggerHaptic(duration = 15)`，在答对题目、路线图互动及开宝箱时调用 `navigator.vibrate`（安全判断支持性）。

### 2.4 长列表性能优化
- **位置**：`styles/screens/roadmap.css`
- **逻辑**：在 `.roadmap-node-row` 上加入 `content-visibility: auto` 和 `contain-intrinsic-size: 0 86px`，大幅减轻低端设备渲染 58 个 SVG 矢量的负载。

---

## 3. 约束与测试
- 严格遵循发版约定，不升版本号。
- 保证已有的 56 项 Node 测试全部持续通过。
