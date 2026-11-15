---
name: web-style-skins
description: 用「同一份 DOM、多套皮肤」的方式做风格对比页或风格化单页，内置三套已验证的风格配方——新粗野主义（Neo-Brutalism）、终端/CRT 荧光屏（Retro Terminal）、瑞士国际主义排版（Swiss / International Typographic Style）。含每套的色板与排版 token、组件配方、共享 DOM 的多皮肤框架（每格独立主题、网格/单屏切换、localStorage 记忆、键盘操作）、以及一个会真的点按钮跑断言的 Bun.WebView 自检脚本。用户说「换一个风格试试」「几种风格对比一下」「做个终端风 / 瑞士风 / 极简排版的页面」「这个页面换个皮肤」时用。
---

# web-style-skins · 一份内容，多套皮肤

## 什么时候用

- 用户**挑不出风格**，需要一次性看到 2–4 种风格的同一段内容（四宫格对比器）；
- 用户点名了**终端风 / 瑞士排版 / 粗野主义**之一，要做单页或落地页；
- 已有页面要**换皮**：内容不动，只换 token 与几个组件配方；
- 要做一个**风格化的数据/报告页**，但不想引入任何依赖（单文件、断网可开）。

不适用：需要真实后端交互的表单、打印用 A4 排印稿（改用纯排印风格）、以及「品牌 VI 已定死」的商用页（别自创风格）。

## 先认清楚：这三套是一家

它们共享同一个内核——**把结构露出来，不给它穿装饰**。所以能无缝混搭，也所以放在一起对比最有说服力：

| 风格 | 露的是什么 | 一句话气质 |
| --- | --- | --- |
| 新粗野主义 Neo-Brutalism | **骨架**（描边、硬阴影、色块） | 海报、街头贴纸、反 SaaS |
| 终端 / CRT Retro Terminal | **机器**（提示符、光标、扫描线） | 像一台在跑程序的机器 |
| 瑞士排版 Swiss / International Typographic Style | **网格**（栏线、基线、留白） | 一份印在纸上的说明书 |

三者的共同禁忌：渐变、毛玻璃、投影柔光、装饰性插画、圆角胶囊。谁把这几样加回来，味道立刻掉一半。

## 一、新粗野主义 Neo-Brutalism

```css
.cell[data-skin="brutalist"]{
  --bg:#f2eee2;            /* 纸色，不要纯白 */
  --fg:#141410;            /* 墨色 */
  --accent:#ff4a1c;        /* 橘红：只做大块面 */
  --accent2:#1f4bff;       /* 电蓝：空心字/描边 */
  --mark:#d8ff3e;          /* 荧光黄：徽标/促销条 */
  --line:3px solid var(--fg);
  --shadow:12px 12px 0 var(--fg);   /* 偏移、无模糊、纯色 */
  --radius:0;
}
.cell[data-skin="brutalist"][data-theme="dark"]{
  --bg:#141410; --fg:#f2eee2; --accent:#ff5c39; --accent2:#6f8cff; --mark:#eaff7a;
}
```

- 字体：`ui-sans-serif / Helvetica Neue / Arial` + 中文回落黑体；标题 `font-weight:900; letter-spacing:-.045em; line-height:.9`。
- 签名元素：**空心描边字**（`-webkit-text-stroke:2.5px` + `-webkit-text-fill-color:transparent`）、`rotate(-3deg)` 的贴纸、mono 大写小标签（`// HELLO WORLD`、`NO.01`）、跑马灯。
- 底纹：`repeating-linear-gradient` 画 32px 网格，用 `color-mix(in srgb, var(--fg) 6%, transparent)` 保持随主题变。
- 动效：hover `translate(-3px,-3px)` 且阴影变大；按下 `translate(3px,3px)` 阴影收掉（"压下去"）；缓动只给 `120–260ms`，别用 0.6s 慢淡入。

## 二、终端 / CRT Retro Terminal

