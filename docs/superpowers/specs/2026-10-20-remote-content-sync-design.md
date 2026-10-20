# 设计：内容远程同步 + 文本文件内容源

日期：2026-10-20
状态：已获用户批准（对话中逐条确认后口头批准）；经 spec review 修订（v3）

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
学习流程（地图选组逻辑不变）、App 内创建/删除目录。

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
- **重复行**：`english` / `hanzi` 是**集合**语义 → 重复行保留首次出现，其余丢弃并记 warning；
  `recital` 是**有序句子列表** → **不去重**，重复句是刻意的复现
  （《三只小猫》里「你看看我，我看看你，」出现两次：白猫段与黑猫段，去掉一次会改变朗诵内容）。
  现有内容里 hanzi `xiao-si-ban-xia-xue-qi` 的「消息」重复一次 → 迁移时按集合规则去重；
  recital 的重复句原样保留。
- `data/version.txt` 是特例，**不参与扫描/复制/清单**（它不在类型目录下）。

### ② 文件内指令语法

以 `#` 开头的行是指令或注释（整行忽略），支持三种：

| 指令 | 含义 | 适用范围 |
|---|---|---|
| `# id: xxx` | 显式指定分组 id | 全部类型。迁移的 21 个分组用它保留旧 id |
| `# 名称：xxx` | 显示名（不写则用文件名去扩展名） | 全部类型 |
| `# 图片：开` / `# 图片：关` | 该组是否显示"看图识字" | 仅 hanzi（`image: true/false`） |

英文指令别名同样接受：`# id:` / `# name:` / `# image: on|off`。

内容行可带**可选竖线注释**：`西瓜|一种圆圆的绿色水果` → 词 = `西瓜`，注释 = `一种圆圆的绿色水果`。
注释在**解析时从词条里剥离**（词条仍是纯字符串，`safeHanzi` / `safeEnglishWords` 的校验不受影响），
并记入**该分组的** `notes` 映射 `{ 词: 注释 }`（随分组走，不放在 kind 级，
否则增量同步按文件替换时会把未变更文件的注释丢掉）。
App 端在展示英文单词词义时：`WORD_TRANSLATIONS[word] || group.notes[word] || word`
（真实调用点见 ⑬；**注入 HTML 前一律 `escapeHtml`**，注释里出现 `"` 或 `<` 不能破坏标记）。
没有展示位置时注释不显示，但不丢失。

### ③ 分组 id 规则

- 有 `# id:` → 用它。
- 否则 → **相对路径去扩展名**，如 `hanzi/主题/水果`、`recital/古诗/春晓`。
  保证跨目录唯一，且目录/文件改名时 id 随之变化（因此迁移组必须写 `# id:`）。
- 现有 21 个分组迁移时写入原 id（如 `# id: middle-forth-1h`），老用户本机的
  `activeGroupId` / `deletedGroupIds` 继续对得上。

### ④ 解析器只有一份（Node 与 App 共用）

新增 `features/content-files.js`：**纯函数、无 DOM、无网络、无存储**。导出：

| 导出 | 作用 |
|---|---|
| `parseContentFiles(files, options)` | `files: [{path, text}]`（path 相对 `data/`）→ 解析结果对象。**仅构建脚本用**（一次性扫全目录） |
| `parseContentFile(path, text)` | 单文件解析。**App 端增量同步用**（每次下载一个 .txt 调一次，path 由调用方带入） |
| `safeEnglishWords(value)` / `safeHanzi(value)` | 从 `app.js` 移入的既有校验函数（导出后 app.js 继续 import） |
| `normaliseContentWords(kind, words)` / `normaliseRecitalLines(value)` | 从 `app.js` 移入的既有归一化函数 |
| `normaliseGroupRecord(kind, raw)` | **唯一权威的分组归一化函数**（见 ⑧） |

解析结果**精确形状**（构建脚本与合并算法都消费它）：

