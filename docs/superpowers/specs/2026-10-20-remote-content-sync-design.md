# 设计：内容远程同步 + 文本文件内容源

日期：2026-10-20
状态：已获用户批准（对话中逐条确认后口头批准）

## 背景与目标

现状：学习内容（汉字词组、英文单词、朗诵篇目）唯一来源是 `data/default-learning-content.json`，
构建时生成 `features/default-content.js` 打进 APK。改一个字都要重新构建 + 发版 + **卸载旧版
装新版**（Android 不允许覆盖安装不同签名，同签名也需要手动替换 APK），流程太重。

目标：

1. **内容与 App 版本解耦**：改内容 → push → App 内点「同步内容」→ 立即生效，**不再发版**。
2. **内容改用文本文件编写**：目录 = 类型（汉字/英文/朗诵），文件 = 分组，每行 = 一个词/一句，
   比嵌套 JSON 好写好读。
3. **目录可分层**：支持「类型 / 学期（目录） / 分组（文件）」的层级，仓库结构清晰。
4. **本地编辑不被覆盖**：家长在 App 工作台里的修改要保留，并与官方新版本智能合并。

非目标（YAGNI）：多设备账号同步、离线内容分发（离线用内置内容）、自动定时同步、目录层级进入
学习流程（地图选组逻辑不变）。

## 已确认的决策

### ① 内容源结构（目录 + 文本文件）

```text
data/
├── version.txt                     # 内容版本号（作者手动递增，用于显示"内容第几版"）
├── english/
│   └── 基础/
│       └── 颜色单词.txt
├── hanzi/
│   ├── 课堂/
│   │   ├── 中四班-上学期.txt
│   │   └── 小四班-下学期.txt
│   └── 主题/
│       ├── 颜色.txt
│       ├── 水果.txt
│       ├── 蔬菜.txt
│       └── 动物.txt
└── recital/
    ├── 古诗/
    │   ├── 春晓.txt
    │   └── 登鹳雀楼.txt
    ├── 儿歌/
    │   ├── 开门.txt
    │   ├── 树叶歌.txt
    │   ├── 问答歌.txt
    │   ├── 上楼.txt
    │   ├── 秋风轻轻吹.txt
    │   ├── 兔和肚.txt
    │   ├── 跷跷板.txt
    │   ├── 老鼠嗅着油豆香.txt
    │   └── 欢欢喜喜过年了.txt
    └── 故事/
        ├── 三只小猫.txt
        ├── 小象生病了.txt
        └── 美食播报.txt
```

- **目录名 = 类型**：`hanzi` / `english` / `recital`。其它目录名 → 构建报错（不静默忽略）。
- **文件 = 分组**，文件名可中文。**子目录 = 学期/单元**，任意深度都支持（建议 ≤ 2 层）。
- **每行 = 一个内容项**：汉字/词组一行一个，英文单词一行一个，朗诵一行一句。
- 同一分组内不允许重复行（重复 → 构建报错，提示文件名与行号）。

### ② 文件内指令语法

以 `#` 开头的行是指令或注释（整行忽略），支持三种：

| 指令 | 含义 | 适用范围 |
|---|---|---|
| `# id: xxx` | 显式指定分组 id | 全部类型。迁移的 21 个分组用它保留旧 id |
| `# 名称：xxx` | 显示名（不写则用文件名去扩展名） | 全部类型 |
| `# 图片：开` / `# 图片：关` | 该组是否显示"看图识字" | 仅 hanzi（`image: true/false`） |

英文指令别名同样接受：`# id:` / `# name:` / `# image: on|off`。

内容行可带**可选竖线注释**：`西瓜|一种圆圆的绿色水果` → 词 = `西瓜`，注释 = `一种圆圆的绿色水果`。
注释只用于 App 有位置展示的地方（英文单词的词义提示）；没有展示位置时忽略，不影响内容。

