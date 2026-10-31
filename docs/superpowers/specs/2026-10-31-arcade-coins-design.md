# 小小游戏机魔法游戏币（每日限次与学课激励）设计文档

**文档状态**: Approved / Ready for Implementation  
**日期**: 2026-10-31  

---

## 1. 目标与背景

当前小小游戏机采用了基于“学习时长换算游戏时间”的防沉迷机制。然而对于 3~6 岁儿童而言，“分钟数”等抽象时间概念感知弱，且时间突然截止容易导致挫败情绪。  
为了提供更加直观、富有童趣且正向引导学习的防沉迷体验，现设计并实现 **【魔法游戏币（Arcade Coins 🪙）】机制**：
1. **每日初始额度**：每天给孩子发放 3 枚魔法游戏币。
2. **直观消耗**：每开启一局小游戏扣除 1 枚游戏币（用完即止）。
3. **学课赢币激励闭环**：币用尽后，完成一节新课程（`completeReview` / `completeTheme` 获得星星）可额外奖励 1 枚游戏币（每日奖励上限 2 枚，全天最多游玩 5 局）。
4. **家长模式特权**：启用家长模式后，显示“🛡️ 家长模式：无限畅玩”，免币体验。

---

## 2. 数据模型与生命周期

在 `state.arcadeStats` 下新增持久化字段，伴随 `todayKey` 自动按日隔离刷新：
```js
state.arcadeStats = {
  ...state.arcadeStats,
  coinsBonus: { [todayKey]: 0 }, // 今日通过上课额外赢取的币数（最大 2）
  // 沿用已有的 dailyPlays: { [todayKey]: count } 记录今日已游玩局数
}
```
**今日可用币数计算公式**：
```js
function arcadeAvailableCoins() {
  if (parentModeEnabled) return 999;
  const baseCoins = 3;
  const bonusCoins = Math.min(2, Number(state.arcadeStats.coinsBonus?.[todayKey] || 0));
  const totalCoins = baseCoins + bonusCoins;
  const usedCoins = Number(state.arcadeStats.dailyPlays?.[todayKey] || 0);
  return Math.max(0, totalCoins - usedCoins);
}
```

---

## 3. 界面呈现与交互逻辑

### 3.1 游戏机大厅头部（`arcade-hub`）
- 替换原有枯燥的分钟文字，升级为形象的**魔法币状态槽**：
  - 示例：`🪙 魔法游戏币：🟡 🟡 ⚪（剩余 2 枚）`
  - 徽章辅助说明：`今日免费 3 枚 · 上课可再赢 2 枚`
- 家长模式下展示：`🛡️ 家长模式已开启（免投币畅玩）`

### 3.2 游戏启动与拦截
- **币充足（coins > 0 或 家长模式）**：
  - 点击游戏卡片正常进入，触发清脆投币/开局音效（`playSfx('pop')`），并使 `dailyPlays + 1`；
  - 界面实时减少 1 枚币。
- **币耗尽（coins === 0）**：
  - 拦截进入，弹出友好弹窗 / Toast 并语音播报：
    > *“今天的魔法币用完啦！去完成一节新课程，露娜就会再奖给你 1 枚魔法币哟！”*
  - 弹窗提供快速通道：**【去上课赢游戏币】**（直接跳转至当前课程 `setScreen('lesson')`）。
  - 若已达到全天最高上限（已赢取 2 枚，共 5 局）：
    > *“今天已经很棒啦！小小游戏机要休息了，明天再来找露娜玩吧！”*

### 3.3 学习完成奖励触发
- 在 `completeReview()` / `completeTheme()` 结算触发 `awardGroupStar()` 时：
  - 若今日奖励币未达上限（`bonusCoins < 2`），则 `coinsBonus[todayKey] += 1`；
  - 提示追加语音与气泡：*“⭐ 获得 1 颗魔法星！额外获得 1 枚魔法游戏币 🪙！”*。

---

## 4. 严谨约束与质量保障
- 保持无发版状态：不动版本号、不动 gradle。
- 确保已有的 56 项 Node 测试全部绿灯通过。