```js
{
  resourceVersion: 4,                       // 来自 data/version.txt
  kinds: {
    english: { groups: [ { id, name, file, directory, image: false, notes: {}, words: [...] } ] },
    hanzi:   { groups: [ { id, name, file, directory, image: true,  notes: {}, words: [...] } ] },
    recital: { groups: [ { id, name, file, directory, image: false, notes: {}, lines: [...] } ] }
  },
  errors: [],      // { path, line, message } —— 构建失败
  warnings: []     // { path, line, message } —— 例如重复行
}
```

- `file` = 该分组的**源文件路径**（含文件名，如 `hanzi/主题/水果.txt`）——
  增量同步的"按文件替换/删除"靠它。构建脚本与 App 端都从这里取。
- `directory` = 该分组所在**目录**（相对 `data/`，根目录为 `''`），用于工作台按目录折叠展示；
  与"源文件路径"是两个不同概念，命名上以 `directory` / `file` 区分。
- 三个 kind 形状一致；目录树由 `directory` 在展示时还原（解析结果不嵌套 `terms`）。
- 构建脚本（Node ESM，直接 import 该模块）与 App 端使用**同一份解析代码**，避免规则漂移。

### ⑤ 构建与发布

新增 `scripts/build-content.mjs`：

1. 扫描 `data/**`（只认 `.txt`，**排除 `data/version.txt`**），读 `data/version.txt`，
   用 `parseContentFiles` 解析；**有 error 即退出码 1**（构建失败，防止错误内容进包）；
   warning 打印到控制台。
2. 生成 `features/default-content.js`：
   `export const DEFAULT_LEARNING_CONTENT = { resourceVersion, english, hanzi, recital }`，
   每个 kind 含 `activeGroupId`（官方默认，仅作 L2 首次初始化的初值）、`deletedGroupIds: []`、
   以及带 `directory` / `notes` 的 `groups`。
   与今天的 `default-learning-content.json` **词句内容一致**，结构上多两个字段
   （分组级 `directory`、分组级 `notes`）；**删除 `fallbackItems`**（唯一用处是"一个分组都没有"
   时的兜底，由 `buildCustomTheme()` 里既有的内置兜底词表
   `['人','大人','人口']` / `['red','yellow','blue']` 接管；`app.js` 中读 `subject.fallbackItems`
   的分支与未使用的 `defaultContentWords()` 一并清理）。
3. 生成 `dist/content/manifest.json`（内容分发索引）：

```json
{
  "resourceVersion": 4,
  "generatedAt": "2026-10-20T10:00:00.000Z",
  "files": [{ "path": "hanzi/主题/水果.txt", "sha256": "…", "bytes": 128 }]
}
```

`path` 是**源文件路径**（含文件名），`sha256` 对**原始文件字节**计算。

4. 复制 `data/**/*.txt`（同样排除 `version.txt`）→ `dist/content/**`（原样托管，App 直接下载文本文件）。
5. `dist/content/manifest.json` 与 `dist/content/**` 随 GitHub Pages 部署上线
   （`deploy-pages.yml` 跑 `node scripts/build-web.mjs`，上传整个 `dist/`）。

**执行顺序（关键）**：`scripts/build-web.mjs` 第一步是 `rm -rf dist`，且它会把整个 `features/`
目录拷进 `dist/`。内容构建会重写 `features/default-content.js`，因此**必须先于拷贝执行**，
否则 `dist/features/default-content.js` 是旧的已提交文件，APK（`cap:sync` 拷 `dist/`）与 PWA
都会带着过期的内置内容 L0（而 L0 又是首次同步时的比较基准 O）。
固定顺序为：
`rm dist` → `mkdir dist` → **调用内容构建**（重写 `features/default-content.js` + 写 `dist/content/**`）
→ 拷贝既有 entries（含 `features/`、`assets/`、`vendor/` 等）。
因此 `npm run build:web`、`node scripts/build-web.mjs`、Pages CI 三条路径产物一致。
验证时必须同时 diff `features/default-content.js` **和** `dist/features/default-content.js`。

`package.json` 脚本调整：