### ③ 分组 id 规则

- 有 `# id:` → 用它。
- 否则 → **相对路径去扩展名**，如 `hanzi/主题/水果`、`recital/古诗/春晓`。
  保证跨目录唯一，且目录/文件改名时 id 随之变化（因此迁移组必须写 `# id:`）。
- 现有 21 个分组迁移时写入原 id（如 `# id: middle-forth-1h`），老用户本机的
  `activeGroupId` / `deletedGroupIds` 继续对得上。

### ④ 解析器只有一份（Node 与 App 共用）

新增 `features/content-files.js`：**纯函数、无 DOM、无网络**。

- `parseContentFiles(files)`：`files` 为 `[{path, text}]`（path 相对 `data/`），
  返回 `{ resourceVersion, kinds: { hanzi: {terms:[{id,name,groups:[…]}]}, english: […], recital: […] } }`，
  外加 `errors: []`（每条含文件与行号）。
- `parseContentFile(path, text)`：单文件解析，供测试直接调用。
- 构建脚本（Node ESM，可直接 import 该模块）与 App 端使用**同一份解析代码**，避免规则漂移。

### ⑤ 构建与发布

新增 `scripts/build-content.mjs`：

1. 扫描 `data/**`（只认 `.txt`），用 `parseContentFiles` 解析；**有 error 即退出码 1**（构建失败，
   防止错误内容进包）。
2. 生成 `features/default-content.js`：`export const DEFAULT_LEARNING_CONTENT = {...}`
   —— 形状与今天的 `data/default-learning-content.json` 完全一致（`resourceVersion` +
   `english/hanzi/recital` 三个 kind，每个 kind 含 `activeGroupId` / `deletedGroupIds` / `groups`），
   App 端业务代码基本不用改。
3. 生成 `dist/content/manifest.json`（内容分发索引）：

```json
{
  "resourceVersion": 4,
  "generatedAt": "2026-10-20T10:00:00.000Z",
  "files": [{ "path": "hanzi/主题/水果.txt", "sha256": "…", "bytes": 128 }]
}
```

4. 复制 `data/**/*.txt` → `dist/content/**`（原样托管，App 直接下载文本文件）。
5. `dist/content/manifest.json` 与 `dist/content/**` 由 GitHub Pages 部署（`deploy-pages.yml`
   在每次 push 到 main 时自动执行，产物约 30~60 秒后上线）。

`package.json` 新增脚本 `"content:build": "node scripts/build-content.mjs"`；
`build:web` 改为先跑 `content:build`（保证 `features/default-content.js` 与 `dist/content/` 同源）。
`data/default-learning-content.json` **迁移完成后从仓库删除**（内容已转移到文本文件）。

### ⑥ App 端同步链路

家长设置 → 学习内容工作台 → 新增「内容同步」区块：

- 状态区：当前内容版本（内置 v3 / 远程 v4）、最后同步时间
- 主按钮「同步最新内容」（同步中转圈 + 禁用）
- 结果面板：新增 N 个 / 更新 M 个 / 保留本地修改 K 个（列出分组名）
- 次要按钮「恢复官方内容」（二次确认，丢弃本地编辑回到最新官方层）

流程：

```text
点「同步最新内容」
  → GET  https://nganun.github.io/magic-castle/content/manifest.json   （带 ?t=时间戳 防 CDN 缓存）
      → 与本机缓存的 manifest 比对
          ├─ resourceVersion 与全部 sha256 都没变 → 提示"内容已是最新"，结束
          └─ 有变化 → 只下载变化/新增的 .txt（缺失文件视为删除）
                → 全部下载成功才继续；任一失败 → 保留旧内容并报错
                → 用共享解析器解析 → 得到新的官方内容 N
                → 三方合并（见 ⑧）→ 写入存储 → 重建 THEMES + 重渲染当前页
```

