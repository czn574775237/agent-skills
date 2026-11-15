---
name: neo-brutalist-page
description: 用「新粗野主义（Neo-Brutalism / 数字粗野主义）」风格做单文件 HTML 页面——产品宣传页、落地页、能力展示页、数据报告页。含固定色板与排版 token、组件配方（粗描边硬阴影卡片 / 描边巨字 / 跑马灯 / 黑终端块 / 大数字面板 / 时间轴）、必做交互清单（滚动进度、揭示动画、数字计数、可重播演示流）、禁忌清单，以及 Bun.WebView 自检脚本。用户说「做个宣传页 / 效果页 / 落地页 / 做得酷一点 / 新粗野主义 / 粗野风」时用。
---

# neo-brutalist-page · 新粗野主义单文件页面

## 什么时候用

- 产品/能力**宣传页、落地页、showcase**；
- 要给用户看的**数据报告页**（行情、审计、复盘）想做得有冲击力；
- 用户点名「新粗野主义 / 粗野风 / neo-brutalism / 做得酷一点」；
- 需要**单文件 HTML、零依赖、断网可开**的任何视觉页。

不适用：需要真实后端交互的表单页、打印用 A4 报告（改用简洁排印风）。

## 风格归属（先认清楚再做）

**新粗野主义 / Neo-Brutalism**（也叫 digital brutalism、swiss-punk 商业变体）。来源是建筑粗野主义 + 90 年代网页 + 瑞士国际主义网格的混血：

| 特征 | 做法 |
| --- | --- |
| 元件「有实体」 | 3px 纯黑描边、**无模糊**硬阴影（`8px 8px 0 #111`）、零圆角 |
| 大字报 | Impact / Arial Black 类压缩字体，`clamp()` 到 150px+，行高 0.9 左右 |
| 纸感底 | 米白纸色 + 细网格线（放射渐变造格），不是纯白也不加模糊 |
| 撞色 | 一个高饱和主色（橘红）+ 一个荧光色（柠檬绿）+ 一个电蓝，**只做块面不用渐变** |
| 小字条码化 | mono 字体、11–13px、`letter-spacing:.14em`、全大写，当标签/编号用 |
| 贴纸感 | 元素轻微 `rotate(-1deg~-2deg)`，像贴上去的 |
| 反 SaaS | 禁止毛玻璃、紫色渐变、圆角胶囊、发光投影 |

## 硬性 token（照抄，别自创）

```css
:root{
  --ink:#111111; --paper:#f4f1e8; --white:#fff;
  --accent:#ff4a1c; --blue:#1f4bff; --lime:#d8ff3e;
  --line:3px solid var(--ink);
  --shadow:8px 8px 0 var(--ink);
  --shadow-sm:5px 5px 0 var(--ink);
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --sans:"Helvetica Neue",Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  --heavy:Impact,"Haettenschweiler","Arial Narrow Bold","PingFang SC",sans-serif; /* 中文会回落到黑体，仍够重 */
}
```

暗色区（首尾各一段即可，别全站黑）用 `--ink` 当底、`--paper` 当字，靠近黑不反光。

## 页面骨架（顺序就是叙事）

1. **Hero**：巨字标题（2 行，第二行做成撞色块 + 轻微旋转，别和上一行压叠）+ 一段「一句话说清是什么」+ 黑底终端块回放真实动作 + 2 个按钮（主色实心 / 白底描边）。
2. **跑马灯**：mono 大写能力词横滚，`animation:slide 26s linear infinite`，`aria-hidden`。
3. **大数字面板**：4 格，数字来自真实数据（会话数、消息数、条目数……），滚动到视口才计数。
4. **能力格**：2×2 或 3×N 卡，每卡 = 编号小标签 + 粗标题 + 2–3 行说明 + 底部 mono 标签。hover 位移 `translate(-3px,-3px)` + 阴影变大。
5. **现场演示区（页面的心脏）**：左栏一个伪聊天流，把一次真实任务**逐步回放**成工具调用卡（`run_shell` / `fetch_url` / `write_file` / `mark_deliverable`），右栏「为什么这算做完了」拆解。提供**重播**与**直接看结果**两个按钮。
6. **清单/时间轴**：技能格（3 列）；无人值守流水线用竖线 + 圆点时间轴 + mono 时间戳。
7. **运行时**：暗色区三张卡（解释底层能跑什么）。
8. **收尾 CTA**：荧光色满屏块 + 白底巨字 + 一句「把它关掉，它就什么都不是」这类反讽收束。

## 必做交互（缺一个就只是张静态图）

- 顶部**滚动进度条**（2–5px，主色，`width = scrollY/(h-innerHeight)`)；
- `.reveal` + `IntersectionObserver`：`translateY(18px)`→0，`unshake 200ms` 之类快速缓动，**不要 0.6s 慢淡入**（粗野风要"啪"地出现）；
- 数字计数（IO 触发一次，缓动到目标值，用 `padStart` 保留格式）；
- 演示流：`await sleep()` 串起来的分步 append + 打字机；`IntersectionObserver` 进视口自动播一次，重播按钮重置；
- hover 位移 + 阴影加粗；按钮按下 `translate(3px,3px)` 阴影收掉（"压下去"）；
- `@media (prefers-reduced-motion:reduce)` 全部动画归零、演示直接呈现终态；
- 键盘可达：所有可点元素是真 `<button>`/`<a>`，`:focus-visible` 给 `outline:3px solid var(--blue)`。

## 内容纪律

- **数字和动词必须是真的**：能查到就查（`sqlite3`、行情接口、`ls`），查不到就别编。
- 每条能力配**一个具体例子**（"30 天连续使用 / 1,284 条消息 / 46 条长期记忆" 胜过 "高效管理"）。
- 中文标题走"短句 + 顿开"，第二行用撞色块承接（"它能 / 干什么"、"四只手 / 不是一张嘴"）。
- 写完后页面上留一句**元信息**（"这页本身就是它做的"），是最有说服力的一句。

## 自检（必须做，不许"看着还行"）

```bash
bun run <技能目录>/scripts/selfcheck.ts <页面路径> [端口]
```

它会：起本地 HTTP 服务 → Bun.WebView 打开 → 收 `window.onerror` → 断言关键区块/卡片数量/无横向溢出 → 点击重播与"直接看结果"验证交互 → 桌面与窄屏各截若干段图到**页面同目录**的 `shots/`（仓库里已 gitignore；页面随项目提交时记得排除它，或把截图挪进 `scratch/`）。
若沙箱里起不来浏览器守护进程，就用这个 Bun 方案；做完把截图逐张看一遍，别只看退出码。

## 参考实例

`reference/showcase.html` —— 一个完整的、按本技能做出来的产品宣传页（796 行，CSS/JS 全在里面）。**要抄就抄它**：token、卡片、终端块、演示流、计数、进度条都在。遇到本技能没写到的细节，去那儿找。

## 相关技能

- **`web-style-skins`**：同一份 DOM 换多套皮肤的框架，另给两套已验证的邻近风格（终端/CRT 荧光屏、瑞士国际主义排版）。需要**多风格对比**、或用户嫌粗野主义太吵、要"冷一点/规整一点"的风格时去那个技能；粗野主义的配色与组件配方以本技能为准。

## 交付

产物写进**项目原有的结构**里：页面归项目既有的页面目录、说明文档归 `docs/`，跟该仓库的惯例走。

**不要新建日期目录**（`2026-10-27/` 这种），也别把交付物塞进 `scratch/`——`scratch/` 只放验证/调试用的临时脚本与中间产物。