- 新增 `"content:build": "node scripts/build-content.mjs"`（单独跑内容构建）
- 删除 `"content:sync": "node scripts/sync-default-content.mjs"` 与 `scripts/sync-default-content.mjs`
  （被 `content:build` 取代）
- 新增 `"test": "node --test tests/*.test.mjs"`（**注意**：Node 自动匹配只认 `*.test.mjs` /
  `*-test.mjs` / `test-*.js` / `test/**`，目录形式的 `node --test tests/` 匹配不到
  `verify-*.mjs`，必须用 glob 或把测试文件改名为 `*.test.mjs`——本设计采用后者：
  现有 `tests/verify-hanzi-image-feature.mjs` 改名为 `tests/verify-hanzi-image-feature.test.mjs`）
- 新增 `"type": "module"`（仓库所有 Node 脚本都是 `.mjs`，加 `type` 只影响 `features/*.js`
  被 Node 解析的方式，浏览器端不受影响；可消除 `MODULE_TYPELESS_PACKAGE_JSON` 警告）
- 新增 `"contentBaseUrl"` 字段（默认 `https://nganun.github.io/magic-castle/content`），
  由 `features/build-info.js` 带给 App（便于 fork 或本地构建改指向）

`data/default-learning-content.json` **迁移完成后从仓库删除**（内容已转移到文本文件）。

### ⑥ App 端同步链路

位置：家长设置 → 学习内容工作台（`#adminModal`，紧邻"英文单词/汉字与词组/朗诵文本"三个入口下方）。

- 状态区：当前内置内容版本（v4）、当前远程内容版本（vN 或"未同步"）、最后同步时间
- 主按钮「同步最新内容」（同步中转圈 + 禁用）
- 结果面板：新增 N 个 / 更新 M 个 / 保留本地修改 K 个 / 随官方删除 N 个（列出分组名）
- 次要按钮「恢复官方内容」（二次确认，丢弃本地编辑回到最新官方层）

流程：

```text
点「同步最新内容」
  → GET  {contentBaseUrl}/manifest.json?t=<时间戳>      （cache: 'no-store'）
      → 与本机缓存的 manifest 比对
          ├─ resourceVersion 与全部 sha256 都没变 → 提示"内容已是最新"，结束
          └─ 有变化 → 计算 新增/变更/删除 的文件清单
                → 下载变更与新增的 .txt（同样带 ?t= 且 cache: 'no-store'）
                  ※ Pages 静态资源默认 cache-control: max-age=600，
                    不绕过缓存会拿到旧文件并误判为"内容损坏"
                → 任一文件下载失败 → 整体中止，保留全部旧内容并报错
                → 用共享解析器解析下载到的文件 → 得到这些文件对应的分组
                → 在本机缓存的官方快照（L1）上"按源文件替换/删除"→ 得到完整官方内容 N
                → 三方合并（见 ⑧）→ 写入 L1 与 L2 → 重建 THEMES + 重渲染当前页
```

- sha256 校验：下载后比对 manifest 中的 sha256；**`crypto.subtle` 不可用时跳过校验并告警**
  （非安全上下文），不阻断同步。
- 下载 URL 的路径段要**逐段百分号编码**（目录名含中文，如 `hanzi/主题/水果.txt`）；
  manifest 与本地存储里仍保存**未编码的相对路径**作为键。
- `resourceVersion` 只是**展示用的版本号**，真正的变更判据是 sha256 比对：
  改了内容但忘了加版本号，照样会被检出并同步（只是版本号显示不变）。
- 端点：`{contentBaseUrl}` = `https://nganun.github.io/magic-castle/content`（Pages，托管 manifest
  与全部 .txt）。备用端点 `raw.githubusercontent.com/.../data/...` **不提供 manifest，不做双端点**；
  Pages 不可用时保留旧内容并提示。
- 跨域：已验证 Pages 与 raw 均返回 `access-control-allow-origin: *`；Android 端
  `https://localhost` 源可跨域取；`AndroidManifest.xml` 已有 `INTERNET` 权限；`index.html` 无 CSP。