- 端点：`https://nganun.github.io/magic-castle/content/...`（Pages，托管 manifest 与全部 .txt）。
  备用端点 `https://raw.githubusercontent.com/nganun/magic-castle/main/data/...` 缺少 manifest，
  **不做**双端点；Pages 不可用时保留旧内容并提示。
- 跨域：已验证 Pages 与 raw 均返回 `access-control-allow-origin: *`；Android 端
  `https://localhost` 源可跨域取；`AndroidManifest.xml` 已有 `INTERNET` 权限；`index.html` 无 CSP。
- 内容来源地址写入 `features/build-info.js`（由 `package.json` 生成，字段 `contentBaseUrl`），
  便于 fork 或本地构建时改指向。

### ⑦ 三层内容模型

```text
内置（打进 APK，离线兜底）⊂ 远程官方层（同步下来的）⊂ 本地编辑层（家长改的）
```

| 层 | 存储 | 生命周期 |
|---|---|---|
| L0 内置 | `features/default-content.js` | 随 APK |
| L1 远程官方 | `localStorage: luna-remote-content-v1` = `{resourceVersion, manifest, groups, syncedAt}` | 同步成功后覆盖 |
| L2 本地编辑 | `localStorage: luna-admin-content-v4`（现有 `adminContent`，结构不变） | 用户在工作台编辑时写入 |

生效顺序按**分组 id 粒度**：L2 覆盖 L1 覆盖 L0。

改造点：现在写死的常量 `ADMIN_DEFAULT` 改为函数 `officialContent()`，返回 L1（存在且有效）否则 L0；
`contentGroups()` / `recitalGroups()` 里引用 `ADMIN_DEFAULT` 的地方改用 `officialContent()`。

### ⑧ 三方智能合并

同步得到新官方内容 `N`；`O` = 上次同步的官方内容（无记录时 = L0 内置内容）；`U` = 本地编辑层。

对每个 kind、每个分组 id：

| 情况 | 处理 |
|---|---|
| `N` 有、`U` 无 | 新增（写入 `U`） |
| `N` 有、`U` 有，且 `U` 归一化后 == `O` 中同名分组（用户没改过） | 换成 `N` 的版本 |
| `N` 有、`U` 有，且 `U` != `O`（用户改过） | **保留 `U`**，记入"保留本地修改"清单 |
| `O` 有、`N` 无（官方删了） | 保留 `U`（不自动删用户数据） |
| `U` 在 `deletedGroupIds` | 保持删除（官方也不复活） |

比较前双方都过一遍现有归一化函数（`normaliseContentWords` / `normaliseRecitalLines`），
避免大小写/空白差异被误判为"用户改过"。

同步成功后：L1 写入 `N`（含 manifest 与同步时间），L2 保留用户自己的新增与修改。
「恢复官方内容」= 清空 L2 的用户覆盖（保留 `deletedGroupIds`），并用 L1 重新生成。

### ⑨ 必须修掉的现存缺陷

现在 `contentGroups()`（english/hanzi）会把官方分组**拷贝进本机后本地永远赢**，所以官方改了词表
老用户也看不到；recital 靠"官方行数更多就覆盖"的补丁凑合。本次改成 ⑧ 的三层模型后，该缺陷消失，
两条分支统一走同一套合并规则。

### ⑩ 目录层级的展示（仅整理用）

- 学习流程不变：地图上仍是"一个正在学习的分组"（`activeGroupId` 语义不变）。
- 学习内容工作台（`contentConfigModal` / `recitalConfigModal`）的分组列表改为**按目录折叠展示**：
  一级是目录（学期/单元），二级是分组文件；分组标题带路径（如 `一年级上册 · 识字一`）。
- 「+ 新增分组」默认落到当前展开的目录（无展开目录时落到该 kind 的根目录）。
- 删除仍只到分组级；不提供目录级增删（目录由仓库定义）。
- 地图/课程副标题可显示分组名 + 上级目录名，便于区分同名分组。

