# 修复页内阅读器内脚本不生效（保留 sandbox + 父帧注入）

> 问题诊断：v4.9.0 在 `openInPageReader()` 里给阅读器 iframe 设了
> `frame.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups"`（`IThome Pro-fix.js:813`）。
> 带 `sandbox` 属性的 frame 上，Chromium 系浏览器不会注入扩展内容脚本 → 本站脚本（Tampermonkey）
> 不会进入阅读器 iframe，iframe 内文章页"裸奔"（未隐藏导航/广告、未处理懒加载图片、未隐藏登录弹窗等）。

## Goal

阅读器 iframe 内文章页同样得到脚本优化效果；同时站点防嵌套跳转
（`ua.min.js` 的 `self!=top&&(top.location.href=...)`）在打开期间仍被拦截，
阅读器打开/关闭/复用的现有 UX 不回退。

## 实验结论（设计依据，2026-09-13 IAB/Chromium harness）

- **T1 基线**：无 sandbox 时子帧成功劫持顶层页 → 去 sandbox 必须有对策。
- **T2 meta CSP sandbox**：`<meta http-equiv="CSP" content="sandbox ...">` 对顶层导航**无效**
  （规范仅 HTTP 头生效；ithome 文章页无 CSP 头，已 curl 验证）。
- **T4/T5/T7 页面 JS 守卫**（Location 原型拦截 / 遮蔽 `window.top`）：全部失效——
  `top.location.href=` 走**顶层 realm** 的原型，`location`/`top` 是 Unforgeable 属性，
  子帧 JS 改不动顶层环境。
- **T8 结论（选定方案）**：**保留 sandbox 属性**（它是唯一被证实能拦 `top.location.href` 的机制），
  由父页面（list 文档，脚本在顶层 realm 运行）经 `contentWindow` 向帧 realm 注入脚本源码
  （`Function.prototype.toString()` + `new frame.contentWindow.Function(src)`），
  注入的脚本在帧 realm 中成功执行（`ran:true`），顶层未被劫持（`topBusted:false`）。

## Requirements

1. 阅读器 iframe 保留 `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`，
   继续拦截 `ua.min.js` 的防嵌套跳转；顺手清理冗余标记（如 `frameborder`）。
2. 提供"脚本源码→帧 realm 执行"的注入通道：
   - 注入的函数**不得包含 free variables**（注入后经 `frame.contentWindow.Function(fn.toString())`
     在帧 realm 实例化，依赖脚本内 module 级状态如 `CONFIG` / `Set`/`Map` 会导致 `ReferenceError`）。
   - 支持返回注入结果（如 `Promise`，用于观察器句柄转移），调用方做超时/异常兜底。
   - 注入失败（跨域、帧已卸载）不抛错打断主流程，仅 `console.error`。
3. 抽出一组"可注入"的清理函数（对 `document` 参数的纯 DOM 操作，无副作用、不依赖模块状态），
   在打开阅读器、加载文章时应用：
   - `hideElementsForDocument(doc)`：隐藏导航/广告/侧边栏（对应现有 `hideElements`）。
   - `processImagesForDocument(doc)`：懒加载图片升级为 `src`（`data-src`/`data-original`），
     同时修正懒加载占位图引发的歪斜宽高比。
   - 隐藏登录弹窗模态（`#rm-login-modal` / `#login-guide-box`）。
4. 不重构既有全局处理器（`initializePage` 等仍跑在顶层 realm 处理列表页）。
5. 阅读器关闭时（含切换文章复用单例时）清理帧内已安装的观察器/定时器，
   避免与下一次加载互相干扰。
6. `@version` 递增（4.9.0 → 4.9.1）并同步 `README.md` changelog。

## Constraints

- 单文件 userscript，无构建步骤、无依赖；保持现有 IIFE/严格模式/双引号风格。
- 禁止在注入源码中使用 `</script>` 字面量（本实现经 `Function` 构造而非 innerHTML，
  但仍是代码评审硬约束）。
- 浏览器兼容：Chrome / Edge / Firefox 均须可用；iframe 注入通道依赖同源（本站阅读器满足）。
- 不引入 `@grant`、`@require`、`@connect`、`@resource`；不引入存储 API。

## Acceptance Criteria

- [ ] 打开阅读器，iframe 内文章页执行注入：控制台无 `ReferenceError`（free variable 类错误）。
- [ ] 注入后，iframe 内文章页可见效果：导航/广告/侧边隐藏；懒加载图变为 `<img src>`；
      登录弹窗模态隐藏；长图不歪斜。
- [ ] 阅读器打开期间，文章页 `ua.min.js` 的防嵌套跳转被拦截（顶层 URL 不变，无整页跳转）。
- [ ] 阅读器关闭后再打开（复用单例切换文章）无异常；多次开关后列表页滚动恢复行为不变。
- [ ] 顶层列表页既有行为无回归：自动加载更多、图片样式、根路径重定向、评论强制加载。
- [ ] `IThome Pro-fix.js` 在 Tampermonkey 中无新增红错。
- [ ] `@version` 与 `README.md` 版本/changelog 一致。

## Notes

- 本任务是 v4.9.0（09-13-inpage-iframe-reader）的修复，配置开关 `CONFIG.inPageReader` 语义不变。