### ⑦ 三层内容模型（合并副本式）

```text
L0 内置默认    = features/default-content.js（随 APK，离线兜底）
L1 远程官方快照 = localStorage: luna-remote-content-v1（同步下来的完整官方内容，仅供比较与恢复）
L2 本机生效层   = localStorage: luna-admin-content-v4（现有 adminContent，结构不变）★ 实际生效的就是它
```

- **L2 是"合并后的完整副本"**：同步时把官方新版本按规则合并进 L2，L2 即生效内容。
- L1 结构：`{ resourceVersion, manifest, entries: [ { kind, file, group } ], syncedAt }`
  - `kind`：`'english' | 'hanzi' | 'recital'`（**必须有 kind 判别位**，否则无法还原
    `{english, hanzi, recital}` 的 kind 分层结构）。
  - `file`：该分组的**源文件路径**（如 `hanzi/主题/水果.txt`）——增量替换与删除判定都靠它。
  - `group`：该分组的完整记录（含 `id / name / directory / image / notes / words|lines`）。
  - `entries` 是**完整**官方快照；`officialContent()` 由 `entries` 按 `kind` 还原成 kind 分层结构
    （与 L0 同形），供三方比较与「恢复官方内容」使用。
- `officialContent()` = `L1` 还原出的 kind 分层结构（存在且有效）否则 `L0` —— 只用于
  （a）三方比较的 O、（b）「恢复官方内容」的来源、（c）L2 首次初始化时的初值。
  注意它**不含也不该含** `activeGroupId` / `deletedGroupIds`（这两个字段归用户所有）。
- `contentGroups(kind)` / `recitalGroups()` 改为**读 L2**，且**必须保留完整记录**：
  现有实现会把每个分组重建成 `{id, name, image, words}` / `{id, name, lines}` 再写回，
  会把新增的 `notes` / `directory` 字段悄悄丢掉 → 必须改为**保留原字段**
  （或至少把 `notes` / `directory` 显式带上）。
- **`directory` / `notes` 的回填**：老用户的 L2 里已经有全部 21 个分组（只是没有 `directory` /
  `notes` 字段），所以"官方有、L2 没有 → 补进 L2"这条兜底**对他们不会触发**。
  因此读路径要额外做一次**按 id 回填**：L2 分组缺 `directory` / `notes` 时，
  从官方层按 id 补上（官方也没有则留空），这样老用户现有分组才能落到正确目录而不是「未分类」。
- 兜底仍保留：「官方层有、L2 里没有的分组 → 补进 L2」，但**绝不覆盖 L2 已存在分组的
  词/句内容**（否则又退化成"本地永远赢"，见 ⑨）。

**字段归属（重要）**：

| 字段 | 归属 | 同步时的行为 |
|---|---|---|
| 分组词/句内容、名称、显示名、`notes` | L2（用户可改） | 按 ⑧ 的三方规则合并 |
| `activeGroupId`（正在学习/正在朗诵的分组） | **L2，用户所有** | **同步永不覆盖**；仅 L2 首次初始化时取官方值作初值 |
| `deletedGroupIds`（用户删掉的分组） | **L2，用户所有** | **同步永不复活**（官方有也不显示） |
| `image`（看图识字开关） | L2（用户可改） | 参与三方比较 |
| `directory`（所属目录） | 官方所有 | 官方挪了目录 → 直接采用 N 的 `directory` |

### ⑧ 三方智能合并

同步得到新官方内容 `N`（完整，来自 L1 的按源文件替换）；`O` = 上次同步的官方快照
（无记录时 = L0 内置内容）；`U` = L2 本机生效层。

**比较口径（唯一）**：三方都用 `normaliseGroupRecord(kind, raw)` 归一化后再比较，
该函数定义在 `features/content-files.js`：

