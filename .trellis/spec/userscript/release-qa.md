# 发布与手工 QA

> 无测试、无 CI、无 lint。发布质量完全靠这份手工清单。`IThome Pro-fix.js` 即发布产物，改动直接影响 GreasyFork 用户。

---

## 发布三件套（缺一不可）

1. `IThome Pro-fix.js` 头部 `@version` 递增；
2. `README.md`：版本号、更新日期、更新日志条目同步；
3. 涉及元数据/DOM 插入/外链的改动，过一遍 `.trae/skills/tampermonkey/references/security-checklist.md`。

版本号、README 安装链接、日志三者不一致是最常见的发布事故。

## 手工冒烟清单（行为变更的最小验证集）

在 Tampermonkey 里启用脚本并确认匹配 `ithome.com`，然后逐项验证：

- [ ] DevTools 控制台无来自 `IThome Pro-fix.js` 的新红色报错（重点看 `Error in <函数名>:` 格式的日志）；
- [ ] 访问 `https://www.ithome.com/` 重定向到 `/blog/`；
- [ ] **故意制造一个处理器报错时页面仍然可见**（`window.load` 的 catch 分支兜底 `opacity = 1`）；
- [ ] 登录弹窗与页头/侧栏等被隐藏元素保持隐藏；
- [ ] 懒加载图片从 `data-src` / `data-original` 正常加载；
- [ ] 文章图片、长图（高 > 1000px，400px 定宽）、视频 iframe（IThome 自研 + Bilibili）、卡片、列表头图保持既有样式；
- [ ] "加载更多"自动点击不卡死页面，新加载内容被观察器处理（无重复包装、无失控循环）;
- [ ] 评论区被强制加载后页面滚动位置正确恢复；
- [ ] 列表项插入包装器后整行仍可点击跳转，悬停有阴影，深色模式下背景色正确；
- [ ] 文章页图片点击可缩放（30% ↔ 100%）且能恢复。

两类页面都要测：**blog 列表页**和**文章详情页**（多个处理器对二者行为不同，如 `wrapImagesInP` 跳过 blog 页）。

## 调试参考

卡住时按 `.trae/skills/tampermonkey/references/debugging.md` 的顺序排查：脚本启用与 `@match` 命中 → 控制台报错 → 目标元素是否存在于当前页面形状。

## 跨浏览器范围

有发布风险的变更需要在 Chrome、Firefox、Edge 三者上回归。Safari/macOS 仅在明确要求时验证。
