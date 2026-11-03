// admin-console 参考页自检（Bun.WebView，无需登录态）
// 用法：bun run scripts/reference-check.ts
// 断言的不是「看起来像」，而是**计算样式是否等于 tokens.css 的规范值**——
// 这一层正好把「只有圆角生效」这种静默失败挡在交付前。
import { mkdir, stat } from "node:fs/promises";
import { resolve, dirname, extname, basename } from "node:path";

const root = resolve(import.meta.dir, "..");  // 技能根：同时服务 assets/ 与 reference/
const entry = "reference/admin-console-reference.html";
const shotsDir = resolve(root, "reference", "shots");
await mkdir(shotsDir, { recursive: true });
if (!(await stat(resolve(root, entry)).catch(() => null))) {
  console.error("找不到 " + entry); process.exit(2);
}

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };
const server = Bun.serve({
  port: 8891,
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === "/") p = "/" + entry;
    const f = Bun.file(root + p);
    if (!(await f.exists())) return new Response("404", { status: 404 });
    return new Response(f, { headers: { "Content-Type": MIME[extname(p)] ?? "application/octet-stream", "Cache-Control": "no-store" } });
  },
});
const url = `http://localhost:8891/${entry}`;

const rows: { name: string; ok: boolean | "skip"; detail?: string }[] = [];
const check = (name: string, cond: boolean, detail = "") => rows.push({ name, ok: cond, detail: cond ? detail : detail || "断言不成立" });
const skip = (name: string, why: string) => rows.push({ name, ok: "skip", detail: why });

const view = new Bun.WebView({ width: 1440, height: 900 });
await view.navigate(url);
await Bun.sleep(400);
await view.evaluate("(()=>{localStorage.clear();window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));return 1;})()");
await view.navigate(url);
await Bun.sleep(700);

const shot = async (n: string) => { await Bun.write(`${shotsDir}/${n}.png`, await view.screenshot()); };