```css
.cell[data-skin="terminal"]{
  --bg:#060a06; --fg:#7dfba0; --fg-dim:#2f7a46;
  --accent:#b6ff5c; --alert:#ff6b6b;
  --bar:#040704;                     /* 顶部提示条略深 */
  --font:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --glow:0 0 18px color-mix(in srgb, var(--fg) 45%, transparent);
  --scan-step:3px;
}
.cell[data-skin="terminal"][data-theme="light"]{  /* 日光终端 */
  --bg:#f2f7ef; --fg:#0f5c2a; --fg-dim:#5b8f6c; --accent:#0b7f3a; --bar:#e6efe2;
}
```

- 全文 mono，字距略开；标题用 `text-shadow: var(--glow)` 做荧光，别用发光边框。
- 签名元素：`▌` **闪烁光标**（`animation: blink 1s steps(2) infinite`，挂在最后一个标题元素上）、`guest@hello:~$` 提示符、`[ HELLO WORLD ]` 方括号框、扫描线（`repeating-linear-gradient` 叠在内容上，`mix-blend-mode:multiply`，`pointer-events:none`）。
- 结构用**等宽字符画边框**（`+---+`、`::before` 里放 ASCII），不要用圆角卡片。
- 动效：打字机要**跳字**（`steps()`）不是匀速淡入；扫描线可极慢漂移，幅度小于 2px。

## 三、瑞士排版 Swiss / International Typographic Style

```css
.cell[data-skin="swiss"]{
  --bg:#fbfbf9; --fg:#16160f; --dim:#7a7a6e;
  --accent:#d7261e;          /* 只给一个词/一个句号用 */
  --hair:1px solid color-mix(in srgb, var(--fg) 22%, transparent);
  --serif:Georgia,"Times New Roman","Songti SC",serif;
  --grid-cols:12;
}
.cell[data-skin="swiss"][data-theme="dark"]{ --bg:#101010; --fg:#f3f2ea; --dim:#8d8d82; --accent:#ff4a3d; }
```

- 大标题用**衬线**（无外链字体时 Georgia 是安全牌），`font-weight:400–600` 加 `letter-spacing:-.02em`，行高 `0.95–1.05`；观点用斜体 `em` 承接。
- 签名元素：可见的 **12 栏网格线**（`repeating-linear-gradient(to right, hair 0 1px, transparent 1px calc(100%/12))`）、发丝分隔线、mono 小字当编号与注脚、**大量留白**（左右内边距 ≥ 8%，顶部 ≥ 72px）。
- 绝对禁用：阴影、圆角、色块底、居中排版（瑞士是严格左对齐）。
- 动效：几乎不要动。允许的唯一动作是 hover 时 `--accent` 下划线从左展开。

## 一份 DOM，多套皮肤（核心做法）

**不要写四份 HTML。** 四个格子用完全相同的标签结构，只让 `data-skin` 决定 CSS，这才看得出「风格」到底改的是哪几根线。

```html
<section class="cell" data-skin="brutalist" data-theme="light">
  <div class="cellbar">
    <span class="idx">01</span><span class="nm">New Brutalism</span>
    <button class="skin-theme" type="button">Dark</button>
  </div>
  <div class="stage">
    <p class="tag">// HELLO WORLD</p>
    <h1 class="title">Hello<br><em>World</em></h1>
    <p class="lead">一句话说清这是什么。</p>
    <button class="cta" type="button">Say hi</button>
    <div class="facts"><span><b>STYLE</b> Flat</span><span><b>DEPTH</b> 4px</span></div>
  </div>
</section>
```

规矩：

1. **语义类名共用**（`.stage/.title/.tag/.lead/.cta/.facts`），皮肤只写 `.cell[data-skin="…"] .title{…}`；
2. **两层变量**：外壳变量（`--bg/--fg/--accent/--hair`）每套皮肤各给一版，主题切换只覆盖同一组变量；
3. **皮肤能藏元素**：某皮肤不需要的元素用 `display:none`（例如 `.facts` 在终端皮肤里改成一行 mono 键值），别为此改 DOM；
4. 共享 DOM 的代价是**每套皮肤都要单独目检**——同一段文字在 12px mono 和 900 字重黑体下占的宽度差一倍，会长出溢出与裁切问题（见「常见坑」）。

## 状态机（四件事，缺一件就是张静态图）

```js
const S = { mode: 'grid', active: 0, themes: {} };   // themes[skin] = 'light' | 'dark'
```

