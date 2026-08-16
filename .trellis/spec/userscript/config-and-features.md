# 配置与功能开关

> `CONFIG` 是唯一的用户可调入口（`IThome Pro-fix.js:19-55`）。改动它之前先读"开关生效现状"，别按字段名望文生义。

---

## CONFIG 结构

两类成员，顺序固定：先功能布尔开关（camelCase），后时序常量（UPPER_SNAKE，毫秒）。

| 键 | 类型 | 当前值 | 语义 |
|----|------|--------|------|
| `showCommentBox` | 开关 | `false` | `false` 时 `hideElements` 追加隐藏 `#postcomment3` |
| `autoLoadMore` | 开关 | `true` | `autoClickLoadMore` 入口处检查 |
| `autoLoadImages` | 开关 | `true` | `window.load` 尾部决定是否全量 `forceLoadImage` |
| `roundedImages` | 开关 | `true` | **未被任何调用方检查**（见下） |
| `hideAds` | 开关 | `true` | **未被任何调用方检查**（见下） |
| `MOUSEMOVE_INTERVAL` | 时序 | 100 | `keepPageActive` 的 mousemove 触发间隔 |
| `MOUSEMOVE_DURATION` | 时序 | 5000 | `keepPageActive` 停止时间 |
| `INITIAL_DELAY` | 时序 | 1000 | 初始自动加载前的等待 |
| `SCROLL_DELAY` | 时序 | 100 | `forceLoadComments` 滚到底后的等待 |
| `PROCESSING_DELAY` | 时序 | 200 | 观察器处理后重置 `isProcessing` 的延迟 |
| `MUTATION_DEBOUNCE` | 时序 | 300 | MutationObserver 防抖 |
| `AUTO_CLICK_DEBOUNCE` | 时序 | 500 | 滚动触发自动点击的防抖 |

## 开关生效现状（截至 v4.8.0，如实记录）

- 真正被 honored 的：`showCommentBox`（`IThome Pro-fix.js:195`）、`autoLoadMore`（`:533`）、`autoLoadImages`（`:925`）。
- **未接线的历史欠账**：`hideAds` 与 `roundedImages` 存在于 `CONFIG`，但 `hideElements` / `removeAds` / `setRoundedImages` 无条件执行。规范要求：
  1. 新增开关时，接线检查点和开关一起提交，并在本文件登记；
  2. 顺手修复这两个旧开关是合法的独立任务，但不要在无关改动里"顺便"改变它们的行为。

## 新增/修改时序值

- 只加进 `CONFIG`，禁止在调用点写裸数字延时；
- 值以毫秒注释说明用途，保持中文注释；
- 改动后过一遍 [发布与手工 QA](./release-qa.md) 的懒加载/加载更多检查项——这些常数直接控制时序敏感路径。

## 元数据块纪律（头部 1-10 行）

- `@version`：任何用户可见行为变更必须递增（补丁位 +0.0.1），同时更新 `README.md` 的版本号、日期与更新日志——两者一起改，一次提交。
- `@match` 固定 `*://*.ithome.com/*`；`@run-at` 固定 `document-start`（启动时序假设遍布全文件，见 [动态内容与生命周期](./dynamic-content.md)）。
- `@name` / `@namespace` / `@supportURL` / `@license` 不动。
- 涉及元数据、DOM 插入、外链的变更发布前查 `.trae/skills/tampermonkey/references/security-checklist.md`。
