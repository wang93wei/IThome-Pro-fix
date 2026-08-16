# 动态内容与生命周期

> 脚本的执行时序模型。改动任何异步/观察器逻辑前先对齐这张时间线。

---

## 启动时序（`@run-at document-start`）

1. **立即**：`addHideStyle()` 注入 `#ithome-pro-fix-style`，`body { opacity: 0 }` 隐藏原始内容防闪烁，同时隐藏登录弹窗（`IThome Pro-fix.js:66-84`）。
2. **立即**：根 URL 判定——`https://www.ithome.com`（带不带尾斜杠）直接 `window.location.replace("https://www.ithome.com/blog/")` 并 `return` 终止整个 IIFE（`:90-96`）。任何新启动逻辑都必须放在这个 return 之后。
3. blog 页再补一次 `addHideStyle()`（幂等，`:99-101`）。
4. `keepPageActive()`：每 100ms 派发合成 `mousemove` 共 5 秒，压制登录弹窗（`:107-123`）。
5. 挂滚动监听 → `debouncedAutoClickLoadMore`（防抖 500ms，可见即点 `a.more`）；另起一个立即执行体等 1 秒后先点一次（`:553-567`）。

## `window.load` 主序列（`IThome Pro-fix.js:906-935`）

```
hideElements → forceLoadComments → removeAds → wrapImagesInP → setRounded
→ processIframes → setRoundedImages → styleHeaderImage → initializePage
→ replaceImageWrapper → observeDOM → body.opacity = 1
→ (autoLoadImages 时) 全量 forceLoadImage
```

关键约束：

- `document.body.style.opacity = "1"` 在 try **和** catch 里各出现一次——任何处理器抛错也不能让页面白屏。新处理器放进序列前面，别动这两行。
- `forceLoadComments`（`:573-598`）会临时插一个 100vh 的隐藏 spacer、滚到底、等 100ms、移除并回滚顶部——这是评论懒加载的触发方式。改动滚动相关逻辑时注意别和它打架。

## MutationObserver（`observeDOM`，`IThome Pro-fix.js:839-900`）

- 观察 `document.body`，`{ childList: true, subtree: true }`。
- 双保险防重入：外层 `isProcessing` 标志（处理期间丢弃回调）+ `MUTATION_DEBOUNCE`（300ms）防抖；处理完再等 `PROCESSING_DELAY`（200ms）才复位标志。
- 回调里先过滤 mutation：只看 `childList` 且 `addedNodes` 中存在"有意义"的新节点（元素节点、非 `hover-wrapper`/`processed`、且含 `.bl > li` / `img` / `.content` 之一），命中才调 `processNewContent()`，并对新增节点内的 `img` 逐个 `forceLoadImage`。
- **新增动态生效逻辑的接入点**是 `processNewContent()`（`:820-833`），不是观察器回调本身。

## 异步风格

- 只用定时器：`setTimeout` / `setInterval` / 防抖回调 / `await new Promise(resolve => setTimeout(resolve, n))` 短延时。
- 允许 `async` 函数与 `await` 定时器 Promise，但**不引入** fetch/事件总线/任何真正 I/O。
- 全部延时数字来自 `CONFIG`（见 [配置与功能开关](./config-and-features.md)）。

## 懒加载图片的提升规则（`forceLoadImage`，`IThome Pro-fix.js:130-149`)

处理顺序有意义：先删 `loading` 属性 → 移除 `lazy` class → `data-src` 覆盖 `src` → `data-original` 覆盖 `src`（后者优先级更高）→ 兜底设 `loading = "eager"`。新懒加载字段（如 `data-lazy-src`）按同样模式追加在覆盖链上。