### ⑪ Service Worker 与 PWA

- `service-worker.js` 对 `/content/` 路径走**仅网络**（不缓存、不回退缓存），
  避免 PWA 模式下拿到旧 manifest / 旧文本文件。
- `content/manifest.json` 不进 `APP_SHELL` 预缓存清单。
- Pages 部署的是 `dist/`，`dist/content/` 随之上线。

### ⑫ 迁移方案（现有 21 个分组）

按内容性质归类，转换脚本一次性生成文本文件：

| 类型 | 目标目录 | 分组（id 保持不变） |
|---|---|---|
| english | `english/基础/` | `english-colors`（颜色单词） |
| hanzi | `hanzi/课堂/` | `middle-forth-1h`（中四班-上学期）、`xiao-si-ban-xia-xue-qi`（小四班-下学期） |
| hanzi | `hanzi/主题/` | `color`（颜色, image=开）、`fruit`（水果, 开）、`vegitable`（蔬菜, 开）、`animal`（动物, 开） |
| recital | `recital/古诗/` | `recital-spring-dawn`（春晓）、`deng-guan-que-lou`（登鹳雀楼） |
| recital | `recital/儿歌/` | `kai-men`、`shu-ye-ge`、`wen-da-ge`、`shang-lou`、`qiu-feng-qing-qing-chui`、`tu-he-du`、`qiao-qiao-ban`、`lao-su-xiu-zhe-you-dou-xiang`、`huan-huan-xi-xi-guo-nian-le` |
| recital | `recital/故事/` | `three=little-cats`（三只小猫）、`xiao-xiang-sheng-bieng-le`（小象生病了）、`delious-foods`（美食播报） |

每个文件写入 `# id: <原 id>`；hanzi 的 4 个主题组写入 `# 图片：开`；
文件名即显示名（与原 `name` 一致）。`data/version.txt` 初始写 `4`（原 `resourceVersion: 3` → 4，
表示"文本化后的第一版"）。

## 需要改动的代码

| 文件 | 改动 |
|---|---|
| `features/content-files.js` | **新增**：共享解析器（纯函数） |
| `features/content-sync.js` | **新增**：`mergeSyncedContent()`、`validateRemoteContent()`、`contentHash()` 等纯函数 |
| `features/content-channel.js` | **新增**：fetch manifest / 下载文本文件 / 读写 L1 存储（浏览器侧） |
| `scripts/build-content.mjs` | **新增**：解析 `data/` → 生成 `features/default-content.js` + `dist/content/**` + manifest |
| `scripts/build-web.mjs` | 改为先跑 `content:build`；复制 `data/version.txt` 等 |
| `app.js` | `ADMIN_DEFAULT` → `officialContent()`；`contentGroups()`/`recitalGroups()` 改用官方层；工作台列表改按目录折叠；新增同步区块 UI 与事件；`applyAdminContent()` 后重渲染当前页 |
| `index.html` | 学习内容工作台新增「内容同步」区块（含状态区、按钮、结果面板、恢复官方内容） |
| `style.css` | 同步区块与目录折叠列表样式 |
| `service-worker.js` | `/content/` 仅网络；不预缓存 manifest |
| `package.json` | 新增 `content:build` 脚本；`build:web` 串联；新增 `contentBaseUrl` 字段 |
| `features/build-info.js` | 由构建脚本生成，新增 `contentBaseUrl` |
| `data/**` | 新增文本文件；`data/default-learning-content.json` 迁移后删除 |
| `tests/` | 新增解析器与合并算法的 Node 测试 |

## 实施步骤

1. 新建 `features/content-files.js`（解析器）与 `scripts/build-content.mjs`（构建），
   先只做"文本 → `features/default-content.js`"，验证生成的 JS 与今天 JSON 生成的完全一致。