```js
normaliseGroupRecord(kind, raw) → {
  id, name: String(raw.name).trim().slice(0, 24),
  image: Boolean(raw.image),
  words | lines: 归一化后的词句数组   // english/hanzi → normaliseContentWords；recital → normaliseRecitalLines
}
```

`normaliseGroupRecord()` **只比较用户可改的字段**：`notes` 与 `directory` **不参与比较**
（它们不是用户编辑对象，比较它们只会制造假冲突）。

必须统一口径的原因（真实代码事实）：
- 现有 `recitalGroups()` 写入本机的分组**没有 `image` 键**，而新解析结果恒带 `image: false`；
  不统一就会把"所有老用户的朗诵组"误判为"用户改过"，官方更新永远传不下去。
- `name` 现在有三处不同的截断：`contentGroups()` 读路径截 16、`saveSelectedContentGroup()`
  写路径截 16、`recitalGroups()` 截 24，另有 `index.html` 的 `maxlength="16"`。
  **统一改为 24**（读路径、写路径、输入框 `maxlength` 一起改）：
  否则官方里长度超过 16 的显示名（名称来自文件名，可能是很长的课文标题）会被截成 16 存进 L2，
  之后每次同步都 `U != O` → 该分组被永久判为"用户改过"，官方更新再也传不下去。
- `safeHanzi` / `safeEnglishWords` 有 **24 条上限**：归一化会截断到 24。
  这带来一个必须说清的口径差异：**存储**保留文件里的全部词（迁移后 `xiao-si-ban-xia-xue-qi`
  仍是 33 个词，与今天的 JSON 一致），**比较**使用截断后的形式（两侧同为 24，
  不会被误判为"用户改过"）；App 的显示条数与今天完全一致（仍显示 24 条）。

对每个 kind、每个分组 id（**判定顺序：先 `deletedGroupIds`，再下表**——否则
"官方有、用户删过"的分组会被第一行复活，违反 ⑦ 的"同步永不复活"）：

| 情况 | 处理 | 结果分组取自 | `directory` 取自 | `notes` 取自 |
|---|---|---|---|---|
| `U` 在 `deletedGroupIds` | 保持删除（官方也不复活） | — | — | — |
| `N` 有、`U` 无 | 新增 | N | N | N |
| `N` 有、`U` 有，`U` 归一化后 == `O`（用户没改过） | 换成新版 | N | N | N |
| `N` 有、`U` 有，`U` != `O`（用户改过） | 保留本地，记入"保留本地修改" | U | N | U |
| `O` 有、`N` 无（官方删了），`U` == `O`（用户没改过） | 一并从 U 移除 | — | — | — |
| `O` 有、`N` 无（官方删了），`U` != `O`（用户改过） | 保留本地，记入"保留本地修改" | U | U | U |
| `N` 无、`O` 无、`U` 有（用户自建分组） | 保留，不计入"保留本地修改" | U | U | U |

- `directory` 由官方拥有：只要官方还在这个分组（N 有），就采用 N 的 `directory`；
  官方已删除且保留 U 时沿用 U 的 `directory`。
- `notes` 跟随**内容来源**：采用 N 的分组就连带 N 的 `notes`；保留 U 就保留 U 的 `notes`。
- 同步成功后：L1 写入新的 `manifest` + `entries` + `syncedAt`；L2 写入合并结果。
- 「恢复官方内容」= 用 `officialContent()`（L1 或 L0）重建 L2 的分组内容，
  保留 `deletedGroupIds` 与用户的 `activeGroupId`。

### ⑨ 必须修掉的现存缺陷

现在 `contentGroups()`（english/hanzi）会把官方分组**拷贝进本机后本地永远赢**，所以官方改了词表
老用户也看不到；recital 靠"官方行数更多就覆盖"的补丁凑合。本次改成 ⑦ 的模型后该缺陷消失，
两条分支统一走同一套合并规则。

### ⑩ 目录层级的展示（仅整理用）

