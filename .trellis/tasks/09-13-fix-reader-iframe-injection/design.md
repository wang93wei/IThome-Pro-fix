# 技术设计：阅读器内脚本生效（保留 sandbox + 父帧注入）

## 背景与问题定界

v4.9.0 引入页内阅读器：点击列表项 → 全屏浮层 + `<iframe src=文章URL>` 原地阅读。
为拦站点 `ua.min.js` 的 `self!=top&&(top.location.href=...)` 防嵌套跳转，iframe 被加了
`sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`（`IThome Pro-fix.js:813`）。

副作用（Chromium 系浏览器）：**扩展内容脚本不注入带 sandbox 的 frame** →
Tampermonkey 不会把本脚本注入阅读器 iframe → 文章页"裸奔"。
（对照：Firefox 128 起才解禁 content scripts on sandboxed URLs；Chrome/Edge 至今未解禁。）

## 方案选型（依据 2026-09-13 浏览器实验）

| 候选 | 实验结果 | 结论 |
|---|---|---|
| A. 去 sandbox + `<meta CSP sandbox>` | T2：顶层仍被导航到 `#BUSTED` | ❌ 规范上 meta CSP 的 `sandbox` 指令不生效（仅 HTTP 头），ithome 无 CSP 头 |
| B. 去 sandbox + 页面 JS 守卫（Location 原型拦截 / 遮蔽 `window.top`） | T4/T5/T7：全部被绕过或不可改 | ❌ `top.location.href=` 在**顶层 realm** 求值；`top`/`location` 是 Unforgeable 属性，子帧无法伪造/改其 setter |
| C. 去 sandbox + 重构所有处理器传 `doc` 参数 | 未试 | ⚠️ 改动面几十个函数 + MutationObserver/定时器全部要传 realm 句柄，回归风险大 |
| **D. 保留 sandbox + 父页面（顶层 realm）经 `contentWindow` 注入脚本源码到帧 realm** | T8：`ran:true`、`topBusted:false` | ✅ **选定**。通道同源可达、函数在帧 realm 以 `Function` 构造执行 |

**核心原理**：注入函数必须是**纯的、无 free variables**（不引用模块级 `CONFIG`、`Set`/`Map`），
因为注入时它在**另一个 realm** 中经 `new frame.contentWindow.Function(src)` 重新实例化，
任何外部引用都会 `ReferenceError`。脚本内全局状态（如幂等 `Set`）若需要，只能以参数传入
或在帧 realm 内自建。

## 注入通道设计

```js
/**
 * 在指定 iframe 的 realm 中执行函数
 * @param {HTMLIFrameElement} frame - 目标 iframe
 * @param {Function} fn - 要执行的函数（必须无 free variables）
 * @param {...any} args - 传给 fn 的参数（会被结构化克隆/直接传入）
 * @returns {Promise<any>} fn 的返回值（若为 Promise 则等待其 resolve）
 */
const runInFrame = (frame, fn, ...args) => {
  try {
    const win = frame.contentWindow;
    if (!win) throw new Error("no contentWindow");
    const FrameFunction = win.Function;
    // 经 frame realm 的 Function 构造，避免 realm 差异（Array/Error 原型等）
    const run = new FrameFunction(
      "fn", "args",
      "try { var r = fn.apply(null, args); return Promise.resolve(r); } catch (e) { return Promise.reject(e); }"
    );
    return run(fn, args).catch((e) => {
      console.error("Error in runInFrame:", e);
      return undefined; // 兜底，不打断主流程
    });
  } catch (e) {
    console.error("Error in runInFrame setup:", e);
    return Promise.resolve(undefined);
  }
};
```

要点：
- `new win.Function` 而非 `eval`，避免 CSP/严格模式差异，且构造出的函数作用域干净。
- `fn.apply(null, args)` 中 `this` 为 `null`（严格模式），函数体内不得依赖 `this`。
- 传入参数若是对象（如 `doc`），它来自顶层 realm——在帧 realm 中仍是合法 DOM 引用（同源），
  但 `instanceof` 判断跨 realm 会失效；注入函数内**避免 instanceof**，用鸭子类型/属性探测。

## 可注入的"帧内清理"函数

抽出 3 个纯函数（仅依赖参数，不引用模块状态），定义在顶层 realm（供 `Function.toString`）：

