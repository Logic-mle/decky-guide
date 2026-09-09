# Decky Guide（Decky Loader 插件）

在 Steam Deck 游戏模式的 Decky 快捷访问栏中，自动识别正在运行的游戏，搜索游民星空攻略，并直接阅读图文正文。

[下载最新版本](https://github.com/Logic-mle/decky-guide/releases/latest) · [更新日志](CHANGELOG.md) · [GitHub 仓库](https://github.com/Logic-mle/decky-guide) · [问题反馈](https://github.com/Logic-mle/decky-guide/issues)

## 快速安装

当前正式版：**v1.0.0**。需要 Steam Deck 游戏模式及已安装的 [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader#installation)。实现以 Decky Loader 3.2.8 的接口为基准，其他版本的兼容性需实机确认。普通用户无需安装 Node.js 或编译源码。

1. 在 Steam Deck 上打开 [v1.0.0 下载页](https://github.com/Logic-mle/decky-guide/releases/tag/v1.0.0)，在 Assets 中下载 **`DeckyGuide-v1.0.0.zip`**。
2. 回到游戏模式，按 `…` 打开 Decky，进入设置并启用开发者模式。
3. 在开发者选项中选择从 ZIP 安装，选中下载的文件并确认。若当前 Decky 提供的是“从 URL 安装”，可粘贴下面的安装包链接。
4. 安装完成后打开 **Decky Guide**；若未显示，重新加载插件或重启 Steam。

```text
https://github.com/Logic-mle/decky-guide/releases/download/v1.0.0/DeckyGuide-v1.0.0.zip
```

请下载上述安装包；GitHub 自动生成的 `Source code (zip)` / `Source code (tar.gz)` 是源码，不包含编译后的插件入口，不能直接安装。

## 功能

- 通过 `Router.MainRunningApp` 自动读取当前游戏的 AppID 和名称。
- 自动依次尝试已缓存匹配、Steam 商店简中名、游民星空中文名称和 Steam 原名；只有搜到攻略才采用该名称。
- 支持手动输入中文游戏名，并按 AppID 永久记住别名（优先级最高）。
- 在 Decky 侧栏内阅读文字和图片，无需离开游戏。
- 支持长篇攻略的章节目录、上一页和下一页；选择章节后目录自动收起。
- 按游戏保存最近阅读的攻略、章节和段落内位置，首页可继续阅读；未运行游戏时保存在独立的手动阅读记录中。
- 三档正文字号（14 / 16 / 18px），自动记住偏好；图片可在弹窗中放大至 200%。
- 章节目录支持关键词筛选，保留原始章节编号和当前章节标记。
- 整页流式阅读，正文使用侧栏原生滚动；章节目录与阅读设置吸顶常驻，展开面板显示在工具栏下方，章节翻页按钮位于文末。
- 支持手柄滚动、翻页、看图和分层返回。
- 搜索和正文使用 6 小时内存缓存，减少重复请求。
- 使用 Decky Loader 3.2.8 自带的网络代理，不依赖插件 Python 子进程，也不需要 root 权限。

## 数据来源与接口说明

游民星空没有面向第三方开发者的公开攻略 API。本插件使用其公开、服务端渲染的攻略搜索页：

```text
https://so.gamersky.com/all/handbook?s=<游戏名>&type=hot&sort=des&post=0
```

正文从公开的 `www.gamersky.com/handbook/...` 页面读取。插件只接受 `gamersky.com` 及其子域链接。

当前实现通过 Decky 的 `fetchNoCors` 内置代理读取公开页面，在 Steam UI 前端解析，不使用游民星空内部 App API。第三方页面没有稳定性承诺，页面结构变化可能导致搜索或正文解析失效。

本插件与游民星空无隶属或授权关系，内容版权归原作者及游民星空所有。

## 开源许可与贡献

插件代码采用 [MIT 许可证](LICENSE)。第三方攻略文字、图片及商标不属于本项目的 MIT 授权范围。

欢迎提交 Issue 和 Pull Request。反馈问题时请提供插件版本、Decky Loader 版本、游戏名称和复现步骤；提交代码前请运行 `npm test` 和 `npm run build`，涉及手柄交互的变更请注明 Steam Deck 实机验证情况。

## 构建

建议使用 Node.js 22 和 npm；打包还需要 Python 3。在项目目录执行：

```bash
npm ci
npm test
npm run build
```

构建结果为 `dist/index.js`。执行 `npm run package` 可重新构建并生成 `out/DeckyGuide-v1.0.0.zip` 和对应的 SHA-256 校验文件。

## 安装到 Steam Deck

### 开发安装

1. 先执行构建，再将安装包中的 `DeckyGuide/` 目录复制到 Steam Deck 的 `~/homebrew/plugins/`（以实际 Decky 安装路径为准）。
2. 确认目录中至少有 `dist/index.js`、`plugin.json`、`package.json` 和 `LICENSE`。
3. 重启 Steam，或在 Decky 开发者设置中重新加载插件。

### ZIP 安装

把所需文件放在 ZIP 的单一顶层目录 `DeckyGuide/` 中：

```text
DeckyGuide/
  assets/
  dist/index.js
  LICENSE
  package.json
  plugin.json
  README.md
```

然后在 Decky 设置中启用开发者模式，选择“从 ZIP 文件安装插件”。

## 使用

1. 启动游戏。
2. 按 `…` 打开快捷访问菜单，进入 Decky，再打开“Decky Guide”。
3. 插件会优先通过 AppID 查询 Steam 商店简中名，并用游民星空游戏专区搜索补充名称映射，然后自动试搜攻略。
4. 搜索框下方会显示最终采用的名称来源；成功的自动匹配会按 AppID 缓存 30 天。
5. 如果自动名称仍不正确，输入中文名并选择“搜索并记住匹配”；下次会按 AppID 优先使用该名称。

## 阅读与手柄操作

- 首页的“继续阅读”恢复当前游戏上次攻略的章节与位置；阅读位置自动保存到本机，最多保留最近 100 个游戏的记录。
- 方向键交给 Steam 原生焦点导航，逐段阅读并在段落、图片和按钮间移动；不拦截上下左右方向键，也不创建固定高度的正文滚动框。
- 按住 `LB / RB` 在当前正文中连续向上 / 向下滚动，松开立即停止；目录或阅读设置展开时暂停肩键滚动。切换章节使用目录或文末上一页 / 下一页。
- 章节目录 / 阅读设置及其他横排按钮使用左右焦点导航。
- 正文任意位置按 `X` 打开 / 收起章节目录，按 `Y` 打开 / 收起阅读设置；打开后焦点进入面板，可直接用手柄操作。
- 聚焦图片后按 `A` 或直接点击放大；图片窗口内可切换适应窗口 / 200%，放大后使用四个移动按钮查看细节，`B` 返回。
- `B` 优先收起目录或阅读设置，再次按下返回搜索结果。
- “阅读设置”提供标准 / 舒适 / 大三档字号（14 / 16 / 18px，默认 14px，已有字号偏好保留），以及打开原文的入口。
- 目录输入关键词即时筛选，多个词用空格分隔；选择章节后自动收起，选择当前章节会保留位置。
- 章节读取失败会保留上一章节并提供重试；正文图片读取失败可点击重试，手柄可按 `A` 在图片窗口中重试。

## 本地验证

`npm test` 包含类型检查和阅读状态测试。运行 `npm run preview` 后访问本机 `http://127.0.0.1:4173`，可查看使用实际阅读器组件和模拟攻略数据的界面。

浏览器测试：安装或指定 Playwright 后执行 `npm run test:browser`；可通过 `DECKY_PLAYWRIGHT_PATH` 指向已有 Playwright 模块。默认使用 macOS 的 Google Chrome。预览中的 Steam 组件是测试替身，因此浏览器测试覆盖排版、滚动、存储、搜索、缩放和按键事件处理，不能代替 Steam Deck 实机的焦点导航测试。

## 已知限制

- 非 Steam 游戏或未提供简中商店名的游戏依赖游民星空搜索映射，少数重名游戏仍可能需要手动指定。
- 游民星空页面结构变化后可能需要更新解析器。正文变化时，保存的段落位置可能不再准确。
- 进度与字号保存在当前 Steam UI 的本地存储中，不跨设备同步；清理该存储会清除记录。攻略内容仍需要联网加载。
- 少数互动地图、视频或脚本型内容无法在简化阅读器中完整呈现，可使用“在浏览器打开原文”。

## 调试

插件使用 Decky 内置网络代理，主要查看 Decky 总日志：

```text
/tmp/plugin_loader.log
```

在 Steam Deck 桌面模式的 Konsole 中可实时查看：

```bash
tail -f /tmp/plugin_loader.log
```

搜索 `Gamersky`、`Decky Guide`、`fetch`、`CERTIFICATE` 或 `Traceback`。

## 更新与卸载

- **更新**：下载新版本的安装 ZIP，按快速安装步骤覆盖安装。阅读进度和名称匹配保存在 Steam UI 本地存储中；保留该存储时通常可继续使用原记录，项目不提供跨设备备份。
- **从 0.6.5 更新**：1.0.0 沿用原来的本地存储键，不进行数据迁移。
- **卸载**：在 Decky 设置的插件管理中卸载 Decky Guide。卸载插件不保证清除 Steam UI 本地存储中的阅读记录。

## 常见问题

| 问题 | 处理方式 |
| --- | --- |
| 装不上或提示缺少入口 | 确认下载的是 `DeckyGuide-v1.0.0.zip`，不是 Source code；ZIP 内应包含 `DeckyGuide/dist/index.js`。 |
| 没有自动识别游戏 | 先启动游戏；非 Steam 游戏可手动输入中文名称并搜索。 |
| 搜不到攻略或匹配了同名游戏 | 尝试完整中文名，使用“搜索并记住匹配”；确认游民星空网站本身有相应攻略。 |
| 正文为空、图片失败或请求超时 | 检查网络，重试加载；仍失败时打开原文，并在 Issue 附上攻略链接。 |
| 更新 Steam 后插件无法使用 | 检查 Decky 是否正常加载，记录 SteamOS、Steam 客户端和 Decky 版本后反馈。 |
| 找不到以前的阅读进度 | 确认当前游戏与原记录一致；清理 Steam UI 存储会删除记录。 |

## 网络请求与本地数据

插件会向 Steam 商店发送当前游戏 AppID 以查询名称，向游民星空发送游戏名或搜索词，并请求用户打开的攻略页面和图片。相应网站会接收这些请求的常规网络信息。插件不需要账号、API Key 或自建后端，代码中未加入分析统计或遥测服务。

游戏别名、自动匹配结果、阅读进度和字号偏好保存在当前 Steam UI 的 `localStorage` 中；搜索和正文缓存保存在内存中。攻略正文不是离线下载资料库。

## 参与项目

欢迎通过 [Issue](https://github.com/Logic-mle/decky-guide/issues/new/choose) 反馈问题或提出功能建议；开发和发布流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

感谢 [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) 及相关开发库、React 和 React Icons。第三方依赖遵循各自许可证；攻略文字、图片及商标归各自权利人所有。本项目与 Valve、Decky Loader 或游民星空不存在官方隶属关系。