- 学习流程不变：地图上仍是"一个正在学习的分组"（`activeGroupId` 语义不变）。
- 学习内容工作台（`contentConfigModal` / `recitalConfigModal`）的分组列表改为**按目录折叠展示**：
  按 `directory` 分组，一级是目录（学期/单元），二级是分组文件；分组标题带上级目录名
  （如 `一年级上册 · 识字一`）。`directory` 为空的分组归入「未分类」区。
- App 内新建的分组 `directory` 为空 → 落在「未分类」区。**不提供目录级增删**（目录由仓库定义）。
- 课程副标题可显示分组名 + 上级目录名，便于区分同名分组。

### ⑪ Service Worker 与 PWA

- `service-worker.js` 对 `/content/` 路径走**仅网络**（不缓存、不回退缓存），
  避免 PWA 模式下拿到旧 manifest / 旧文本文件。
- `content/manifest.json` 不进 `APP_SHELL` 预缓存清单。
- **新增的 `features/content-files.js`、`features/content-sync.js`、`features/content-channel.js`
  必须加入 `APP_SHELL`**：`app.js` 以 `<script type="module">` 加载，它 import 的任一模块
  不在预缓存里，离线启动就会因模块 import 失败而整个应用起不来。

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
文件名即显示名（与原 `name` 一致）。`data/version.txt` 初始写 `4`
（原 `resourceVersion: 3` → 4，表示"文本化后的第一版"）。
迁移后内置版本即 v4，同步状态区显示为「内置 v4 / 远程 vN」。

### ⑬ 工具链与测试接线

- `package.json`：新增 `"test": "node --test tests/*.test.mjs"`、`"type": "module"`、
  `"contentBaseUrl"`；删除 `"content:sync"`。
- `scripts/sync-default-content.mjs` 删除（被 `scripts/build-content.mjs` 取代）。
- `tests/verify-hanzi-image-feature.mjs` → 改名为 `tests/verify-hanzi-image-feature.test.mjs`，
  内容改为：读新文本源（`parseContentFiles` 解析 `data/**`），与 `features/default-content.js`
  比对一致性。
- 新增 `tests/verify-content-files.test.mjs`（解析器：指令、去重、注释剥离、错误定位、id 规则、
  `version.txt` 排除）与 `tests/verify-content-sync.test.mjs`（三方合并：未改动/已改动/官方删除/
  用户自建/已删除分组/`activeGroupId` 不被覆盖/统一归一化口径）。
- `docs/ARCHITECTURE.md` 更新：第 17 行的 `default-content.js` 说明、第 49 行的
  "只修改 `data/default-learning-content.json` + `npm run content:sync`" 流程改为
  "编辑 `data/**` 文本文件 → push → App 内点同步"。
- **`WORD_TRANSLATIONS` 的 4 个真实调用点**（`grep -n WORD_TRANSLATIONS app.js` 可核对），
  词义兜底链统一为 `WORD_TRANSLATIONS[w] || group.notes?.[w] || w`，
  且**任何情况下都不能把 `undefined` 送进 `speakChinese()`**：
  1. `autoReadWordCard`（自动朗读卡片）：`WORD_TRANSLATIONS[word]` 直接喂给 `speakChinese`，
     单词只存在于分组注释里时（如 black/white/purple/pink 都不在 `WORD_TRANSLATIONS`），
     没有兜底就会读出空内容 → 必须接上 `notes` 兜底。
  2. english learn 卡片主按钮的「中文：…」。
  3. match 卡片的选项 `alt` / `<b>` 文案（注入前 `escapeHtml`）。
  4. match 卡片的「中文：…」。
  （**recital 卡片没有词义槽位**——它只显示分组名与固定提示，不要为此新增 UI。）

## 需要改动的代码

