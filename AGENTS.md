# Repository Guidelines

## Project Overview

IThome Pro Fix is a single-file Tampermonkey/Greasemonkey userscript that improves the IThome desktop web experience. It is a fixed fork of IThome Pro, currently version `4.8.0`, distributed through GreasyFork and targeting `*://*.ithome.com/*`.

Primary user-facing goals:
- reduce page clutter, ads, login prompts, and unwanted chrome;
- improve image/video/card/list styling;
- keep pagination, comments, and lazy-loaded images usable after dynamic page updates.

## Architecture & Data Flow

- Runtime artifact: `IThome Pro-fix.js`. There is no `src/` tree, bundler, package manifest, or generated output.
- Execution model: an IIFE userscript runs at `document-start`, uses strict mode, injects temporary hide CSS, then restores page visibility from the `window.load` handler.
- Entry points:
  - userscript metadata block at `IThome Pro-fix.js:1-10` controls name, version, match scope, run timing, support URL, and license;
  - immediate startup redirects `https://www.ithome.com/` to `https://www.ithome.com/blog/`;
  - scroll listener triggers debounced auto-clicking of visible `a.more` load-more links;
  - `window.load` runs the main DOM cleanup/styling sequence and starts the observer;
  - `MutationObserver` watches `document.body` for new content and re-runs selected processors.
- Data/state flow:
  - source-level `CONFIG` holds feature defaults and timing constants;
  - `Set`/`Map` instances (`processedImages`, `processedElements`, `originalStyles`) keep page-lifetime processing state;
  - DOM processors mutate the live page directly: inline styles, wrapper elements, class names, image `src/loading`, removed links, scroll position, and navigation.
- No persistent storage or direct network APIs are used. The script relies on browser DOM APIs, `window.location`, `window.open`, timers, `MutationObserver`, and image `data-src` / `data-original` promotion.

## Key Directories

- `IThome Pro-fix.js` — main source and distributable userscript.
- `README.md` — project version/date, GreasyFork install link, fix summary, changelog.
- `.trae/skills/tampermonkey/` — local AI-assistant reference for userscript metadata, DOM patterns, debugging, security, URL matching, and compatibility. Treat as guidance, not runtime code.
- `.trae/skills/modern-javascript-patterns/` — local AI-assistant reference for ES6+ style patterns. Treat as guidance, not runtime code.

No `tests/`, `scripts/`, `docs/`, `.github/`, or package-managed config directories were found.

## Development Commands

No automated commands are declared in this repository.

```sh
# There is no package.json, lockfile, build script, lint script, or test script.
# Do not run npm/bun/pnpm/yarn commands unless tooling is intentionally added.
```

Practical development workflow:
1. Edit `IThome Pro-fix.js` directly.
2. Load/copy the script into Tampermonkey or install via the GreasyFork page from `README.md`.
3. Visit affected `ithome.com` pages and verify the changed behavior manually in the browser console.
4. When changing behavior, update the userscript `@version` and `README.md` changelog together.

## Code Conventions & Common Patterns

- JavaScript style:
  - plain browser JavaScript, no imports/exports/classes/modules;
  - IIFE wrapper with `"use strict"`;
  - two-space indentation, semicolons, double quotes;
  - `const`/`let`, camelCase names, uppercase only for timing constants inside `CONFIG`;
  - Chinese JSDoc-style block comments and concise Chinese inline comments.
- Configuration:
  - add feature flags and timing values to top-level `CONFIG`;
  - verify callers actually honor new/existing flags. `hideAds` and `roundedImages` exist, but current related processing is not consistently gated by those flags.
- DOM mutation pattern:
  1. query narrowly with selectors;
  2. skip comments, media widgets, emojis, already-processed nodes, or page shapes that should not change;
  3. use an idempotency guard (`processedImages`, `processedElements`, a CSS class, or a structural check);
  4. apply styles with `Object.assign(element.style, styleMap.get(key))` where possible;
  5. wrap mutating logic in local `try/catch` and log `console.error("Error in <function>:", error)`.
