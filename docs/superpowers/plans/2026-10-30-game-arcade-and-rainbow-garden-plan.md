# 小小游戏机扩充与彩虹花园重构实施计划

## 阶段 1：数据层与构建工具扩充（彩虹花园数据驱动）
- [ ] 创建 `data/misc/基础/形状.txt`
- [ ] 创建 `data/misc/基础/颜色.txt`
- [ ] 扩充 `features/content-files.js`（支持 `misc` 类型，`CONTENT_KINDS`）
- [ ] 扩充 `features/content-sync.js`（`KINDS` 支持 `misc`）
- [ ] 调整/扩充自动化测试用例，确保 `npm test` 通过

## 阶段 2：小小游戏机优化与调整
- [ ] 移除 `arrows`（箭头快跑）
- [ ] `numbers`（数字泡泡）扩展至 10 个关卡
- [ ] 修复 `catch`（接水果）在移动端与 iframe 中的触摸/滑动灵敏度

## 阶段 3：小游戏集成（8 款小游戏）
- [ ] 拷贝并整理 `minigame-everyday` 的 6 款游戏至 `vendor/mini-games/`
- [ ] 拷贝 `xlegex` 静态资源
- [ ] 构建并拷贝 `yulegeyu` 静态资源
- [ ] 在 `features/arcade-games.js` 和 `app.js` 中完整注册 8 款小游戏并测试沙箱运行

## 阶段 4：彩虹花园（形状与颜色）学习系统重构
- [ ] 实现形状与颜色的 SVG / 视觉渲染
- [ ] 重构彩虹花园主学习页为卡片式认知流（大图 + 发音 + 点击继续翻页）
- [ ] 实现全屏认知卡片库弹窗（分组 Tab、网格卡片矩阵、点选发音、定向跳转、连续朗读）
- [ ] 内容工作台支持 `misc` 分组配置与同步

## 阶段 5：内置 Issue 记事簿与反馈功能
- [ ] 在「家长小站」新增「记录想法与 Bug / 提 Issue」入口
- [ ] 实现 Issue 记录、状态管理、一键生成 GitHub Markdown 与导出

## 阶段 6：回归测试与质量验证
- [ ] `npm run content:build`
- [ ] `npm test` 全绿
- [ ] `node --check app.js` 语法检测