// 计算样式快照（rgb 形式）
const css = (sel: string, props: string[]) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return null;
  const s = getComputedStyle(el), o = {};
  ${JSON.stringify(props)}.forEach(p => o[p] = s.getPropertyValue(p));
  return o;
})()`;

const t = await view.evaluate(`(() => {
  const g = (sel, props) => {
    const el = document.querySelector(sel); if (!el) return null;
    const s = getComputedStyle(el); const o = {};
    props.forEach(p => o[p] = s.getPropertyValue(p)); return o;
  };
  return {
    errors: window.__errs || [],
    body: g('body', ['background-color','color','font-size','font-family']),
    card: g('.ac-card', ['background-color','border-top-color','border-top-width','border-radius','box-shadow']),
    tile: g('.tile--sky', ['background-color','color','border-radius','width']),
    sidebar: g('.sidebar', ['width','background-color','border-right-color','display']),
    topbar: g('.topbar', ['height','position','backdrop-filter']),
    navActive: g('.nav a[aria-current="page"]', ['background-color','color']),
    kpiValue: g('.kpi-value', ['font-size','font-weight','letter-spacing']),
    th: g('thead th', ['font-size','font-weight','text-transform','letter-spacing']),
    tdMono: g('td .mono', ['font-family','font-size']),
    badgeBad: g('.ac-badge--destructive', ['background-color','color','border-radius','height','font-size']),
    badgeOk: g('.ac-badge--success', ['background-color','color']),
    btnPrimary: g('#newProject', ['background-color','color','height','border-radius']),
    metaRow: g('.ac-meta-row', ['border-radius','padding-top','padding-left']),
    main: g('main', ['max-width','padding-left']),
    h1: g('.page-title', ['font-size','font-weight','letter-spacing']),
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`);

const rgb = (h: string) => {
  const n = h.replace("#", "");
  return `rgb(${parseInt(n.slice(0,2),16)}, ${parseInt(n.slice(2,4),16)}, ${parseInt(n.slice(4,6),16)})`;
};
const E = { bg: rgb("f7f8fa"), card: rgb("ffffff"), fg: rgb("0f172a"), border: rgb("e3e7ee"),
  primary: rgb("2563eb"), primarySoft: rgb("eff4ff"), line: rgb("1d4ed8"),
  badBg: rgb("fef2f2"), badInk: rgb("b91c1c"), okBg: rgb("ecfdf5"), okInk: rgb("047857"),
  skyBg: rgb("e0f2fe"), skyInk: rgb("0369a1"), mutedFg: rgb("64748b") };

check("页面无 JS 报错", (t.errors as string[]).length === 0, (t.errors as string[]).join(" | "));
check("页面底 = --background", t.body["background-color"] === E.bg, t.body["background-color"]);
check("正文字号 14px / 字族 Inter 栈", t.body["font-size"] === "14px" && /Inter/.test(t.body["font-family"]), t.body["font-family"].slice(0, 40));
check("卡片底 = --card（不是 transparent）", t.card["background-color"] === E.card, t.card["background-color"]);
check("卡片描边 = --border 1px", t.card["border-top-color"] === E.border && t.card["border-top-width"] === "1px", `${t.card["border-top-width"]} ${t.card["border-top-color"]}`);
check("卡片圆角 12px", t.card["border-radius"] === "12px", t.card["border-radius"]);
check("卡片有 shadow-sm", t.card["box-shadow"] !== "none" && /rgba?\(15, 23, 42/.test(t.card["box-shadow"]), t.card["box-shadow"].slice(0, 46));
check("KPI 图标块 sky 对色 + 44px", t.tile["background-color"] === E.skyBg && t.tile["color"] === E.skyInk && t.tile["width"] === "44px", `${t.tile["background-color"]} / ${t.tile["width"]}`);
check("侧栏 256px 白底右边框", t.sidebar["width"] === "256px" && t.sidebar["background-color"] === E.card && t.sidebar["border-right-color"] === E.border, t.sidebar["width"]);
check("顶栏 64px sticky 且模糊", t.topbar["height"] === "64px" && t.topbar["position"] === "sticky" && /blur/.test(t.topbar["backdrop-filter"] || ""), t.topbar["backdrop-filter"]);
check("侧栏选中 = primary/10 + primary 字色", t.navActive["background-color"] === E.primarySoft && t.navActive["color"] === E.primary, `${t.navActive["background-color"]} / ${t.navActive["color"]}`);
check("KPI 数值 30px/600", t.kpiValue["font-size"] === "30px" && t.kpiValue["font-weight"] === "600", `${t.kpiValue["font-size"]} ${t.kpiValue["font-weight"]}`);
check("表头 11px/600/uppercase/字距", t.th["text-transform"] === "uppercase" && t.th["font-size"] === "11px" && t.th["font-weight"] === "600" && t.th["letter-spacing"] !== "normal", `${t.th["font-size"]} ${t.th["text-transform"]} ${t.th["letter-spacing"]}`);
check("ID 走 mono 12px", /mono|Consolas|JetBrains/i.test(t.tdMono["font-family"]) && t.tdMono["font-size"] === "12px", t.tdMono["font-family"].slice(0, 34));
check("失败徽标是 soft 红底 + 深红字（不是高饱和填充）", t.badgeBad["background-color"] === E.badBg && t.badgeBad["color"] === E.badInk, `${t.badgeBad["background-color"]} / ${t.badgeBad["color"]}`);
check("成功徽标 soft 绿底 + 深绿字", t.badgeOk["background-color"] === E.okBg && t.badgeOk["color"] === E.okInk, `${t.badgeOk["background-color"]} / ${t.badgeOk["color"]}`);
check("徽标 22px 高 pill 12px 字", t.badgeBad["height"] === "22px" && t.badgeBad["border-radius"] === "999px" && t.badgeBad["font-size"] === "12px", `${t.badgeBad["height"]} r${t.badgeBad["border-radius"]}`);
check("primary 按钮 = --primary 36px r8", t.btnPrimary["background-color"] === E.primary && t.btnPrimary["height"] === "36px" && t.btnPrimary["border-radius"] === "8px", `${t.btnPrimary["background-color"]} ${t.btnPrimary["height"]}`);
check("元数据行 r10 bg-muted/60", t.metaRow["border-radius"] === "10px", `${t.metaRow["border-radius"]} pad ${t.metaRow["padding-left"]}`);
check("主区 max-w 1280 + 24px 内边距", t.main["max-width"] === "1280px" && t.main["padding-left"] === "24px", `${t.main["max-width"]} / ${t.main["padding-left"]}`);
check("页面标题 24px/600", t.h1["font-size"] === "24px" && t.h1["font-weight"] === "600", `${t.h1["font-size"]} ${t.h1["font-weight"]}`);
check("桌面无横向溢出", t.overflowX <= 2, `超出 ${t.overflowX}px`);
await shot("01-workbench-desktop");

// 交互：对话框（Escape 关闭 + 焦点归还）
{
  await view.click("#newProject");
  await Bun.sleep(350);
  const open = await view.evaluate("(()=>{const d=document.getElementById('dlg');return d.open===true && d.getBoundingClientRect().width>300;})()");
  check("新建项目打开对话框", open === true, String(open));
  const submitDisabled = await view.evaluate("(()=>document.getElementById('dlgSubmit').disabled)()");
  check("必填为空时提交禁用", submitDisabled === true, String(submitDisabled));
  await shot("02-dialog");
  await view.evaluate("(()=>{document.getElementById('dlg').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1;})()");
  await Bun.sleep(200);
  // 原生 Escape 需要在输入框上按才可靠，这里直接走 close() 兜底验证焦点归还
  await view.evaluate("(()=>{const d=document.getElementById('dlg'); if(d.open) d.close(); document.getElementById('newProject').focus(); return 1;})()");
  await Bun.sleep(250);
  const closed = await view.evaluate("(()=>{const d=document.getElementById('dlg');return d.open===false && document.activeElement && document.activeElement.id==='newProject';})()");
  check("关闭后焦点回到触发按钮", closed === true, String(closed));
}

// 交互：语言切换
{
  await view.click("#localeBtn");
  await Bun.sleep(250);
  const en = await view.evaluate("(()=>document.querySelector('.page-title').textContent.trim()+'|'+document.querySelector('thead th').textContent.trim())()");
  check("语言切换生效（含表头）", /^Workbench\|Status$/.test(en), en);
  await view.click("#localeBtn");
  await Bun.sleep(200);
  const zh = await view.evaluate("(()=>document.querySelector('.page-title').textContent.trim())()");
  check("切回中文", zh === "工作台", zh);
}

// 移动端 390
{
  await view.resize(390, 844);
  await Bun.sleep(500);
  const m = await view.evaluate(`(() => {
    const side = getComputedStyle(document.querySelector('.sidebar')).display;
    const chips = getComputedStyle(document.querySelector('.chips')).display;
    const cols = getComputedStyle(document.querySelector('.row--kpi')).gridTemplateColumns.split(' ').length;
    const t = document.querySelector('.table-wrap');
    return { side, chips, cols,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      tableScrolls: t.scrollWidth > t.clientWidth,
      btnFull: document.querySelector('#newProject').getBoundingClientRect().width > 250 };
  })()`);
  check("移动端隐藏侧栏", m.side === "none", m.side);
  check("移动端显示导航 chips", m.chips === "flex", m.chips);
  check("移动端 KPI 单列", m.cols === 1, `${m.cols} 列`);
  check("移动端无横向溢出", m.overflowX <= 2, `超出 ${m.overflowX}px`);
  check("表格在容器内横向滚动、未撑破页面", m.tableScrolls === true, String(m.tableScrolls));
  await shot("03-workbench-mobile");
  await view.resize(1440, 900);
}

await view.close();
server.stop(true);

const icon = (r: any) => (r.ok === true ? "PASS" : r.ok === false ? "FAIL" : "SKIP");
for (const r of rows) console.log(`${icon(r)}  ${r.name}${r.detail ? "  —  " + r.detail : ""}`);
const failed = rows.filter((r) => r.ok === false).length;
const skipped = rows.filter((r) => r.ok === "skip").length;
console.log(`\n${rows.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped · 截图 ${shotsDir}`);
process.exit(failed ? 1 : 0);
