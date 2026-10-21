# 魔法城堡（magic-castle）项目约定

给 AI 助手与协作者的速查表。详细设计见 `docs/superpowers/specs/`，内容编写见 `docs/如何添加学习内容.md`。

## 🚦 发版规则（最重要）

**除非用户明确要求"发布/发版/出包"，否则只改代码，不要发版。**

"只改代码"具体指：不动 `package.json` 的 `version`、`android/app/build.gradle` 的
`versionCode`/`versionName`、`service-worker.js` 的 `CACHE_NAME`、`index.html` 的 `?v=`；
不 `git tag`、不推 Release、不等 GitHub Actions 出 APK。

发版流程（**仅在用户要求时**执行）：

1. `package.json` version、`features/build-info.js`（由构建生成）、`service-worker.js`
   `CACHE_NAME`、`index.html` 两处 `?v=`、`android/app/build.gradle` 的 `versionCode`+1 与
   `versionName` 同步升版
2. `npm run cap:sync`
3. commit → `git tag v<版本>` → 推 `main` 与 tag
4. 推送需走代理：`export http_proxy=http://proxy.emea.ibm.com:8080 https_proxy=http://proxy.emea.ibm.com:8080`
5. 用 `gh run watch` 跟踪 "Release Magic Castle Android APK" workflow，再用 `gh release view` 校验 APK 已上传

## 学习内容：与 App 版本解耦

- 内容源是**文本文件**：`data/<english|hanzi|recital>/[目录/]<分组>.txt`，每行一个词/一句
- 改内容**不需要发版**：改完 `npm run content:build` → commit & push → 手机上
  「家长设置 → 学习内容工作台 → 同步最新内容」即可生效
- 解析规则只写在 `features/content-files.js`（Node 构建脚本与 App 共用），别处不要重复实现
- 目录层级、目录名全部来自内容，**代码里不写死任何关键词**（如"故事/儿歌/古诗"）

## 常用命令

```bash
npm test              # node --test tests/*.test.mjs（必须真的跑到用例）
npm run content:build # 解析 data/** → features/default-content.js + dist/content/**
npm run build:web     # 生成 dist/（内部先跑 content:build）
npm run cap:sync      # build:web + 同步到 android/
node --check app.js   # 语法自检
```

## 关键文件

| 文件 | 作用 |
|---|---|
| `app.js` | 应用编排：状态、路由、DOM 绑定 |
| `features/content-files.js` | 内容文本源解析器 + 归一化 + 目录树（纯函数） |
| `features/content-sync.js` | 官方内容与本机编辑的三方合并（纯函数） |
| `features/content-channel.js` | 内容清单/文本文件下载、校验、本机快照 |
| `features/default-content.js` | **生成物**，勿手改 |
| `data/**` | 学习内容文本源 |
| `docs/如何添加学习内容.md` | 写内容的使用说明 |

## 约定与坑

- App 端业务代码与构建脚本共用解析/归一化函数，避免两边规则漂移
- 分组名称统一按 **24 字**截断（旧版 16 字截断的老数据靠 `repairTruncatedName()` 修复）
- `english`/`hanzi` 词表按**集合**语义比较（去重），`recital` 是有序句子列表（不去重）
- `activeGroupId` / `deletedGroupIds` 归用户所有，官方同步永不覆盖、永不复活
- `build-web.mjs` 里内容构建必须排在拷贝 `features/` **之前**，否则 `dist/` 里是旧内容
- Service Worker 的 `APP_SHELL` 必须包含 `app.js` import 的每个 `features/*.js`，否则离线启动会挂
