# skills

一组给「能动手的 AI 助手」用的技能包：每个目录是一个自包含的 `SKILL.md`（何时用、怎么做、怎么验收），需要脚本的随包带上。

![新粗野主义宣传页](assets/preview-hero.jpg)
![组件与数字面板](assets/preview-grid.jpg)
![同一份内容、四套皮肤并排对比](assets/preview-skins.jpg)

## 包含

| 技能 | 干什么 | 触发说法 |
| --- | --- | --- |
| [`neo-brutalist-page`](skills/neo-brutalist-page) | 用新粗野主义（Neo-Brutalism）风格做单文件 HTML 宣传页／落地页／能力展示页／数据报告页。含固定色板与排版 token、组件配方、必做交互清单、禁忌清单、Bun.WebView 自检脚本，以及一份 795 行的完整参考实例 | 「做个宣传页」「做得酷一点」「粗野风」 |
| [`web-style-skins`](skills/web-style-skins) | 「一份 DOM、多套皮肤」：内置三套已验证的风格配方（新粗野主义／终端 CRT／瑞士国际主义排版，参考实例里再加一套 Riso 套印），含每套的色板与排版 token、共享 DOM 的多皮肤框架（每格独立主题、网格↔单屏、localStorage 记忆、键盘操作）、以及一个会真的点按钮、按键盘、刷新页面跑 17 项断言的 Bun.WebView 自检脚本 | 「换一个风格试试」「几种风格对比一下」「做个终端风／瑞士风／极简排版的页面」「这个页面换个皮肤」 |

## 安装

技能就是目录。放进宿主的技能根即可，两种方式：

```bash
# 1) 宿主支持 install_skill（工作区路径 → 用户级技能根）
#    先把仓库放进工作区，然后让助手执行：
#      install_skill("skills/neo-brutalist-page")
#      install_skill("skills/web-style-skins")

# 2) 手动：直接拷进技能根
git clone https://github.com/<you>/skills.git
cp -R skills/neo-brutalist-page skills/web-style-skins ~/.my-app-ui-local/skills/   # 路径按你的宿主改
```

装好后在会话里说一句「做个宣传页」「换一个风格试试」就会命中。

## 各自的自检脚本

写完页面**必须**跑一遍，别只看渲染结果。两个脚本都是「起本地 HTTP 服务 → 在 `Bun.WebView` 里打开 → 抓报错 → 跑断言 → 分段截图到 `shots/` → 退出码给成败」。

```bash
# 单页：断言无横向溢出、无文字被裁、没有元素卡在透明状态；桌面 6 段 + 窄屏 2 段截图
bun run skills/neo-brutalist-page/scripts/selfcheck.ts path/to/page.html 8811 \
  --click "#replay"          # 可选：展开后点击的元素，验证交互没坏

# 多皮肤页：真的点按钮、按键盘、刷新页面，断言 17 项
bun run skills/web-style-skins/scripts/skins-check.ts path/to/page.html 8823
#   选择器与本技能参考实例不同时用参数覆盖：
#   --cell "[data-skin]" --theme-btn ".skin-theme" --all-dark "#allDark" --all-light "#allLight" \
#   --grid "#mGrid" --single "#mSingle" --pick ".cellbar .nm" --key 3 --width 1440 --height 900
```

`skins-check` 断言的 17 项：无 JS 报错、≥2 格皮肤、每格都有 `data-skin/data-theme`、每格有主题按钮、全局深浅色作用于全部格、格内按钮只翻自己那格、单屏只剩一格可见、点标签栏能换格、按键能换格、刷新后主题/模式/选中格都被记住、桌面与窄屏都无横向溢出、格内内容未被裁。

参考实例也自带一份可以直接跑通的样本：

```bash
bun run skills/web-style-skins/scripts/skins-check.ts \
  skills/web-style-skins/reference/styles-four-skins.html 8823     # → 17 passed, 0 failed
```

## 前提

- 自检脚本需要 **Bun 1.4+**（用内置 `Bun.WebView`，无需装依赖）；`Bun.WebView` 驱动本机 Chrome/Edge，需本机装有其中之一。
- 页面本身是**单文件、零依赖、断网可开**的纯 HTML/CSS/JS，与宿主无关。
- 自检脚本在 macOS 上实测通过；其它平台预期可用但未实测。

## 许可

MIT，见 [LICENSE](LICENSE)。拿去改、拿去商用都行，别拿去做成付费课程的封面就行。
