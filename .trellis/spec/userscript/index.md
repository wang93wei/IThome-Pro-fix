# Userscript 开发规范

> 本层规范针对 `IThome Pro-fix.js` —— 仓库唯一的源码与发布产物（单文件 Tampermonkey/Greasemonkey 用户脚本，v4.8.0，匹配 `*://*.ithome.com/*`）。

---

## 规范索引

| 文档 | 内容 | 何时读 |
|------|------|--------|
| [代码风格](./code-style.md) | IIFE/严格模式、缩进、命名、注释语言、禁用项 | 改动任何代码之前 |
| [DOM 处理模式](./dom-processing.md) | 选择器、跳过规则、幂等守卫、样式表、错误处理 | 新增/修改页面处理器 |
| [配置与功能开关](./config-and-features.md) | `CONFIG` 结构、开关生效现状、元数据块纪律 | 增删功能开关或调时序 |
| [动态内容与生命周期](./dynamic-content.md) | 启动时序、`window.load` 序列、MutationObserver 接线 | 处理异步/懒加载/新内容 |
| [发布与手工 QA](./release-qa.md) | 版本号与 README 同步、冒烟清单、跨浏览器范围 | 任何用户可见变更发布前 |

---

## 项目一句话架构

`document-start` 注入临时隐藏 CSS → 根 URL 重定向到 `/blog/` → 滚动监听自动点"加载更多" → `window.load` 执行主清理/美化序列并启动 `MutationObserver` → 观察器对新内容重跑选定的处理器。无构建、无依赖、无持久化存储、无网络 API。

## 硬约束（先于一切风格规则）

1. 不引入 npm/Bun/pnpm/yarn、构建步骤或任何外部依赖。
2. 不添加 `@grant` / `@require` / `@connect` / `@resource` / `@downloadURL` / `@updateURL` 等元数据指令（当前头部一个都没有，保持现状）。
3. 只使用浏览器标准 DOM API（`document`、`window.location`、`window.open`、定时器、`MutationObserver`、`data-src`/`data-original` 懒加载属性提升）。
4. `IThome Pro-fix.js` 既是源码也是发布产物，改动直接影响 GreasyFork 分发。
