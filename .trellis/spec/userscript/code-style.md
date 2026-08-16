# 代码风格

> 记录 `IThome Pro-fix.js` 的既有风格。新代码必须与现有代码"长得一样"，子代理按本文件对齐。

---

## 文件与结构

- 单文件 `IThome Pro-fix.js`，约 950 行，无 `src/`、无打包器、无 package.json。
- 顶部 10 行是 userscript 元数据块（`// ==UserScript==` … `// ==/UserScript==`），只能按 [配置与功能开关](./config-and-features.md) 中的纪律修改。
- 整体是一个 IIFE：

```js
(function () {
  "use strict";
  // ...
})();
```

（`IThome Pro-fix.js:12-13`）

## 空格、分号、引号

- 两空格缩进；
- 语句一律带分号；
- 字符串一律双引号 `"..."`；唯一例外是 `getAttribute('data-id')` 等处混用了单引号（`IThome Pro-fix.js:257`）——新代码仍用双引号，不必顺手统一旧代码。

## 变量与命名

- 只用 `const` / `let`，无 `var`。
- 变量与函数 camelCase；仅 `CONFIG` 内的时序常量用 UPPER_SNAKE（`MOUSEMOVE_INTERVAL`、`INITIAL_DELAY`、`SCROLL_DELAY`、`PROCESSING_DELAY`、`MUTATION_DEBOUNCE`、`AUTO_CLICK_DEBOUNCE`，见 `IThome Pro-fix.js:36-54`）。
- 全局状态是三个页面生命周期的集合（`IThome Pro-fix.js:58-60`）：

```js
const processedImages = new Set();   // 有意用 Set 而非 WeakSet，防止元素被 GC 后重复处理
const processedElements = new Set();
const originalStyles = new Map();    // imgId -> { width, height }
```

- 页面级模块顺序：`CONFIG` → 状态集合 → 隐藏样式与 `addHideStyle` → 启动期逻辑（重定向、`keepPageActive`）→ 各处理器函数 → 工具函数（`debounce`）→ `observeDOM` → `window.load` 总入口。新函数放在同类分区里。

## 函数风格

两种声明并存，属于历史现状：

- 主流（约 90%）：箭头函数常量 `const processImage = (image) => { ... };`
- 少数旧函数：`function setRoundedImages() { ... }`（`keepPageActive`、`setRoundedImages`、`wrapImagesInP`、`removeAds`）

**新代码一律用 `const fn = (...) => { ... };`**。重构触碰旧函数时可顺手转换，不做专门的重构提交。

## 注释语言与密度

- 块注释是中文 JSDoc 风格：一句话职责 + 换行说明 + 按需的 `@param`（如 `forceLoadImage`、`processImage`，`IThome Pro-fix.js:125-129`）。
- 行内注释为简短中文（"跳过评论区的图片"、"移除href属性，阻止默认跳转"）。
- 复杂逻辑必须解释"为什么"（如 `IThome Pro-fix.js:57`：解释为何用 `Set` 不用 `WeakSet`）。
- 不要写翻译式注释（"遍历数组"这类复述代码的话少用；现有代码里存在一些，新代码别再增加）。

## 禁止项（本仓库的现实约束）

- 无 import/export/class/模块语法；
- 无第三方库、无 Polyfill、无 async 框架——异步只用定时器（见 [动态内容与生命周期](./dynamic-content.md)）；
- 不引入持久化存储（`localStorage` / `GM_setValue` 等）；
- 不发起网络请求。
