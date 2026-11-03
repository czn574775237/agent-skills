// web-style-skins 自检脚本（Bun.WebView，无需登录态、不依赖 bsk）
//
// 用法：
//   bun run skins-check.ts <页面路径> [端口] [选项]
//   bun run skins-check.ts reference/styles-four-skins.html 8823
//   bun run skins-check.ts page.html 8823 --cell ".cell" --theme-btn ".skin-theme" --key 3
//
// 选项（都有默认值，默认值对应本技能参考实例的 class 命名）：
//   --cell <sel>       一个皮肤格的容器选择器，需带 data-skin 与 data-theme      默认 [data-skin]
//   --theme-btn <sel>  格内主题按钮（格内相对），点击后该格 data-theme 取反        默认 .skin-theme
//   --all-dark <sel>   全局「全深色」按钮                                         默认 #allDark
//   --all-light <sel>  全局「全浅色」按钮                                         默认 #allLight
//   --grid <sel>       回到网格模式按钮                                           默认 #mGrid
//   --single <sel>     进入单屏模式按钮                                           默认 #mSingle
//   --pick <sel>       进入单屏的另一个入口（点格标签栏），可省                    默认 .cellbar .nm
//   --key <k>          单屏下按哪个键切格，验证键盘切换，可省                     默认 3
//   --width/--height   桌面视口尺寸                                               1440×900
//
// 做的事：起本地 HTTP 服务 → 打开页面 → 抓 JS 报错 → 断言
//   ① 至少两格皮肤、每格都有 data-skin/data-theme
//   ② 全局全深色 / 全浅色 能把所有格切过去
//   ③ 格内主题按钮只影响自己那一格
//   ④ 单屏模式只剩一格可见，键盘能换格
//   ⑤ 刷新后 模式 + 每格主题 仍然记得
//   ⑥ 无横向溢出、格内内容没被裁
//   → 桌面 + 窄屏分段截图到页面同目录的 shots/
// 退出码：0 全部通过；1 有 FAIL；2 用法或路径错误

import { mkdir, stat } from "node:fs/promises";
import { resolve, dirname, extname, basename } from "node:path";

const argv = process.argv.slice(2);
const target = argv[0];
if (!target) {
  console.error("用法：bun run skins-check.ts <页面路径> [端口] [--cell sel] [--theme-btn sel] ...");
  process.exit(2);
}

const opt = {
  cell: "[data-skin]",
  themeBtn: ".skin-theme",
  allDark: "#allDark",
  allLight: "#allLight",
  grid: "#mGrid",
  single: "#mSingle",
  pick: ".cellbar .nm",
  key: "3",
  port: 8823,
  width: 1440,
  height: 900,
};
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  const v = () => argv[++i];
  if (a === "--cell") opt.cell = v();
  else if (a === "--theme-btn") opt.themeBtn = v();
  else if (a === "--all-dark") opt.allDark = v();
  else if (a === "--all-light") opt.allLight = v();
  else if (a === "--grid") opt.grid = v();
  else if (a === "--single") opt.single = v();
  else if (a === "--pick") opt.pick = v();
  else if (a === "--key") opt.key = v();
  else if (a === "--width") opt.width = Number(v());
  else if (a === "--height") opt.height = Number(v());
  else if (/^\d+$/.test(a)) opt.port = Number(a);
  else console.warn(`忽略未知参数：${a}`);
}

const abs = resolve(target);
if (!(await stat(abs).catch(() => null))) {
  console.error(`找不到：${abs}`);
  process.exit(2);
}
const root = dirname(abs);
const entry = basename(abs);
const shotsDir = resolve(root, "shots");
await mkdir(shotsDir, { recursive: true });

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2",
};