| 文件 | 改动 |
|---|---|
| `features/content-files.js` | **新增**：共享解析器 + 归一化函数（含 `normaliseGroupRecord`）（纯函数） |
| `features/content-sync.js` | **新增**：三方合并 `mergeSyncedContent()` 等纯函数 |
| `features/content-channel.js` | **新增**：fetch manifest / 下载文本文件 / 读写 L1 存储（浏览器侧） |
| `scripts/build-content.mjs` | **新增**：解析 `data/` → 生成 `features/default-content.js` + `dist/content/**` + manifest |
| `scripts/build-web.mjs` | 调整顺序：`rm dist` → 拷贝 entries → **之后**调用内容构建；不再读 `data/default-learning-content.json` |
| `scripts/sync-default-content.mjs` | **删除**（被 build-content 取代） |
| `app.js` | `ADMIN_DEFAULT` → `officialContent()`；`contentGroups()`/`recitalGroups()` 改读 L2 + 保留完整记录（`notes`/`directory` 不再被丢弃）+ 按 id 回填 `directory`/`notes`；名称长度上限统一为 24（读路径、`saveSelectedContentGroup()` 写路径）；归一化函数改为 import；清理 `subject.fallbackItems` 分支与未使用的 `defaultContentWords()`；工作台列表改按目录折叠；新增同步区块 UI 与事件；英文词义兜底 `WORD_TRANSLATIONS[w] \|\| group.notes?.[w] \|\| w`（4 个调用点见 ⑬，注入前 `escapeHtml`）；同步后 `applyAdminContent()` + 重渲染当前页 |
| `index.html` | `#adminModal` 内新增「内容同步」区块（状态区、按钮、结果面板、恢复官方内容）；分组名称输入框 `maxlength` 16 → 24 |
| `style.css` | 同步区块与目录折叠列表样式 |
| `service-worker.js` | `/content/` 仅网络；不预缓存 manifest；**新增三个 features 模块进 `APP_SHELL`** |
| `package.json` | 新增 `test` / `content:build` / `type: module` / `contentBaseUrl`；删除 `content:sync` |
| `features/build-info.js` | 由构建脚本生成，新增 `contentBaseUrl` |
| `data/**` | 新增文本文件 + `version.txt`；`data/default-learning-content.json` 迁移后删除 |
| `tests/**` | 现有测试改名 `*.test.mjs` 并改读新源；新增解析器与合并算法测试 |
| `docs/ARCHITECTURE.md` | 更新内容源与发布流程说明 |
| `.github/workflows/deploy-pages.yml` | 无需改动（`build-web.mjs` 内部已产出 `dist/content/`）；发布后需验证线上可取 |

## 实施步骤

1. 新建 `features/content-files.js`（解析器 + 归一化函数）与 `scripts/build-content.mjs`，
   先只做"文本 → `features/default-content.js`"，验证生成的 JS 与今天 JSON 生成的**词句内容一致**。
2. 写迁移脚本，把现有 21 个分组导出为 `data/**` 文本文件（带 `# id:`），
   仅去重 hanzi 里重复的「消息」，recital 的重复句原样保留，
   删除 `data/default-learning-content.json`，新增 `data/version.txt`。
3. 改 `scripts/build-web.mjs` 顺序并串联内容构建；本地 `npm run build:web` 后 diff
   `features/default-content.js` **与** `dist/features/default-content.js`，
   确认与迁移前内容零丢失（仅 hanzi 1 处重复词去重、33 词组不被截断、recital 重复句原样保留）。
4. 抽出 `officialContent()`，把 `contentGroups()` / `recitalGroups()` 改为读 L2（此时 L1 为空，
   行为应与现在完全一致）——回归：App 现有内容显示不变。
5. 实现 `features/content-sync.js`（三方合并）+ `features/content-channel.js`（网络与存储），
   配 Node 测试。
6. 工作台加「内容同步」区块：状态、按钮、结果面板、恢复官方内容；接上合并与生效流程。
7. 工作台分组列表改按目录折叠展示（按 `directory`）；分组标题带上级目录名。
8. Service Worker 改 `/content/` 仅网络并补 `APP_SHELL`；`index.html`/`style.css` 补同步区块与折叠列表样式。
9. 验证 Pages 线上可取：`https://nganun.github.io/magic-castle/content/manifest.json` 与
   任一 `.txt` 均 200 且带 CORS 头。
