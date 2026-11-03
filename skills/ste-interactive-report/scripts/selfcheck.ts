// ste-interactive-report 自检脚本（Bun.WebView，无需登录态、不依赖 bsk）
//
// 用法：
//   bun run selfcheck.ts <报告路径> [端口] [--width 1440]
//
// 验的东西（断言按元素存在性自动跳过，同一脚本也能验别的报告页）：
//   1 无 JS 报错、SVG 图表确实渲染出来
//   2 桌面无横向溢出、正文/表格/标题无文字被切
//   3 步数对齐：.step 数量 = 导航 chip 数量，每个 chip 指向的 section 存在
//   4 版式对齐：每个 .step 的 h2 与正文块左边缘一致（±4px）——本技能最常翻车的点
//   5 chip 跳转：点第 3 个 chip 会滚动到位、且该 chip 进入激活态
//   6 折叠模式：点 #briefbtn 隐藏 .step.detail；再点恢复
//   7 滑块：改 range 值后 .big 数值变化
//   8 情景卡：点第 2 张后它获得 .on
//   9 清单：勾第一项后进度计数变化
//  10 窄屏 420 无横向溢出
//  11 截图：桌面 5 段 + 窄屏 1 段 → 页面同目录 shots/
// 退出码：0 全通过；1 有问题；2 用法错

import { mkdir } from "node:fs/promises";
import { resolve, dirname, extname, basename } from "node:path";
import { statSync } from "node:fs";

const argv = process.argv.slice(2);
const target = argv[0];
if (!target) {
  console.error("用法：bun run selfcheck.ts <报告路径> [端口] [--width 1440]");
  process.exit(2);
}
let port = 8820, width = 1440;
for (let i = 1; i < argv.length; i++) {
  if (argv[i] === "--width") width = Number(argv[++i]);
  else if (/^\d+$/.test(argv[i])) port = Number(argv[i]);
}

const abs = resolve(target);
if (!statSync(abs, { throwIfNoEntry: false })) { console.error(`找不到：${abs}`); process.exit(2); }
const root = dirname(abs), entry = basename(abs);
const shotsDir = resolve(root, "shots");
await mkdir(shotsDir, { recursive: true });

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
};
const server = Bun.serve({
  port,
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === "/") p = "/" + entry;
    const f = Bun.file(root + p);
    if (!(await f.exists())) return new Response("404", { status: 404 });
    return new Response(f, { headers: { "Content-Type": MIME[extname(p)] ?? "application/octet-stream", "Cache-Control": "no-store" } });
  },
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let fail = 0;
const pass: string[] = [];
const bad = (msg: string) => { fail++; console.log("  ✗ " + msg); };
const ok = (msg: string) => { pass.push(msg); };

