# DOM 处理模式

> 新增/修改页面处理器时遵守的标准流程。全部要点都来自现有处理器（`processImage` 是最完整的范例，`IThome Pro-fix.js:254-333`）。

---

## 处理器五步法

1. **窄查询**：用尽量具体的选择器圈定目标，不要全页 `img` 扫完再慢慢筛（`processIframes` 的选择器连 iframe 类型都限定死，`IThome Pro-fix.js:443-445`）。
2. **跳过不该动的节点**。现有的跳过规则清单（新增类似节点时照抄判断方式）：
   - 评论区：`image.closest("#post_comm")`；
   - 视频/媒体组件：`.ithome_super_player`（自研播放器）、`iframe.ithome_video`、`player.bilibili.com` iframe；
   - 表情：`.lazy.emoji`、`.ruanmei-emoji.emoji`；
   - 查看器自身：`#image-viewer`、`.zoomed`、`.comment-image`、`.titleLogo`；
   - 结构性跳过：`wrapImagesInP` 跳过"已是 p 唯一子元素"的图、尺寸过小的图（`width < 25 || height < 20`，可能是图标）（`IThome Pro-fix.js:414-421`）；
   - 页面形状跳过：`wrapImagesInP` 直接 return 掉 blog 页（`IThome Pro-fix.js:399`）。
3. **幂等守卫**（三选一或组合）：
   - 集合：`processedImages` / `processedElements`，键取 `data-id || src || Math.random().toString()`；
   - class 标记：`processed`（样式处理）、`hover-wrapper`（包装器存在性，用 `li.closest('.hover-wrapper')` 判断）；
   - 结构检查：目标已被包进包装器/已是目标父节点。
4. **应用样式**：优先 `Object.assign(element.style, styleMap.get(key))`，样式值来自共享样式表（见下）。
5. **局部 try/catch**：整个函数体包住，失败打 `console.error("Error in <函数名>:", error);`。绝不让单个处理器的异常中断 `window.load` 序列——页面可见性恢复依赖这条纪律（`IThome Pro-fix.js:906-935`）。

## 共享样式表（不要散落内联对象）

| 表 | 键 | 用途 |
|----|----|------|
| `imageStyles` | `home` / `video` / `longImage` / `regular` | 图片按上下文分类的样式（`IThome Pro-fix.js:214-247`） |
| `styleConfig` | `headerImage` / `rounded` / `addComm` / `card` | 头图、圆角、评论框、卡片（`IThome Pro-fix.js:351-370`） |
| `wrapperStyles` | `hoverWrapper` / `hover` / `normal` | 列表项包装器及悬停态（`IThome Pro-fix.js:604-622`） |

新增样式时**扩展这三张表**，不要在处理器里新造一次性对象。已知例外：`processIframes` 内联了一个样式对象（`IThome Pro-fix.js:451-457`）——这是历史欠账，照表扩展而非照它复制。

## 处理器接线（双挂载规则）

一个新处理器要让初始页面和动态内容都生效，必须**同时**出现在两处：

- `window.load` 初始化序列（`IThome Pro-fix.js:906-919`）；
- `processNewContent()`（`IThome Pro-fix.js:820-833`），供 `MutationObserver` 回调。

只改初始列表、不改 `processNewContent`（或反过来）是最常见的遗漏。参考 `replaceImageWrapper` 在两处的接线。

## 已知陷阱

- **`processedImages` 是共享的**：`processImage`、`styleHeaderImage`、`replaceImageWrapper` 都读写它。一个处理器先把 id 标记进去，后面的处理器就会被跳过。需要多个处理叠加在同一图片上时，用函数专属 class 或单独的 `Set`，不要复用全局集合。
- **选择器脆**：`hideElements` 里大量 `:nth-child(n)` 选择器绑定 IThome 当天线上结构（`IThome Pro-fix.js:166-174`）。改动选择器必须保守，并在 blog 列表页和文章页两类页面上都验证。
- **`Math.random()` 兜底键**：`data-id`/`src` 都缺失时用随机数当 id——每次扫描都会生成新键，等于永不命中守卫。新代码若依赖守卫语义，先确认元素至少有稳定 `src`。

## 结构变更类处理器的范例

`makeListItemsClickable`（`IThome Pro-fix.js:640-686`）演示了完整的"包装器"模式：插包装 div → 移入原节点 → 把 `h2 a` 链接替换为纯文本 → 在包装器上挂 click/悬停事件（`window.open(titleLink.href, titleLink.target ?? "_self")`）。悬停背景色按深色模式取值（`getBackgroundColor`，`IThome Pro-fix.js:629-634`）。

`replaceImageWrapper`（`IThome Pro-fix.js:751-814`）演示了"可逆样式"：改前把原始 width/height 存进 `originalStyles`，点击缩放时能恢复。
