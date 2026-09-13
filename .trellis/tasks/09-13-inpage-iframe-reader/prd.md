# blog 列表页内嵌 iframe 新闻阅读器

## Goal

在 IThome blog 列表页点击新闻条目时，不再跳转/新开标签页，而是在当前页面内以全屏浮层 + iframe 的方式直接阅读文章正文。

## Requirements

- R1: 点击 `.bl > li` 列表项（现有 hover-wrapper 整行点击区域）时，打开页内阅读器浮层，浮层内 iframe 加载该条目对应文章 URL。
- R2: 浮层包含顶部栏：文章标题（超长省略）、「在新标签页打开」链接、「关闭」按钮；正文 iframe 占满剩余区域。
- R3: 关闭方式：关闭按钮、ESC 键、点击浮层外的遮罩区域；关闭后恢复列表页滚动位置（打开期间锁定 body 滚动）。
- R4: 阅读器浮层为单例：再次点击其他条目时复用浮层，仅更新 iframe src 与标题。
- R5: 通过 `CONFIG.inPageReader` 开关控制；为 false 时保持现有 `window.open` 跳转行为。
- R6: 同源文章 URL 下，userscript 自身会注入 iframe 内部，文章页的去广告/图片处理照常生效（无需额外代码，验收时确认无报错即可）。
- R7: 浮层节点不得触发 MutationObserver 的重复内容处理（在 `hasNewContent` 判断中排除）。
- R8: 遵循仓库规范：中文 JSDoc 注释、try/catch + console.error、样式集中在 Map（新增 `readerStyles`）、双空格缩进、双引号。
- R9: `@version` 升至 4.9.0，README 版本号、更新日期与 changelog 同步更新。

## Constraints

- 单文件 userscript，不引入任何依赖、构建工具或网络 API（iframe 加载同源页面即可，无 GM 请求）。
- 不改变列表项其余视觉行为（hover 高亮、圆角包装等保持不变）。
- 深色模式下顶部栏/面板背景使用 `getBackgroundColor()` 适配。

## Acceptance Criteria

- [ ] blog 列表页点击任意条目 → 页内浮层出现，iframe 内显示文章正文，无页面跳转。
- [ ] ESC / 关闭按钮 / 点遮罩均可关闭浮层，列表页滚动恢复正常、滚动位置不变。
- [ ] 连续点击多条新闻，浮层复用且内容正确切换。
- [ ] 「在新标签页打开」可正常跳转原文章链接。
- [ ] 加载更多产生的新列表项同样可页内打开（observer 路径生效）。
- [ ] DevTools Console 无来自本脚本的新增红色报错；浮层开合不引发 observer 递归处理。
- [ ] `CONFIG.inPageReader = false` 时行为回退为原有 window.open。

## Notes

- 方案选型：对比过「fetch+DOMParser 提取正文」与「行内展开」，iframe 浮层对站方改版最健壮、改动最小，已选定。
