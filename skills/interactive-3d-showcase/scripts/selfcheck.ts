// interactive-3d-showcase 自检脚本（Bun.WebView，无需登录态、不依赖 bsk）
//
// 用法：
//   bun run selfcheck.ts <页面路径> [端口] [--anim 动画名] [--click "#sel"] [--wait ms] [--width n]
//   bun run selfcheck.ts reference/showcase-3d-pipeline.html 8831 --anim Wave
//
// 做的事：起本地 HTTP 服务 → 真 Chrome（Bun.WebView）打开 → 抓 JS 报错
//        → 轮询等 model-viewer.loaded（最多 15s）→ 校验 GLB 能 200 拿到
//        → 断言 availableAnimations 里有预期动画 → 点播放按钮
//        → 断言无横向溢出 → 桌面 3 段 + 窄屏 2 段截图到页面同目录 shots/
// 退出码：0 全部通过；1 有问题（明细打在 stdout，截图仍会留下）
//
// 为什么不用 bsk Agent Window：它的标签页 visibilityState === "hidden"，rAF 不触发，
// model-viewer 的 loaded 永远 false —— 会误判成"模型坏了"。见 SKILL.md 错题卡 3。

import { mkdir } from "node:fs/promises";
import { resolve, dirname, extname, basename } from "node:path";
import { statSync } from "node:fs";

const argv = process.argv.slice(2);
const target = argv[0];
if (!target) {
  console.error("用法：bun run selfcheck.ts <页面路径> [端口] [--anim 名] [--click sel] [--wait ms] [--width n]");
  process.exit(2);
}
const clicks: string[] = [];
let port = 8830, waitMs = 800, width = 1440, expectedAnim = "";
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--click") clicks.push(argv[++i]);
  else if (a === "--anim") expectedAnim = argv[++i];
  else if (a === "--wait") waitMs = Number(argv[++i]);
  else if (a === "--width") width = Number(argv[++i]);
  else if (/^\d+$/.test(a)) port = Number(a);
}

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
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream", ".ktx2": "image/ktx2", ".hdr": "image/vnd.radiance",
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
const truthy = (v: unknown) => String(v).trim().toLowerCase().includes("true");

const view = new Bun.WebView({ width, height: 900 });
const shots: string[] = [];
try {
  await view.navigate(url);
  await sleep(waitMs);
  await view.evaluate(`(()=>{window.__errs=window.__errs||[];
    window.addEventListener('error',e=>window.__errs.push(String(e.message)));
    window.addEventListener('unhandledrejection',e=>window.__errs.push('reject:'+e.reason));
    document.documentElement.style.scrollBehavior='auto';return 1})()`);

  // 1) 元素与自定义元素是否注册
  report.setup = JSON.parse(await view.evaluate(`(()=>{
    const mv=document.querySelector('model-viewer');
    return JSON.stringify({hasViewer:!!mv, defined:!!customElements.get('model-viewer'),
      src:mv?mv.getAttribute('src'):null, vis:document.visibilityState})})()`));
  const S = report.setup as any;
  if (!S.hasViewer) bad("缺 model-viewer 元素", S);
  if (!S.defined) bad("model-viewer 未注册（CDN 没加载或离线）", S.defined);
  if (S.src && !/^(https?:)?\/\//.test(S.src) && !S.src.endsWith(".glb") && !S.src.endsWith(".gltf"))
    bad("src 不像模型文件", S.src);

  // 2) GLB 真的能拿到（比 loaded 更早暴露路径/MIME 问题）
  if (S.src) {
    const g = await fetch(new URL(S.src, url));
    const buf = await g.arrayBuffer();
    report.glb = { status: g.status, bytes: buf.byteLength, ct: g.headers.get("content-type") };
    if (g.status !== 200) bad("GLB 取不到", report.glb);
    else if (buf.byteLength < 1000) bad("GLB 过小", report.glb);
    const dv = new DataView(buf);
    const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
    if (magic !== "glTF") bad("GLB 头不是 glTF", magic);
  }

  // 3) 轮询等 loaded（渲染循环在跑才会 true）
  let loaded = false;
  for (let i = 0; i < 30; i++) {
    loaded = truthy(await view.evaluate(`(()=>{const mv=document.querySelector('model-viewer');return !!(mv&&mv.loaded)})()`));
    if (loaded) break;
    await sleep(500);
  }
  report.loaded = loaded;
  if (!loaded) bad("model-viewer 15s 内未 loaded（rAF 不跑 / GLB 解析失败 / 用了 file://）", loaded);

  // 4) 动画
  report.anims = JSON.parse(await view.evaluate(`(()=>{const mv=document.querySelector('model-viewer');
    return JSON.stringify({anims:(mv&&mv.availableAnimations)||[], hasPlay:!!document.querySelector('[data-play],.btn,#play')})})()`));
  const A = report.anims as any;
  if (expectedAnim && !A.anims.includes(expectedAnim))
    bad(`动画缺失：期望 ${expectedAnim}，实际 ${JSON.stringify(A.anims)}`, A.anims);

  // 5) 可选交互：点播放按钮，过一会儿确认没有报错、相机在动（近似验证）
  const toClick = clicks.length ? clicks : (A.hasPlay ? ["[data-play],.btn,#play"] : []);
  for (const sel of toClick) {
    const okSel = await view.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});
      if(!e)return 0; window.scrollTo(0,e.getBoundingClientRect().top+window.scrollY-120); return 1})()`);
    if (!okSel) { bad("选择器缺失", sel); continue; }
    await sleep(250);
    await view.click(sel);
    await sleep(waitMs);
  }

  // 6) 布局
  report.layout = JSON.parse(await view.evaluate(`(()=>{const out=[];
    document.querySelectorAll('h1,h2,h3,p,li,.step,.stat,.stage').forEach(el=>{
      if(el.scrollWidth>el.clientWidth+2) out.push((el.className||el.tagName)+' '+el.scrollWidth+'>'+el.clientWidth)});
    return JSON.stringify({docW:document.documentElement.scrollWidth,winW:window.innerWidth,
      overflow:out.slice(0,8), steps:document.querySelectorAll('.step').length,
      errs:(window.__errs||[]).slice(0,6)})})()`));
  const L = report.layout as any;
  if (L.docW > L.winW + 1) bad("横向溢出", `${L.docW} > ${L.winW}`);
  if (L.overflow.length) bad("文字被切", L.overflow);
  if (L.errs.length) bad("JS 报错", L.errs);

  // 7) 截图：桌面 3 段 + 窄屏 2 段
  const h: number = JSON.parse(await view.evaluate(`(()=>JSON.stringify({h:document.documentElement.scrollHeight}))()`)).h;
  for (const [i, fr] of [0, 0.45, 0.8].entries()) {
    await view.evaluate(`(()=>{window.scrollTo(0,${Math.round((h - 900) * fr)});return 1})()`);
    await sleep(450);
    const f = `${shotsDir}/desktop-${i}.png`;
    await Bun.write(f, await view.screenshot());
    shots.push(f);
  }
  // @ts-ignore 窄屏
  await view.resize?.(420, 900);
  await sleep(700);
  for (const [i, fr] of [0, 0.5].entries()) {
    await view.evaluate(`(()=>{window.scrollTo(0,${Math.round((h - 900) * fr)});return 1})()`);
    await sleep(450);
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