- Styling pattern:
  - shared style maps: `imageStyles`, `styleConfig`, `wrapperStyles`;
  - prefer extending existing maps over scattering repeated inline style objects.
- Async pattern:
  - timer-based only: `setTimeout`, `setInterval`, debounced callbacks, and small `await new Promise(resolve => setTimeout(resolve, ...))` delays;
  - `observeDOM()` uses debounce plus an `isProcessing` flag to avoid recursive or rapid reprocessing.
- Dynamic content rule:
  - if adding a new page processor, wire it into both the initial `window.load` sequence and `processNewContent()` / observer detection when it must apply to later-loaded content.
- Idempotency warning:
  - `processedImages` is shared by several image processors. Marking an image in one pass can suppress a later pass. Use function-specific classes or a separate `Set` when behavior must compose.
- Selector warning:
  - many selectors depend on live IThome markup, including nth-child selectors. Prefer conservative changes and verify on blog/list pages and article pages.

## Important Files

- `IThome Pro-fix.js`
  - userscript header: metadata and distribution scope;
  - `CONFIG`: feature flags and delays;
  - `addHideStyle()`, `hideElements()`, `keepPageActive()`: flicker/login suppression;
  - `forceLoadImage()`, `processImage()`, `setRoundedImages()`, `styleHeaderImage()`, `wrapImagesInP()`, `processIframes()`, `replaceImageWrapper()`: image/media handling;
  - `setRounded()`, `makeListItemsClickable()`, `setHome()`, `removeMarginTop()`, `setDivWidthTo590()`, `initializePage()`: layout and list behavior;
  - `debounce()`, `autoClickLoadMore()`, `forceLoadComments()`, `observeDOM()`, `processNewContent()`: dynamic loading and reprocessing;
  - `removeAds()`: ad/feed cleanup.
- `README.md`
  - keep version, update date, install link, and changelog aligned with the userscript header.
- `.trae/skills/tampermonkey/references/debugging.md`
  - useful checklist for userscript enablement, match scope, console errors, and target element checks.
- `.trae/skills/tampermonkey/references/security-checklist.md`
  - use before release-like changes that touch metadata, DOM insertion, external URLs, permissions, or storage.

## Runtime/Tooling Preferences

- Required runtime: browser userscript manager such as Tampermonkey/Greasemonkey.
- Target pages: `*://*.ithome.com/*`; script currently runs at `document-start`.
- Package manager: none. Do not introduce npm/Bun/pnpm/yarn or a build step unless the task explicitly requires it.
- Dependencies: none. The userscript header has no `@grant`, `@require`, `@connect`, `@resource`, `@downloadURL`, or `@updateURL` directives.
- Browser APIs only: keep changes compatible with standard DOM APIs available in userscript contexts.
- Distribution: `IThome Pro-fix.js` is both source and release artifact; edits directly affect what should be published.
- Metadata discipline: preserve the top userscript block. For user-visible changes, bump `@version` and update `README.md`.

## Testing & QA

No automated test suite, CI, lint, formatter, or coverage target was found. QA is manual and browser-based.

Minimum manual smoke checks for behavior changes:
- Tampermonkey dashboard shows the script enabled and matching the current `ithome.com` URL.
- Browser DevTools console has no new red errors from `IThome Pro-fix.js`.
- Root URL redirects to `/blog/` when relevant.
- Page body becomes visible after load, including when a guarded processor throws.
- Login prompt and unwanted page chrome stay hidden.
- “加载更多” / pagination does not freeze the page and dynamically loaded content is processed.
- Lazy images load from `data-src` / `data-original`; article images, long images, video iframes, cards, and list images keep expected styling.
- Comments can be forced to load without leaving the page scrolled incorrectly.
- List rows remain clickable after wrapper insertion.
- `MutationObserver` applies changes to newly added content without repeated wrapping or runaway processing.

Cross-browser QA should cover Chrome, Firefox, and Edge when release risk is meaningful. Safari/macOS behavior is only required when explicitly targeted.