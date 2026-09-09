# Decky Guide（Decky Loader 插件）

在 Steam Deck 游戏模式的 Decky 快捷访问栏中，自动识别正在运行的游戏，搜索游民星空攻略，并直接阅读图文正文。

[GitHub 仓库](https://github.com/Logic-mle/decky-guide) · [问题反馈](https://github.com/Logic-mle/decky-guide/issues)

## 功能

- 通过 `Router.MainRunningApp` 自动读取当前游戏的 AppID 和名称。
- 自动依次尝试已缓存匹配、Steam 商店简中名、游民星空中文名称和 Steam 原名；只有搜到攻略才采用该名称。
- 支持手动输入中文游戏名，并按 AppID 永久记住别名（优先级最高）。
- 在 Decky 侧栏内阅读文字和图片，无需离开游戏。
- 支持长篇攻略的章节目录、上一页和下一页；选择章节后目录自动收起。
- 按游戏保存最近阅读的攻略、章节和段落内位置，首页可继续阅读；未运行游戏时保存在独立的手动阅读记录中。
- 三档正文字号（14 / 16 / 18px），自动记住偏好；图片可在弹窗中放大至 200%。
- 章节目录支持关键词筛选，保留原始章节编号和当前章节标记。
- 延续 0.5.0 的整页流式阅读，正文使用侧栏原生滚动；章节目录与阅读设置吸顶常驻，展开面板显示在工具栏下方，章节翻页按钮位于文末。
- 支持手柄滚动、翻页、看图和分层返回。
- 搜索和正文使用 6 小时内存缓存，减少重复请求。
- 使用 Decky Loader 3.2.8 自带的网络代理，不依赖插件 Python 子进程，也不需要 root 权限。

## 数据来源与接口说明

游民星空没有面向第三方开发者的公开攻略 API。本插件使用其公开、服务端渲染的攻略搜索页：

```text
https://so.gamersky.com/all/handbook?s=<游戏名>&type=hot&sort=des&post=0
```

正文从公开的 `www.gamersky.com/handbook/...` 页面读取。插件只接受 `gamersky.com` 及其子域链接。

调研中还确认了旧版 App 使用的内部端点 `appapi2.gamersky.com/v1/ContentDetail/...`。内容端点目前仍能返回移动版 HTML，但它没有公开文档或稳定性承诺；旧客户端的 `v2/TwoSearch` 搜索端点目前已返回业务错误。因此当前实现选择公开搜索页和公开正文页，并通过 Decky Loader 3.2.8 的 `fetchNoCors` 内置代理读取。解析在 Steam UI 前端完成，避免自定义 Python 后端失联导致调用永久等待。

本插件与游民星空无隶属或授权关系，内容版权归原作者及游民星空所有。

## 开源许可与贡献

插件代码采用 [MIT 许可证](LICENSE)。第三方攻略文字、图片及商标不属于本项目的 MIT 授权范围。

欢迎提交 Issue 和 Pull Request。反馈问题时请提供插件版本、Decky Loader 版本、游戏名称和复现步骤；提交代码前请运行 `npm test` 和 `npm run build`，涉及手柄交互的变更请注明 Steam Deck 实机验证情况。

## 构建

需要 Node.js 18+。在项目目录执行：

```bash
npm install
npm run build
npm test
```

构建结果为 `dist/index.js`。

## 安装到 Steam Deck

### 开发安装

1. 将整个项目目录复制到 Steam Deck 的 `~/homebrew/plugins/Decky Guide/`。
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