10. 全量验证：`node --check app.js`、`npm test`、`npm run build:web`、真机验证同步后内容生效
    （改仓库一个词 → push → 等 Pages → App 点同步 → 生效）。
11. 发版 v1.0.19（versionCode 20）：版本号、SW 缓存键、`?v=`、`build-info.js` 全量同步，
    `cap:sync` → commit → tag → push → 等 Actions 出 APK → 校验 Release。
12. 发版后写一篇"如何加内容"的说明（放 `docs/`）：改 `data/**` → push → App 点同步。

## 验收标准

- `data/**` 文本文件解析结果与迁移前的 `default-learning-content.json` **词句内容一致**
  （21 组、全部词与句、`image` 开关；仅 hanzi `xiao-si-ban-xia-xue-qi` 里重复的「消息」按集合规则去重，
  recital 刻意重复的句子原样保留；`xiao-si-ban-xia-xue-qi` 仍是 33 个词，App 显示条数与今天一致）。
- 迁移后老用户（已有 `luna-admin-content-v4`）本机的"正在学习分组""已删除分组"不错位；
  同步不会覆盖用户的 `activeGroupId`；老用户现有分组在同步后落到正确目录而非「未分类」。
- App 内点「同步内容」：无变化时提示"已是最新"；有变化时更新并列出新增/更新/保留本地修改三类结果。
- 仓库改一个词 → push → 等 Pages 部署 → App 点同步 → 该词生效，**不需要重装 APK**。
- 本地改过的分组在同步后保留本地内容（含 `notes`），并出现在"保留本地修改"清单里。
- 官方删除的分组：用户没改过 → 一并消失；用户改过 → 保留并提示。
- 断网 / manifest 404 / 文本文件损坏 / 解析报错 → 现有内容完全不受影响，并有明确提示。
- PWA 模式下不会拿到旧 manifest（`/content/` 仅网络）；同步不会因 10 分钟 CDN 缓存误报"内容损坏"。
- 离线状态下 App 仍能正常启动（新增模块在 `APP_SHELL` 内）。
- `npm test` **真的跑到测试**（`# tests N > 0`）且全绿；`node --check app.js`、
  `npm run build:web` 通过；APK 构建并发布 v1.0.19。

## 风险与对策

| 风险 | 对策 |
|---|---|
| Pages 部署有 30~60 秒延迟，push 后立刻同步拿不到新内容 | 状态区显示"远程内容版本 vN"与最后同步时间，版本未变即提示"已是最新"；作者可等一分钟再点 |
| Pages 静态资源 10 分钟 CDN 缓存导致下载到旧 `.txt` | 同步请求一律 `cache: 'no-store'` + `?t=` 时间戳；下载后按 manifest 的 sha256 校验（`crypto.subtle` 不可用时跳过并告警） |
| 仓库里某个文本文件写错 → 内容错乱 | 构建脚本遇 error 即失败（不进包）；App 端解析错误保留旧内容并报错定位到文件+行号 |
| 分组 id 随路径变化 → 本机记录错位 | 迁移组写死 `# id:`；新组用路径 id；`# id:` 也可随时手动指定 |
| 官方删除分组后本机仍保留 | 规则：用户没改过就一并删除，改过则保留并提示；工作台另有删除入口 |
| 现有 `contentGroups()` 的"本地永远赢"缺陷若未彻底改造，内容更新传不到老用户 | 步骤 4~6 专门处理，并以"仓库改一个词 → 同步后生效"作为验收项 |
| 统一归一化口径写错 → 老用户内容被判为"改过"，更新传不下去 | 口径集中在 `normaliseGroupRecord()`，读/写/输入框的名称截断统一为 24；单测覆盖"老格式分组（无 image 键、name 按旧 16 截断）与官方新格式比较结果为相等" |
| `package.json` 加 `"type": "module"` 影响既有 Node 脚本 | 仓库所有 Node 脚本均为 `.mjs`（天然 ESM），`features/*.js` 仅被浏览器与测试 import；列为必测项 |