1. `hideElementsForDocument(doc)`
   - 复用现有 `hideElements` 的 selector 列表，但操作目标换成 `doc`。
   - 注入的 CSS：`doc.head` 追加 `<style>`，隐藏 `#nav, #top, #tt, #side_func, #fls, #fi, #lns`、
     文章页侧边栏、`#rm-login-modal, #login-guide-box` 等（对齐 `hideElements` + `addHideStyle`）。
   - 不调用顶层 `hideElements()`（它操作 `document`，是顶层 list 文档）。
2. `processImagesForDocument(doc)`
   - 遍历 `doc.querySelectorAll("img")`：有 `data-src`/`data-original` 且 `src` 仍是占位/缺失时，
     把 `data-*` 写入 `src`、移除 `loading="lazy"` 类/属性。
   - 不依赖 `processedImages`（帧 realm 中它是未定义标识符）。幂等性由"仅当 src 是占位/空时改写"保证，
     或注入时传入一个帧 realm 内的 `Set` 作为第二参数（见下）。
3. `hideLoginModalForDocument(doc)`
   - 直接 `display:none !important` 式隐藏 `#rm-login-modal, #login-guide-box`（CSS 已覆盖时可省，但保留作为兜底）。

调用时机：
- `openInPageReader(url, title)` 中 `frame.src = url` 之后，监听 `frame load`：
  `frame.addEventListener("load", () => { runInFrame(frame, hideElementsForDocument, frame.contentDocument); ... })`
- 若文章页懒加载/动态插入（如评论），可在帧内起一个轻量 `MutationObserver`——
  观察器回调也要经 `runInFrame` 注入的"帧内观察器安装函数"完成，返回观察器句柄，
  顶层保存句柄、关闭阅读器时 `runInFrame(frame, (obs) => obs.disconnect(), obs)` 清理。

## 帧 realm 内的状态与清理

- 观察器/定时器句柄：经 `runInFrame` 返回值带回顶层（`Promise`），存入模块级数组
  `readerFrameCleanups: Array<() => Promise<void>>`。
- `closeInPageReader()` 与"复用单例切换文章"路径：
  - 先遍历 `readerFrameCleanups` 逐个 `await`（或 `Promise.allSettled`）执行清理（断开观察器、清定时器）。
  - 再 `overlay.remove()` 等既有逻辑。
- 兜底：`frame` 本身被移除后其 realm 销毁，观察器/定时器自动失效——清理是"避免同 iframe 复用时叠加"，
  而非防泄漏；因此清理失败仅 log，不阻塞关闭。

## 与既有代码的关系

- **保留**：`openInPageReader` 的浮层结构、`readerStyles`、`closeInPageReader` 的滚动恢复、
  `MutationObserver` 排除 `.ithome-inpage-reader` 的逻辑、`CONFIG.inPageReader` 开关。
- **保留**：`frame.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups"`（防劫持的唯一有效机制）。
- **修正注释**：`IThome Pro-fix.js:808-812` 的注释"sandbox下……本脚本在iframe内继续生效"是**错的**，
  改为说明"扩展不注入 sandboxed frame，脚本经父帧注入"。
- **清理**：`frameborder` 属性已废弃（CSS `border:0` 已覆盖），可删。
- **新增**：`runInFrame`、`hideElementsForDocument`、`processImagesForDocument`（+可能的 `hideLoginModalForDocument`、
  帧内观察器安装函数）、`readerFrameCleanups` 清理逻辑。
- **不重构**：`initializePage` / `observeDOM` / `processNewContent` 等仍跑顶层 realm，本次不动。

## 风险与回滚

- **风险：注入函数误引用 free variable** → 帧 realm `ReferenceError`。
  缓解：代码评审 + 检查清单（见 implement.md）；注入函数命名 `_frame*` 前缀，集中放一段，注释明示约束。
- **风险：跨 realm `instanceof`** → 缓解：注入函数内禁用 `instanceof`，用 `Object.prototype.toString`/`typeof` 探测。
- **风险：Firefox 行为差异**（Firefox 128+ 会注入 sandboxed frame，可能出现"双跑"）。
  缓解：注入函数幂等（CSS 重复追加 style、图片改写做 src 判断），双跑无副作用。
- **回滚**：本次改动集中在阅读器 + 新增函数块；回滚 = `git revert` 单个 commit。