const server = Bun.serve({
  port: opt.port,
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === "/") p = "/" + entry;
    const file = Bun.file(root + p);
    if (!(await file.exists())) return new Response("404", { status: 404 });
    return new Response(file, {
      headers: {
        "Content-Type": MIME[extname(p)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  },
});
const url = `http://localhost:${opt.port}/${entry}`;

// ---------- 断言收集 ----------
type Row = { name: string; ok: boolean | "skip"; detail?: string };
const rows: Row[] = [];
const pass = (name: string, detail?: string) => rows.push({ name, ok: true, detail });
const fail = (name: string, detail: string) => rows.push({ name, ok: false, detail });
const skip = (name: string, why: string) => rows.push({ name, ok: "skip", detail: why });
const check = (name: string, cond: boolean, detail = "") =>
  cond ? pass(name, detail) : fail(name, detail || "断言不成立");

const js = (s: string) => JSON.stringify(s);

const view = new Bun.WebView({ width: opt.width, height: opt.height });
const errors: string[] = [];
await view.navigate(url);
await Bun.sleep(500);
// 注意：Bun.WebView 的 evaluate 只接受**单个表达式**，多语句要包成 IIFE，否则报
// `SyntaxError: Unexpected token ';'. Expected ')' to end a compound expression.`
await view.evaluate(
  "(()=>{window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));localStorage.clear();return 1;})()",
);
await view.navigate(url);
await Bun.sleep(700);

const shot = async (name: string) => {
  await Bun.write(`${shotsDir}/${name}.png`, await view.screenshot());
};

// 读页面状态：全靠 data-* 与 computed style，不假设具体实现
const state = () =>
  view.evaluate(`(()=>{
  const cellSel=${js(opt.cell)}, btnSel=${js(opt.themeBtn)};
  const cells=[...document.querySelectorAll(cellSel)];
  const vis=cells.filter(c=>getComputedStyle(c).display!=='none'&&c.offsetParent!==null);
  return {
    errors: (window.__errs||[]).slice(),
    count: cells.length,
    themes: cells.map(c=>c.dataset.theme||''),
    skins: cells.map(c=>c.dataset.skin||''),
    visible: vis.length,
    activeSkin: (document.querySelector(cellSel+'.is-active')||{}).dataset?.skin||'',
    mode: document.documentElement.dataset.mode||(vis.length===cells.length?'grid':'single'),
    hasThemeBtn: cells.every(c=>!!c.querySelector(btnSel)),
    clip: cells.map(c=>{
      const s=c.querySelector('.stage')||c;
      return c.dataset.skin+':'+(s.scrollHeight>s.clientHeight+2?'CLIP '+s.scrollHeight+'/'+s.clientHeight:'ok');
    }).filter(x=>!x.endsWith('ok')),
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    stored: Object.keys(localStorage).length,
  };
})()`);

const s0 = await state();
check("页面无 JS 报错", (s0.errors as string[]).length === 0, (s0.errors as string[]).join(" | "));
check("至少两格皮肤", s0.count >= 2, `找到 ${s0.count} 格`);
check("每格都有 data-skin / data-theme", (s0.skins as string[]).every(Boolean) && (s0.themes as string[]).every(Boolean),
  JSON.stringify(s0.themes));
check("每格都有主题按钮", s0.hasThemeBtn, `选择器 ${opt.themeBtn}`);
check("首屏无横向溢出", s0.overflowX <= 2, `scrollWidth 超出 ${s0.overflowX}px`);
check("首屏格内无内容被裁", (s0.clip as string[]).length === 0, (s0.clip as string[]).join(", "));
await shot("01-grid-default");

// ② 全局全深色 / 全浅色
for (const [label, sel, want] of [
  ["全深色", opt.allDark, "dark"],
  ["全浅色", opt.allLight, "light"],
] as const) {
  const has = await view.evaluate(`!!document.querySelector(${js(sel)})`);
  if (!has) { skip(`全局「${label}」`, `页面上没有 ${sel}`); continue; }
  await view.click(sel);
  await Bun.sleep(450);
  const s = await state();
  check(`全局「${label}」作用于全部格`, (s.themes as string[]).every((t) => t === want),
    JSON.stringify(s.themes));
  if (want === "dark") await shot("02-grid-all-dark");
}
await view.click(opt.allLight);
await Bun.sleep(400);

// ③ 单格主题互不影响
{
  const before = (await state()).themes as string[];
  const target = `${opt.cell}:nth-of-type(2) ${opt.themeBtn}`;
  const has = await view.evaluate(`!!document.querySelector(${js(target)})`);
  if (!has) skip("格内主题按钮", `没找到 ${target}`);
  else {
    await view.click(target);
    await Bun.sleep(450);
    const after = (await state()).themes as string[];
    const flipped = after[1] !== before[1];
    const othersSame = after.every((t, i) => i === 1 || t === before[i]);
    check("格内按钮只翻自己那格", flipped && othersSame, `${before.join(",")} → ${after.join(",")}`);
    await shot("03-grid-mixed");
  }
}

// ④ 单屏模式 + 键盘换格
{
  const hasM = await view.evaluate(`!!document.querySelector(${js(opt.single)})`);
  if (!hasM) skip("单屏模式", `没找到 ${opt.single}`);
  else {
    await view.click(opt.single);
    await Bun.sleep(450);
    let s = await state();
    check("单屏只剩一格可见", s.visible === 1, `可见 ${s.visible} 格，mode=${s.mode}`);
    await shot("04-single");

    const pick = `${opt.cell}:nth-of-type(1) ${opt.pick}`;
    const hasPick = await view.evaluate(`!!document.querySelector(${js(pick)})`);
    if (hasPick) {
      await view.click(pick);
      await Bun.sleep(350);
      s = await state();
      check("点格标签栏可切换选中格", s.visible === 1, `可见 ${s.visible} 格`);
    } else skip("点格标签栏切换", `没找到 ${pick}`);

    if (opt.key) {
      const k = opt.key;
      const before = (await state()).activeSkin;
      await view.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:${js(k)},bubbles:true}))`);
      await Bun.sleep(300);
      const after = (await state()).activeSkin;
      if (!before && !after) skip(`按键 ${k} 换格`, "页面没有 .is-active 标记，无法判定");
      else check(`按键 ${k} 换格`, before !== after && s.visible === 1, `${before} → ${after}`);
      await shot("05-single-key");
    }
  }
}

// ⑤ 刷新后记忆
{
  const before = await state();
  await view.navigate(url);
  await Bun.sleep(650);
  const after = await state();
  const sameThemes = JSON.stringify(before.themes) === JSON.stringify(after.themes);
  const sameMode = before.mode === after.mode;
  const sameActive = before.activeSkin === after.activeSkin;
  check("刷新后每格主题仍记得", sameThemes, `${JSON.stringify(before.themes)} vs ${JSON.stringify(after.themes)}`);
  check("刷新后模式仍记得", sameMode, `${before.mode} vs ${after.mode}`);
  if (before.activeSkin) check("刷新后选中格仍记得", sameActive, `${before.activeSkin} vs ${after.activeSkin}`);
}

// ⑥ 窄屏
{
  await view.resize(430, 900);
  await view.evaluate(`document.querySelector(${js(opt.grid)})?.click()`);
  await Bun.sleep(600);
  const s = await state();
  check("窄屏无横向溢出", s.overflowX <= 2, `超出 ${s.overflowX}px`);
  check("窄屏格内无内容被裁", (s.clip as string[]).length === 0, (s.clip as string[]).join(", "));
  await shot("06-grid-mobile");
  await view.resize(opt.width, opt.height);
}

await view.close();
server.stop(true);

// ---------- 输出 ----------
const icon = (r: Row) => (r.ok === true ? "PASS" : r.ok === false ? "FAIL" : "SKIP");
for (const r of rows) {
  console.log(`${icon(r)}  ${r.name}${r.detail ? "  —  " + r.detail : ""}`);
}
const failed = rows.filter((r) => r.ok === false).length;
const skipped = rows.filter((r) => r.ok === "skip").length;
console.log(`\n${rows.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped · 截图 ${shotsDir}`);
process.exit(failed ? 1 : 0);
