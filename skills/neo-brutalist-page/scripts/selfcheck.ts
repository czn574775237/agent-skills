// neo-brutalist-page 自检脚本（Bun.WebView，无需登录态、不依赖 bsk）
//
// 用法：
//   bun run selfcheck.ts <页面路径或目录> [端口]
//   bun run selfcheck.ts page.html 8801 --click "#replay" --click "#skip" --wait 900
//
// 做的事：起本地 HTTP 服务 → 无缓存打开 → 抓 JS 报错 → 断言无横向溢出/无文字被切
//        → 点可选的选择器（自动滚进视口）→ 桌面 + 窄屏各截图到页面同目录的 shots/
// 退出码：0 全部通过；1 有问题（明细打在 stdout，截图仍会留下）

import { mkdir } from "node:fs/promises";
import { resolve, dirname, extname, basename } from "node:path";

const argv = process.argv.slice(2);
const target = argv[0];
if (!target) {
  console.error("用法：bun run selfcheck.ts <页面路径或目录> [端口] [--click <sel>] [--wait ms] [--width n]");
  process.exit(2);
}
const flags: string[] = [];
const clicks: string[] = [];
let port = 8800, waitMs = 700, width = 1440;
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--click") clicks.push(argv[++i]);
  else if (a === "--wait") waitMs = Number(argv[++i]);
  else if (a === "--width") width = Number(argv[++i]);
  else if (/^\d+$/.test(a)) port = Number(a);
  else flags.push(a);
}

import { statSync } from "node:fs";

const abs = resolve(target);
if (!statSync(abs, { throwIfNoEntry: false })) {
  console.error(`找不到：${abs}`);
  process.exit(2);
}
const isDir = statSync(abs).isDirectory();
const root = isDir ? abs : dirname(abs);
const entry = isDir ? null : basename(abs);
const shotsDir = resolve(dirname(abs), "shots");
await mkdir(shotsDir, { recursive: true });

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".ts": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
};

const server = Bun.serve({
  port,
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === "/") p = "/" + (entry ?? "index.html");
    const file = Bun.file(root + p);
    if (!(await file.exists())) return new Response("404", { status: 404 });
    return new Response(file, {
      headers: { "Content-Type": MIME[extname(p)] ?? "application/octet-stream", "Cache-Control": "no-store" },
    });
  },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const url = `http://127.0.0.1:${server.port}/${entry ?? ""}`;
const report: Record<string, unknown> = {};
let fail = 0;
const bad = (k: string, v: unknown) => { fail++; report[k] = v; };

const view = new Bun.WebView({ width, height: 900 });
try {
  await view.navigate(url);
  await sleep(waitMs);
  // 安装错误收集（页面加载阶段的错误抓不到，所以下面还要验证"JS 确实跑过"）
  await view.evaluate(`(()=>{window.__errs=window.__errs||[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__errs.push('reject:'+e.reason));document.documentElement.style.scrollBehavior='auto';return 1})()`);

  // 1) 布局：横向溢出与文字被切
  report.layout = JSON.parse(await view.evaluate(`(()=>{const out=[];
    document.querySelectorAll('h1,h2,h3,h4,p,li,td,.card,.skill,.stat').forEach(el=>{
      if(el.scrollWidth>el.clientWidth+2) out.push((el.className||el.tagName)+' '+el.scrollWidth+'>'+el.clientWidth);
    });
    return JSON.stringify({docW:document.documentElement.scrollWidth,winW:window.innerWidth,
      overflow:out.slice(0,8), secs:document.querySelectorAll('section').length,
      clicks:document.querySelectorAll('button,a[href^="#"],[role=button]').length})})()`));
  const L = report.layout as any;
  if (L.docW > L.winW + 1) bad("横向溢出", `${L.docW} > ${L.winW}`);
  if (L.overflow.length) bad("文字被切", L.overflow);
  if (L.secs < 4) bad("区块过少", L.secs);

  // 2) 揭示动画：滚一遍全页，看有没有元素停在未揭示状态
  const h: number = JSON.parse(await view.evaluate(`(()=>JSON.stringify({h:document.documentElement.scrollHeight,v:window.innerHeight}))()`)).h;
  for (let y = 0; y < h; y += 500) {
    await view.evaluate(`(()=>{window.scrollTo(0,${y});return 1})()`);
    await sleep(120);
  }
  await sleep(waitMs);

  // 3) 可选交互
  for (const sel of clicks) {
    const okSel = await view.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return 0;
      window.scrollTo(0,e.getBoundingClientRect().top+window.scrollY-120);return 1})()`);
    if (!okSel) { bad("选择器缺失", sel); continue; }
    await sleep(300);
    await view.click(sel);
    await sleep(waitMs);
  }

  // 4) 报错与"JS 是否真跑过"
  report.runtime = JSON.parse(await view.evaluate(`(()=>JSON.stringify({
    errs:(window.__errs||[]).slice(0,6),
    hidden:[...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).opacity==='0'&&e.getBoundingClientRect().height>40).length,
    nav:document.title.length}))()`));
  const R = report.runtime as any;
  if (R.errs.length) bad("JS 报错", R.errs);
  if (R.hidden > 3) bad("停在透明状态", R.hidden);

  // 5) 截图：桌面 6 段 + 窄屏 2 段
  const shots: string[] = [];
  const fracs = [0, 0.18, 0.36, 0.54, 0.72, 0.9];
  for (let i = 0; i < fracs.length; i++) {
    await view.evaluate(`(()=>{window.scrollTo(0,${Math.round((h - 900) * fracs[i])});return 1})()`);
    await sleep(380);
    const f = `${shotsDir}/desktop-${i}.png`;
    await Bun.write(f, await view.screenshot());
    shots.push(f);
  }
  // @ts-ignore 窄屏
  await view.resize?.(420, 900);
  await sleep(600);
  for (const [i, fr] of [0, 0.4].entries()) {
    await view.evaluate(`(()=>{window.scrollTo(0,${Math.round((h - 900) * fr)});return 1})()`);
    await sleep(380);
    const f = `${shotsDir}/mobile-${i}.png`;
    await Bun.write(f, await view.screenshot());
    shots.push(f);
  }
  report.shots = shots;
  report.pageH = h;
} finally {
  view.close();
  server.stop(true);
}

console.log(JSON.stringify(report, null, 2));
console.log(fail ? `\n✗ ${fail} 项有问题（截图已存 ${shotsDir}）` : `\n✓ 全部通过（截图 ${shotsDir}）`);
process.exit(fail ? 1 : 0);
