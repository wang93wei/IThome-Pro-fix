# 执行计划：阅读器内脚本生效（保留 sandbox + 父帧注入）

> 顺序执行；每步后跑"验证"小节。回滚点：任意一步完成后 `git checkout -- "IThome Pro-fix.js"` 即可
> （改动仅该文件 + 文档）。

## 0. 预检

- [ ] `git status` 干净；当前在 `main`。
- [ ] 备份当前 `IThome Pro-fix.js`（`cp` 到 /tmp 或 stash），便于快速回滚。

## 1. 新增注入通道与帧内清理函数

在 `IThome Pro-fix.js` 中（建议放在 `readerStyles` 定义之后、`openInPageReader` 之前）：

- [ ] 新增 `runInFrame(frame, fn, ...args)`（实现见 design.md）。
  - 单测点：用 `node -e` 语法检查（无浏览器环境时至少保证 parse 通过）：
    `node --check "IThome Pro-fix.js"`。
- [ ] 新增 `hideElementsForDocument(doc)`：纯函数，无 free variables。
  - 复制 `hideElements()` 的选择器列表（`IThome Pro-fix.js:140-160` 附近），改为操作 `doc`。
  - 在 `doc.head` 追加 `<style>` 元素（id 可固定如 `ithome-pro-fix-frame-style` 保证幂等）。
- [ ] 新增 `processImagesForDocument(doc, processedSet)`：纯函数。
  - 逻辑对齐 `forceLoadImage`（`IThome Pro-fix.js:128-142`）：`data-src`/`data-original` → `src`，
    移除 `loading` 属性、`lazy` 类。
  - 幂等：若 `img.src` 已是非占位（已含真实路径），跳过；`processedSet` 为帧 realm 传入的 `Set`。
- [ ] 新增 `hideLoginModalForDocument(doc)`（可与 `hideElementsForDocument` 合并，视 selector 重叠情况）。

**评审约束（代码评审时逐条核对）**：
- 注入函数体内不得出现：未声明变量、`CONFIG`、模块级 `Set`/`Map`、`this`（非严格模式依赖）、
  `document`（顶层）、`window`（顶层）。
- 不得出现字符串 `</script>`。
- 跨 realm 判断用属性探测，禁用 `instanceof`。

## 2. 改造 `openInPageReader`

定位：`IThome Pro-fix.js:743-839` 附近。

- [ ] 保留 `frame.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups"`（**勿删**）。
- [ ] 删除冗余 `frame.setAttribute("frameborder", "0")`（CSS `border:0` 已覆盖）。
- [ ] 修正 `IThome Pro-fix.js:808-812` 的错误注释：改为说明
  "扩展不注入 sandboxed frame，本脚本经父帧 `runInFrame` 注入帧 realm 执行"。
- [ ] 在 `frame` 的 `load` 回调中（或 `src` 赋值后立即注册 `load` 监听）：
  ```js
  frame.addEventListener("load", () => {
    runInFrame(frame, hideElementsForDocument, frame.contentDocument);
    runInFrame(frame, (doc, SetCtor) => {
      const s = new SetCtor();
      // 初次全量
      processImagesForDocument(doc, s);
      // 帧内观察器：处理后续插入的图
      const obs = new MutationObserver(() => processImagesForDocument(doc, s));
      obs.observe(doc.body, { childList: true, subtree: true });
      return () => obs.disconnect();
    }, frame.contentDocument, frame.contentWindow.Set).then((cleanupFn) => {
      if (typeof cleanupFn === "function") readerFrameCleanups.push(cleanupFn);
    });
  });
  ```
- [ ] 在"复用单例切换文章"分支（`existing` 路径）：先执行 `readerFrameCleanups` 清理（见步骤 3），
  再 `oldFrame.src = url`。

## 3. 清理逻辑：模块状态 + 关闭/复用钩子

- [ ] 模块级新增 `const readerFrameCleanups = [];`（紧邻 `readerScrollY` 声明）。
- [ ] 新增 `cleanupReaderFrame()`：`await Promise.allSettled(readerFrameCleanups.map(fn => runInFrame(frame, fn)))`，
  之后 `readerFrameCleanups.length = 0`。`frame` 从当前 overlay 中取；若 overlay 不存在则跳过。
- [ ] `closeInPageReader()`（`IThome Pro-fix.js:723-738`）开头调用 `cleanupReaderFrame()`（不 await，避免阻塞关闭动画；
  若实现为 async，记得调用方不 await 时也要 catch）。
- [ ] `openInPageReader` 的 `existing`（复用单例）分支开头也调用 `cleanupReaderFrame()`。

## 4. 元数据与文档同步

- [ ] `IThome Pro-fix.js` 头部 `@version`：`4.9.0` → `4.9.1`。
- [ ] `README.md`：
  - 版本号同步 `4.9.1`、更新日期。
  - changelog 新增一条：`4.9.1` — 修复页内阅读器内文章页脚本不生效的问题（保留 sandbox 拦截防嵌套跳转，脚本经父帧注入到 iframe realm 执行）。

## 5. 验证（浏览器手动 QA）

环境：Tampermonkey + Chrome/Edge（Chromium 系必测；Firefox 抽查）。

- [ ] 安装/更新脚本后，访问 `https://www.ithome.com/blog/`，点击任意列表项打开阅读器。
- [ ] 阅读器内文章页：DevTools Console 无 `ReferenceError`、无新增红错。
- [ ] 阅读器内文章页：顶部导航/侧边栏/广告隐藏；懒加载图已显示真实 `src`；
  登录弹窗模态不出现；长图不歪斜。
- [ ] 阅读器打开期间：顶层地址栏 URL 不变（未被 `ua.min.js` 劫持跳转）。
- [ ] 关闭阅读器（点 ✕ / ESC / 点遮罩）：列表页滚动位置恢复；再次打开另一篇，重复上述检查无异常。
- [ ] 回归：列表页自动"加载更多"仍工作；图片圆角/卡片样式不变；根路径 `https://www.ithome.com/` 仍重定向到 `/blog/`。

记录：QA 结果写入任务目录（可附在 `check.jsonl` 备注或任务 notes）。

## 6. 提交

- [ ] `git add "IThome Pro-fix.js" README.md .trellis/`
- [ ] commit message：`fix: 阅读器内文章页脚本经父帧注入生效（v4.9.1）`
- [ ] 任务收尾：`task.py finish`（或按 Trellis 工作流 archive）。

## 回滚点

- 步骤 1–3 完成后若验证失败：`git checkout -- "IThome Pro-fix.js"`，回到 v4.9.0 行为（阅读器裸奔但可用）。
- 步骤 4 文档改动可单独 revert。