2. 写迁移脚本，把现有 21 个分组导出为 `data/**` 文本文件（带 `# id:`），删除
   `data/default-learning-content.json`，新增 `data/version.txt`。
3. 改 `build:web` 串联 `content:build`；本地 `npm run build:web` 后 diff `features/default-content.js`
   与迁移前内容，确认零丢失。
4. 抽出 `officialContent()`，把 `contentGroups()` / `recitalGroups()` 改为读官方层（此时 L1 为空，
   行为应与现在完全一致）——回归：App 现有内容显示不变。
5. 实现 `features/content-sync.js`（合并算法）+ `features/content-channel.js`（网络与存储），
   配 Node 测试（`tests/verify-content-files.mjs`、`tests/verify-content-sync.mjs`）。
6. 工作台加「内容同步」区块：状态、按钮、结果面板、恢复官方内容；接上合并与生效流程。
7. 工作台分组列表改按目录折叠展示；分组标题带上级目录名。
8. Service Worker 改 `/content/` 仅网络；`index.html`/`style.css` 补同步区块与折叠列表样式。
9. 构建脚本把 `data/**` 与 manifest 发到 `dist/content/`；`deploy-pages.yml` 验证线上可取。
10. 全量验证：`node --check app.js`、`npm test`、`npm run build:web`、本地起服务点同步
    （用本地 Pages 镜像或临时改 `contentBaseUrl` 指到本地目录）、APK 真机验证同步后内容生效。
11. 发版 v1.0.19（versionCode 20）：版本号、SW 缓存键、`?v=`、`build-info.js` 全量同步，
    `cap:sync` → commit → tag → push → 等 Actions 出 APK → 校验 Release。
12. 发版后写一篇"如何加内容"的说明（放 `docs/`）：改 `data/**` → push → App 点同步。

## 验收标准

- `data/**` 文本文件解析结果与迁移前的 `default-learning-content.json` **逐字段一致**（21 组、
  全部词与句、`image` 开关、`resourceVersion`）。
- 迁移后老用户（已有 `luna-admin-content-v4`）本机的"正在学习分组""已删除分组"不错位。
- App 内点「同步内容」：无变化时提示"已是最新"；有变化时更新并列出新增/更新/保留本地修改三类结果。
- 仓库改一个词 → push → 等 Pages 部署 → App 点同步 → 该词生效，**不需要重装 APK**。
- 本地改过的分组在同步后保留本地内容，并出现在"保留本地修改"清单里。
- 断网 / manifest 404 / 文本文件损坏 / 解析报错 → 现有内容完全不受影响，并有明确提示。
- PWA 模式下不会拿到旧 manifest（`/content/` 仅网络）。
- `npm test` 全绿；`node --check app.js`、`npm run build:web` 通过；APK 构建并发布 v1.0.19。

## 风险与对策

| 风险 | 对策 |
|---|---|
| Pages 部署有 30~60 秒延迟，push 后立刻同步拿不到新内容 | 同步结果里显示"远程内容版本 vN"与最后同步时间，版本未变即提示"已是最新"；作者可等一分钟再点 |
| 仓库里某个文本文件写错 → 内容错乱 | 构建脚本遇错即失败（不进包）；App 端解析错误保留旧内容并报错定位到文件+行号 |
| 分组 id 随路径变化 → 本机记录错位 | 迁移组写死 `# id:`；新组用路径 id；`# id:` 也可随时手动指定 |
| 官方删除分组后本机仍保留 | 有意为之（不自动删用户数据）；工作台提供删除入口 |
| 现有 `contentGroups()` 的"本地永远赢"缺陷若未彻底改造，内容更新传不到老用户 | 步骤 4~6 专门处理，并以"仓库改一个词 → 同步后生效"作为验收项 |
| `data/` 目录内容与 App 内置内容不一致（忘了重新构建） | CI 增加漂移检查：`content:build` 后 diff `features/default-content.js` 与已提交版本，不一致则失败 |
