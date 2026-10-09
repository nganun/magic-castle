# 设计：内置楷体替换为 AR PL UKai（传统楷体 + 伪粗）

日期：2026-10-09
状态：已获用户批准

## 背景与目标

当前内置的 `CastleKai`（霞鹜文楷 LXGW WenKai 子集）源自日本 Klee One，带教科书体/仿宋味，
用户认为不像"传统楷体"。目标是把内置楷体换成风格更传统的 **AR PL UKai**，并让已经使用楷体的
文字呈现**加粗**效果。范围限定为现有已使用楷体字体栈的位置（17 处），不做全站楷体化。

## 已确认的决策

1. **字体**：AR PL UKai（AR PL KaitiM GB/Big5，Arphic Public License，可自由打包分发），
   从 Debian 包 `fonts-arphic-ukai` 的 `ukai.ttc` 中取**简体（KaitiM GB）字面**。
   否决项：全字库正楷体 TW-Kai（简体覆盖不足、需署名）、霞鹜文楷 GB（风格不变）。
2. **加载方式不变**：沿用 `@font-face { font-family: "CastleKai" }` + 子集化 woff2，
   覆盖同一文件 `assets/fonts/castle-kai.woff2`，家族名仍为 `CastleKai`，
   因此字体栈、SW 预缓存、`index.html` preload 的路径全部无需改动。
3. **字体栈顺序**：`CastleKai` 提到每栈**第一个 CJK 位置**（即 `"CastleKai","Kaiti SC","STKaiti","KaiTi",...`）。
   例外：栈首已有西文字体（如 `"Baloo 2"`）的，CastleKai 紧跟其后，保证英文/数字仍走西文字体，
   只有汉字落到 CastleKai（UKai 的西文难看）。
   注：当前 17 处栈中**没有**以西文字体开头的实例，此例外规则目前不会触发，实现时不要主动去造这种栈。
   无西文字体的栈里若有英文/数字，会落到 UKai 西文——这些位置以汉字为主，影响可接受（用户已确认）。
4. **加粗（伪粗）**：`@font-face` 的 `font-weight: 400 900` 改为 `400`，
   使所有已请求粗体的元素（`<b>`/`<h2>` 默认 bold、显式 `font-weight:900/800`）自动合成粗体。
   实施前先**审计** 17 处栈对应元素的实际字重，列出真正"未请求粗体"的清单，
   仅对清单内的元素补 `font-weight:700`；已请求 800/900 的**不得**改成 700（例如 `.content-config-icon`
   基础规则已是 `font-weight:900`，无需改动）。审计结果为空则跳过此步。
5. **许可文件**：删除 `assets/fonts/LICENSE-LXGW-WenKai-OFL.txt`，替换为 Arphic Public License 文本；
   `style.css` 头部注释同步更新为 UKai。
6. **发布**：版本升至 **v1.0.14**（`versionCode 15`），SW 缓存键、`app.js?v=`、`style.css?v=` 同步；
   一并带上上一轮未发布的"手机系统语言为英文导致中文朗读无声"的 Toast 提示改动。

## 实施步骤

1. 获取 `fonts-arphic-ukai` 包，取出 `ukai.ttc` 中简体（KaitiM GB）字面转为 ttf；
   用 fonttools 读取 ttc 的 face 列表确认简体字面的 font-number（通常按 CN/GB 命名），
   避免取到 Big5/繁体字面。
2. 用 scratchpad 中 fonttools venv（fonttools + brotli）按 `assets/fonts/charset.txt`
   （GB2312 全集 + 项目用字）执行 `pyftsubset ... --flavor=woff2 --no-hinting --no-glyph-names --desubroutinize`，
   输出覆盖 `assets/fonts/castle-kai.woff2`。
   venv 不存在时重建：`python3 -m venv <scratchpad>/ftenv && <scratchpad>/ftenv/bin/pip install fonttools brotli`。
3. 运行覆盖率检查：对比 charset.txt 与子集后的 cmap，报告任何缺字；缺字需回退到 UKai 另一字面或保留兜底。
4. 更新 `assets/fonts/` 许可文件（Arphic）与 `style.css` 头部注释。
5. 调整 `style.css`：
   - `@font-face` 改 `font-weight:400`；
   - 17 处字体栈按"打包字体优先、西文优先于 CastleKai"规则重排；
   - 少数未请求粗体的楷体元素补 `font-weight:700`。
6. 版本号同步：`package.json`、`android/app/build.gradle`、`service-worker.js`、`index.html` 的 `?v=`。
7. 验证：本地打开汉字学习页/朗读页/古诗页肉眼比对；`node --check app.js`；`npm run apk:debug` 构建。

## 验收标准

- Android 与网页端汉字均显示传统楷体 UKai（打包字体优先，系统楷体不再抢占）。
- 汉字大字、词卡、古诗行等位置呈明显加粗效果。
- 英文、数字、标点不被 UKai 西文覆盖——仅对**含西文字体的字体栈**验收；
  无西文字体的栈中英文/数字落到 UKai 属可接受范围。
- 子集无缺字（charset.txt 全覆盖，或对缺字有明确兜底）。
- 构建通过、v1.0.14 正常发布。

## 风险与取舍

- 伪粗在超大字号（汉字大字 ~118px）下笔画可能略糊——用户已接受。
- 放弃系统楷体（iOS/macOS STKaiti）的原生渲染，全平台统一显示 UKai——用户已选择。
- UKai 字形偏老派经典感，正是本次诉求。
- 同名文件字节变化：靠 SW 缓存键升版 + `style.css?v=` 触发更新。

## 不做的事

- 不把楷体扩展到原本未使用楷体的位置（用户明确"先不用全改楷体"）。
- 不新增字重文件、不引入可变字体。
- 不改动 TTS、朗读逻辑（Toast 提示文案除外，属上一轮遗留）。