const view = new Bun.WebView({ width, height: 950 });
try {
  await view.navigate(`http://127.0.0.1:${server.port}/${entry}`);
  await sleep(900);
  await view.evaluate(`(()=>{window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));
    window.addEventListener('unhandledrejection',e=>window.__errs.push('reject:'+e.reason));
    document.documentElement.style.scrollBehavior='auto';return 1})()`);

  // 1 · 报错 + 图表渲染
  const RT = JSON.parse(await view.evaluate(`(()=>JSON.stringify({
    errs:(window.__errs||[]).slice(0,5),
    svgs:[...document.querySelectorAll('svg')].map(s=>s.childElementCount)}))()`));
  RT.errs.length ? bad("JS 报错：" + RT.errs.join(" | ")) : ok("无 JS 报错");
  if (RT.svgs.length && RT.svgs.some((n: number) => n < 8)) bad("有 SVG 图表没渲染出内容（childElementCount 过小）");
  else if (RT.svgs.length) ok("图表已渲染");

  // 2 · 溢出与被切
  const L = JSON.parse(await view.evaluate(`(()=>{const cut=[];
    document.querySelectorAll('h1,h2,h3,p,li,td,th').forEach(el=>{
      if(el.scrollWidth>el.clientWidth+2 && getComputedStyle(el).overflowX!=='auto') cut.push((el.tagName+'.'+(el.className||'')).slice(0,40));});
    return JSON.stringify({docW:document.documentElement.scrollWidth,winW:window.innerWidth,cut:cut.slice(0,6)})})()`));
  L.docW > L.winW + 1 ? bad(`桌面横向溢出 ${L.docW} > ${L.winW}`) : ok("桌面无横向溢出");
  L.cut.length ? bad("文字被切：" + L.cut.join(", ")) : ok("无文字被切");

  // 3 · 步数与 chip 对应
  const S = JSON.parse(await view.evaluate(`(()=>{const secs=[...document.querySelectorAll('.step')];
    const chips=[...document.querySelectorAll('.chip')];
    return JSON.stringify({steps:secs.length,chips:chips.length,
      dead:chips.filter(c=>!document.querySelector('#'+CSS.escape(c.dataset.t||'x'))).map(c=>c.dataset.t)})})()`));
  if (S.steps < 5) bad(`步骤过少：${S.steps}（本技能要求 7 步，至少 5 步）`);
  else ok(`步数 ${S.steps}`);
  S.chips !== S.steps ? bad(`导航 ${S.chips} 个 chip ≠ ${S.steps} 个 section（编号会错位）`) : ok("chip 与 section 一一对应");
  S.dead.length ? bad("chip 指向不存在的 section：" + S.dead.join(",")) : ok("chip 目标均存在");

  // 4 · 版式对齐：h2 与正文块左边缘
  const A = JSON.parse(await view.evaluate(`(()=>{const out=[];
    document.querySelectorAll('.step').forEach(sec=>{
      const h=sec.querySelector('h2'); if(!h) return;
      const body=sec.querySelector('.tscroll,table,.cards,.lab,p');
      if(!body) return;
      const d=Math.round(body.getBoundingClientRect().left-h.getBoundingClientRect().left);
      if(Math.abs(d)>4) out.push((sec.id||'?')+' 偏 '+d+'px');});
    return JSON.stringify(out)})()`));
  A.length ? bad("标题与正文左边缘不齐：" + A.join("; ")) : ok("各步标题与正文对齐");

  // 5 · chip 跳转
  const C = JSON.parse(await view.evaluate(`(()=>{const chips=[...document.querySelectorAll('.chip')];
    if(chips.length<3) return JSON.stringify({skip:1});
    chips[2].click(); return 1})()`) && "{}");
  await sleep(700);
  const J = JSON.parse(await view.evaluate(`(()=>{const chips=[...document.querySelectorAll('.chip')];
    const t=document.querySelector('#'+CSS.escape(chips[2].dataset.t));
    return JSON.stringify({top:Math.round(t.getBoundingClientRect().top),
      active:chips[2].classList.contains('on')||chips[2].getAttribute('aria-current')==='true'||/on|active/.test(chips[2].className)})})()`));
  Math.abs(J.top) > 160 ? bad(`点 chip 后目标 section 未到位（top=${J.top}，检查 scroll-margin-top）`) : ok("chip 跳转到位");
  J.active ? ok("chip 激活态正常") : bad("点 chip 后没有激活态");

  // 6 · 折叠模式
  const hasBrief = await view.evaluate(`(()=>!!document.querySelector('#briefbtn'))()`);
  if (hasBrief) {
    await view.evaluate(`(()=>{document.querySelector('#briefbtn').click();return 1})()`);
    await sleep(400);
    const B1 = JSON.parse(await view.evaluate(`(()=>JSON.stringify({
      cls:document.body.classList.contains('brief'),
      shownDetail:[...document.querySelectorAll('.step.detail')].filter(e=>e.offsetParent!==null).length,
      dim:[...document.querySelectorAll('.chip')].filter(c=>Number(getComputedStyle(c).opacity)<0.7).length}))()`));
    B1.cls ? ok("折叠模式生效") : bad("点 #briefbtn 后 body 未进入 brief 态");
    B1.shownDetail > 0 ? bad(`折叠时仍有 ${B1.shownDetail} 个 .detail 段可见`) : ok("折叠时 detail 段已隐藏");
    if (B1.shownDetail === 0 && B1.dim === 0) bad("折叠时被隐藏步骤的 chip 没有变灰（读者会以为点坏了）");
    await view.evaluate(`(()=>{document.querySelector('#briefbtn').click();return 1})()`);
    await sleep(400);
    const B2 = await view.evaluate(`(()=>document.body.classList.contains('brief'))()`);
    B2 ? bad("再点 #briefbtn 未恢复") : ok("折叠模式可恢复");
  }

  // 7 · 滑块联动
  const hasRange = await view.evaluate(`(()=>!!document.querySelector('input[type=range]'))()`);
  if (hasRange) {
    const before = await view.evaluate(`(()=>{const b=document.querySelector('.lab .big');return b?b.textContent.trim():''})()`);
    await view.evaluate(`(()=>{const r=document.querySelector('input[type=range]');r.value=String(Number(r.max)-1);
      r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`);
    await sleep(300);
    const after = await view.evaluate(`(()=>{const b=document.querySelector('.lab .big');return b?b.textContent.trim():''})()`);
    before && after && before !== after ? ok("滑块联动正常") : bad(`滑块未联动（${before} → ${after}）`);
  }

  // 8 · 情景卡
  const scens = await view.evaluate(`(()=>document.querySelectorAll('.scen').length)()`);
  if (scens >= 2) {
    await view.evaluate(`(()=>{document.querySelectorAll('.scen')[1].click();return 1})()`);
    await sleep(250);
    const on = await view.evaluate(`(()=>document.querySelectorAll('.scen')[1].classList.contains('on'))()`);
    on ? ok("情景卡可选中") : bad("点情景卡没有选中态");
  }

  // 9 · 清单
  const chks = await view.evaluate(`(()=>document.querySelectorAll('.chk').length)()`);
  if (chks >= 2) {
    const c0 = await view.evaluate(`(()=>{const e=document.querySelector('.chkbar');return e?e.textContent.replace(/\\s+/g,' ').trim():''})()`);
    await view.evaluate(`(()=>{const c=document.querySelector('.chk');c.click();return 1})()`);
    await sleep(250);
    const c1 = await view.evaluate(`(()=>{const e=document.querySelector('.chkbar');return e?e.textContent.replace(/\\s+/g,' ').trim():''})()`);
    c1 !== c0 ? ok("清单进度计数正常") : bad(`清单计数未变化（${c0}）`);
  }

  // 10 · 截图
  const H: number = await view.evaluate(`(()=>document.documentElement.scrollHeight)()`);
  for (let i = 0; i < 5; i++) {
    await view.evaluate(`(()=>{window.scrollTo(0,${Math.round((H - 950) * (i / 5))});return 1})()`);
    await sleep(320);
    await Bun.write(`${shotsDir}/desktop-${i}.png`, await view.screenshot());
  }
  // @ts-ignore 窄屏
  await view.resize?.(420, 900);
  await sleep(600);
  await view.evaluate(`(()=>{window.scrollTo(0,0);return 1})()`);
  await sleep(300);
  await Bun.write(`${shotsDir}/mobile-0.png`, await view.screenshot());
  const M = JSON.parse(await view.evaluate(`(()=>JSON.stringify({docW:document.documentElement.scrollWidth,winW:window.innerWidth}))()`));
  M.docW > M.winW + 1 ? bad(`窄屏横向溢出 ${M.docW} > ${M.winW}`) : ok("窄屏无横向溢出");

  const errs = await view.evaluate(`(()=>(window.__errs||[]).slice(0,5))()`);
  if (Array.isArray(errs) && errs.length) bad("交互过程中报错：" + errs.join(" | "));
} finally {
  view.close();
  server.stop(true);
}

console.log(fail === 0 ? `\n✓ 全部通过（${pass.length} 项）` : `\n✗ ${fail} 项未通过，${pass.length} 项通过`);
process.exit(fail === 0 ? 0 : 1);
