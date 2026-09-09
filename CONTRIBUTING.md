# 参与开发

欢迎提交问题、功能建议和 Pull Request。请先搜索已有 Issue，避免重复反馈。

## 开发环境

建议 Node.js 22、npm；打包需要 Python 3。普通安装用户只需 Release ZIP。

```bash
git clone https://github.com/Logic-mle/decky-guide.git
cd decky-guide
npm ci
npm test
npm run build
```

- `src/index.tsx`：游戏识别、网络请求、搜索和页面解析。
- `src/ArticleReader.tsx`：阅读器与手柄交互。
- `src/reading-state.ts`：本地进度、字号和章节筛选。
- `tests/`：阅读状态测试及浏览器预览测试。

## 预览与验证

运行 `npm run preview`，在浏览器访问 `http://127.0.0.1:4173`。预览使用实际阅读器组件、模拟攻略与 Steam 组件，不代表 Steam Deck 实机截图。

浏览器测试需另行安装 Playwright，或用 `DECKY_PLAYWRIGHT_PATH` 指向已有模块；在预览服务运行时执行 `npm run test:browser`。默认启动 macOS Google Chrome，其他系统需设置 `DECKY_CHROME_PATH` 为浏览器可执行文件路径。

提交前运行 `npm test` 和 `npm run build`。涉及手柄交互时，实机检查：方向焦点、LB / RB 按住与释放、X / Y 面板、B 分层返回、章节切换和图片查看。请在 PR 中明确哪些检查通过、哪些未验证。

请保持变更聚焦，不提交 `node_modules/`、`dist/`、本地安装包、密钥或个人配置。新增第三方资源时说明来源和许可证。

## 发布流程（维护者）

1. 同步更新 `package.json` 与 `package-lock.json` 的版本。
2. 更新 `CHANGELOG.md` 和 `docs/releases/v版本号.md`，检查 README 的版本和下载入口。
3. 运行 `npm test`、`npm run package`，并验证安装 ZIP。
4. 将变更提交并推送到 `main`。
5. 创建并推送与版本一致的标签，例如 `git tag v1.0.0`、`git push origin v1.0.0`。
6. GitHub Actions 会重新安装锁定依赖、测试、构建、打包，然后创建草稿 Release、上传 ZIP 和校验文件，最后公开发布。检查 Actions 结果及 Release 附件。

标签必须与 package 版本一致；每个版本应有独立发布说明。不要移动已发布的标签或替换正式版附件，有修正时发布新的补丁版本。

## 许可

提交贡献即表示你有权提交这些内容，并同意按本项目 MIT 许可证分发贡献代码。第三方攻略内容不属于本项目 MIT 授权范围。