- **外壳主题**：按「多数格」决定（`darkCount > n/2`），写成 `html[data-theme]`，让顶部工具条跟着变；
- **模式**：`html[data-mode="grid|single"]`；单屏下 `.cell:not(.is-active){display:none}`，选中的那格铺满视口（`min-height: calc(100dvh - 工具条高)`）；
- **记忆**：每格一个键（`localStorage['skins:<skin>']`，参考实例用的是 `hello4:` 前缀，你的页面自定前缀即可）+ 模式 + 选中格；首屏在 `<head>` 里同步读取并写进 `data-*`，防闪烁；
- **键盘**：`1`–`n` 选格、`g` 回网格、`t` 全局反色。处理时分两种情况，**别假设 `e.target` 一定是元素**：

```js
document.addEventListener('keydown', e => {
  const t = e.target;
  if (t instanceof Element && t.matches('input,textarea,select,[contenteditable]')) return;
  if (/^[1-9]$/.test(e.key)) select(+e.key - 1);
  if (e.key.toLowerCase() === 'g') setMode('grid');
});
```

## 验收（必须跑，别只看渲染）

```bash
bun run <技能目录>/scripts/skins-check.ts <页面路径> [端口] [--cell sel] [--theme-btn sel] \
    [--all-dark sel] [--all-light sel] [--grid sel] [--single sel] [--pick sel] [--key 3]
```

脚本会起本地服务 → 打开页面 → **真的点按钮、真的按键盘、真的刷新**，然后断言 17 项：无 JS 报错、≥2 格、每格有 `data-skin/data-theme`、每格有主题按钮、全局深浅色作用于全部格、格内按钮只翻自己、单屏只剩一格、点标签栏能换格、按键能换格、刷新后主题/模式/选中格都还在、桌面与窄屏都无横向溢出、格内未被裁。同时把 `01-grid-default` … `06-grid-mobile` 六段截图写进**页面同目录**的 `shots/`（仓库里已 gitignore，页面随项目提交时记得排除）。

默认选择器对应参考实例；你的页面换了类名就用参数覆盖。退出码 0 = 全过。

## 常见坑（都是实测踩过的）

1. **格内内容被切**：`.cell{overflow:hidden}` 配上 `grid-template-rows: 1fr` 时，文本一旦超出行高就被裁。改 `grid-auto-rows: auto`，格子高度由内容决定，`min-height: clamp(300px, 46vh, 560px)` 兜底。
2. **`Bun.WebView` 的 `evaluate` 只收单个表达式**：`a=1;b=2;` 会报 `SyntaxError: Unexpected token ';'. Expected ')' to end a compound expression.`，要包成 `(()=>{ …; return 1; })()`。
3. **配色混合别在暗色下用 `screen` 叠亮色块**：Riso/噪点层在暗色里会把正文压得看不清，`opacity` 要降到 0.3 左右，或改用 `soft-light`。
4. **硬阴影会被父级 `overflow:hidden` 裁掉一角**：装硬阴影的卡片，其滚动容器要留出阴影同宽的 padding。
5. **`localStorage` 在 `file://` 下可用，但跨文件共享同源**：调试时先 `localStorage.clear()`，否则会看到"莫名其妙的初始主题"。

## 参考实例

- `reference/styles-four-skins.html`：四宫格对比器（粗野主义 / 终端 / 瑞士 / Riso 套印），演示每格独立主题、网格↔单屏、键盘、记忆；四格共用一份 DOM。
- `reference/single-skin-landing.html`：只做粗野主义一套的单页，用来对比「一套做深」和「多套做对比」的差别。
- `scripts/skins-check.ts`：上文的自检脚本（`Bun 1.4+`，驱动本机 Chrome/Edge，无第三方依赖）。

## 混搭配方（想更进一步时）

- **瑞士骨架 + 粗野着色**：严格 12 栏网格里只放一个带硬阴影的撞色块，克制但有冲击；
- **终端字 + 瑞士栅格**：全 mono 但按 12 栏排，像 Bloomberg 终端的数据页；
- **粗野描边 + 终端提示符**：把 `guest@hello:~$` 当 kicker 标签，最"程序员"的粗野变体。

混搭只改两处：**字体栈**与**是否保留硬阴影**。别三套的签名元素全上，会变成杂烩。
