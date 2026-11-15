---
name: interactive-3d-showcase
description: 把 3D 模型做成能拖转、缩放、播放动画的单文件 HTML 展示页（暖纸色 + 衬线标题 + 陶土橙/青瓷绿点缀的「工作室」观感），并覆盖从零造资产的 Blender 管线：AI 经 MCP 控 Blender 建模、程序化几何、armature 蒙皮与循环动画、Cycles 出图、导出带骨骼的 GLB。含 token、页面骨架、model-viewer 配方、四张错题卡（GUI 渲染死锁、Agent Window 不跑 rAF、camera-orbit 拍成背面、发光材质的眼睛被吞进头里）与一个会断言「模型真的加载了」的 Bun.WebView 自检脚本。用户说「把模型放到网页上」「做个 3D 展示页」「3D 作品集页」「model-viewer」「Blender 出个模型做个页面」「这条推文里的 3D 流程复刻一下」时用。
---

# interactive-3d-showcase · 交互 3D 展示页 + Blender 资产管线

## 什么时候用

- 手上有一个 **GLB / glTF**，要让人在网页里**拖转、缩放、看动画**；
- 要**从零造一个 3D 资产**并发布：程序化建模 → 绑骨 → 动画 → 出图 → GLB → 页面；
- 用户拿一条「用 AI 做 3D」的推文/文章说「按这个做一版」，你要给出**能跑的实物**；
- 单文件、零构建、断网页面也行（CDN 可选内联）。

不适用：需要真实物理/后端的 3D 应用（改用 three.js 工程）、打印用的多视角转盘图（直接渲染序列帧）。

## 两条入口

| 你手上有什么 | 从哪开始 |
| --- | --- |
| 现成 GLB（Sketchfab / 生成服务 / 别人给的） | 直接跳到「页面」一节，`src="model.glb"` |
| 什么都没有 | 走「资产管线」一节，本技能自带脚本（`scripts/blender/`） |

---

## 一、资产管线：Blender → GLB

### 分工

**AI 经 MCP 控 Blender**（推文里的 Blender MCP），实操是三条事实：

1. addon 在 `--background` 下**拒绝起 server**（日志：`cannot start server in background mode - commands would never execute`）—— 必须开 GUI 模式：
   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender --python scripts/blender/start_mcp_server.py
   ```
2. 通道是 `127.0.0.1:9876`，协议就是 MCP server 对 addon 的那一层：
   ```json
   {"type":"execute_code","params":{"code":"<blender python>"}}
   // 成功 → {"status":"success","result":{"executed":true,"result":"<stdout>"}}
   // 失败 → {"status":"error","message":"<json traceback>"}
   ```
   `scripts/blender/mcp_client.py` 就是把指令文件发过去并打印 stdout 的客户端。
3. **GUI 模式下别在 execute_code 里跑渲染/导出**：addon 在 timer 回调里执行代码，`bpy.ops.render.render()` 会占住主线程把 MCP 通道一起堵死（实测 5 分钟无响应、客户端超时）。**渲染与导出改用 `--background` 重放同一批脚本**。

### 分步指令（AI 控 Blender 的骨架）

每条 cmd 是一次 execute_code，文件在 `scripts/blender/pipeline/`：

| 文件 | 干什么 | 验收 |
| --- | --- | --- |
| `cmd1_scene.py` | 清场、world、Cycles + Metal | 对象数归零 |
| `cmd2_body.py` | 程序化建模，每个部件带顶点组 | `len(objects)`、顶点数 |
| `cmd3_materials.py` | Principled 外壳 + Emission 发光件 | 材质名齐 |
| `cmd4_light_cam.py` | 三点光 + 相机（空物体 TRACK_TO） | 渲染能出图 |
| `cmd5_rig_anim.py` | armature 4 骨 + join + 蒙皮 + 循环动作 + WORKBENCH 验证帧 | `scene.frame_end=48`、action 名 |
| `cmd6_render_export.py` | Cycles 出图 + GLB 导出 | PNG 与 GLB 落盘 |

`headless_all.py` 用 `exec()` 依次重放上面 6 个文件，专供 `--background` 用：

```bash
Blender --background --python scripts/blender/pipeline/headless_all.py
```

### 建模要点（踩过的）

- **部件 → 顶点组 → join**：每个部件建完先 `vertex_groups.new(name="Root")` 并 range assign 全部顶点（权重 1），再 `bpy.ops.object.join()` 合成单 mesh。**别用自动权重**：程序化模型知道哪块该跟哪根骨，手动指定反而更稳。
- **bevel 要立刻 apply**：`export_apply` 与 armature 一起用容易出岔子，建完就 `bpy.ops.object.modifier_apply`。
- **胶囊/圆角柱**：`primitive_cylinder_add` + bevel 宽度 0.16 左右就够"Q 版机器人"的圆润度，不用凑两个半球。
- **发光件用独立 Emission 节点**（不进 Principled）：导出为 `KHR_materials_emissive_strength`，model-viewer 认。
- **姿态方向先验证再出正片**：动作做完立刻用 WORKBENCH 渲 3 帧（第 1/9/25 帧）输出到 `scratch/frames/`，肉眼看一眼挥手方向对不对，再切 Cycles。
- **眼睛/贴脸件会沉进头里**：球体贴到曲面球上，球冠突出通常只有 4–5mm，缩略图里等于没有。做法是把眼球的**球心放到头表面外**（本例 `y=-0.40` 而头表面 `y≈-0.378`），半径 0.10、y 向压到 0.55，露出 7mm 才读得出来。

### 出图参数（M4 / Blender 5.2 实测）

| 项 | 值 | 备注 |
| --- | --- | --- |
| 引擎 | Cycles + Metal | `scene.cycles.device='GPU'`，`prefs.compute_device_type='METAL'` |
| 分辨率 | 900×1100 | 竖构图适合两个轮子的机器人 |
| samples | 110–160 | 加 OIDN 去噪；64 会脏 |
| 耗时 | 约 5 分钟/张 | Metal headless 并不快，别按"几十秒"安排时间 |
| 色管 | AgX + `look='AgX - Medium High Contrast'` | AgX 压饱和，材质要比你以为的更饱和、更暗 |
| 灯光 | key 300W / fill 90W / rim 180W | 第一版用 420W 直接白成一片 |

导出 GLB：

```python
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB',
    use_selection=True,            # 只选 mesh + rig，别把地面/灯/相机带走
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_apply=False)            # armature modifier 不能 apply
```

---

## 二、页面：把模型放进「工作室」里

### 风格归属

**暖纸色工作室感**（不是赛博、不是粗野主义）：米白纸底 + 陶土橙作主色 + 青瓷绿作"已通"信号色，衬线标题 + 无衬线正文，卡片有细边与极浅投影。**先用它，再考虑变体**。

```css
:root{
  --paper:#f4efe6; --card:#fdfbf7;
  --ink:#2a2521; --ink-soft:#6b615a; --line:rgba(42,37,33,.12);
  --terra:#b85c38;   /* 主色：按钮、眉标、重点字 */
  --teal:#2f8a80;    /* 正向：跑通了、加载了 */
  --amber:#b98a2f;   /* 折中：本机替代方案 */
  --stone:#98908a;   /* 中性：没做、次要字 */
  --serif:"Iowan Old Style",Georgia,"Songti SC","Noto Serif SC",serif;
  --sans:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB",sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,monospace;
}
body{
  background:radial-gradient(1200px 600px at 15% -10%, #fbf7ef 0%, transparent 60%), var(--paper);
  color:var(--ink); font-family:var(--sans); line-height:1.65;
}
h1{font-family:var(--serif); font-size:clamp(30px,4.6vw,46px); line-height:1.22; font-weight:600; letter-spacing:-.01em;}
h1 em{font-style:normal; color:var(--terra);}   /* 标题第二行的重点字上陶土橙 */
```

**禁忌**（这套风格的腐烂点）：紫蓝渐变、玻璃拟态、每张卡 fade-up、胶囊堆、ALL-CAPS 眉标、阴影糊成雾。投影只用 `0 18px 40px -24px rgba(60,40,25,.35)` 这种"靠得住的浅影"。

### 页面骨架（两栏，左舞台右流程）

```
header   眉标(terra 小圆点 + 小字) / h1 两行（第二行重点字 em 上色） / lede 一句话
main     grid 1.08fr 1fr，≤860px 单列
  .stage   3D 舞台卡
           model-viewer 460px 高（窄屏 400）
           左上角胶囊 tag：「可拖拽旋转 · 双指缩放」
           底栏 stage-bar：文件名 · 体积 · 「带骨架与循环动画」 + 「▶ 挥个手」按钮
  .pipeline 流程清单
           h2 + sub，然后每行 .step = 序号圆点 + 标题(带 badge) + 说明
           badge：ok(teal) / alt(amber) / no(stone)
stats    四格数字：顶点数 / 骨数 / 动画帧 / GLB 体积
notes    说明列表：替代方案为什么替代、渲染怎么出的
footer   一行事实（Blender 版本 + 通道 + 耗时）
```

### model-viewer 配方

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4/dist/model-viewer.min.js"></script>

<model-viewer id="mv" src="robot.glb" alt="…"
  camera-controls auto-rotate auto-rotate-delay="3500" rotation-per-second="18deg"
  shadow-intensity="0.9" exposure="0.95" environment-image="neutral"
  touch-action="pan-y" interaction-prompt="auto"></model-viewer>
```

- **`camera-orbit` 的角度是「从哪个方向看」**：`"0deg 78deg auto"` 拍到的是**背面**，正面是 `"180deg 78deg auto"`。想省事就**别写 camera-orbit**，让 model-viewer 自己取景。
- **别手写半径**：写死 `3.6m` 会把 2.1m 的模型裁掉腿；用 `auto` 半径或省略。
- `auto-rotate` 会让人看到侧面/背面，**靠 `auto-rotate-delay` 让首屏先站正面**，或用脚本 `play()` 时临时关掉。
- **必须走 HTTP**：`file://` 打开时 `fetch` 被 CORS 拦，模型永远不加载。`python -m http.server` 即可。
- 播动画：`mv.play({repetitions:2})`；动画名来自 GLB 里的 action 名（本例 `Wave`）。

---

## 三、必做交互

- 拖转 / 缩放（`camera-controls` 自带，别自己写手势）；
- 「再来一次」按钮真的调 `play()`；
- 可见的加载状态：`<model-viewer>` 自带 poster 位，`--poster-color:transparent` 让卡片底色透出来；
- `@media (prefers-reduced-motion:reduce)` 关掉 auto-rotate；
- 键盘：所有按钮是真 `<button>`，` :focus-visible` 给 `outline:2px solid var(--terra)`。

---

## 四、自检（必须做，别"看着还行"）

```bash
bun run scripts/selfcheck.ts path/to/page.html 8831 --anim Wave
```

它会：起本地 HTTP 服务 → `Bun.WebView`（真 Chrome，可见）打开 → 抓 JS 报错 → **轮询等 `model-viewer.loaded`**（最多 15s）→ 校验 GLB 真能 200 拿到 → 断言 `availableAnimations` 里有预期动画 → 点「再来一次」按钮 → 断言无横向溢出 → 桌面 3 段 + 窄屏 2 段截图到页面同目录 `shots/`。

**为什么必须用 Bun.WebView 而不是 bsk Agent Window**：Agent Window 的标签页是 `document.visibilityState === "hidden"`，`requestAnimationFrame` 完全不触发，而 model-viewer 的加载/渲染挂在渲染循环上 —— 结果 `loaded` 永远 false、`currentSrc` 为空，你会以为模型坏了。判断代码：

```js
JSON.stringify({vis:document.visibilityState, raf: await new Promise(r=>{requestAnimationFrame(()=>r(true)); setTimeout(()=>r(false),1500)})})
```

---

## 五、四张错题卡（照抄结论，别重犯）

1. **`--background` 起不了 Blender MCP**：addon 主动拒绝。要 GUI。
2. **GUI 里 execute_code 跑渲染会死锁**：MCP 通道和渲染抢主线程。渲染/导出 → `--background` 重放脚本。
3. **Agent Window 里 3D 页面永远是坏的**：rAF 不跑。自检用 `Bun.WebView`；它默认 DPR 2，窗口物理 1600 → CSS 800，会误触移动端断点，`resize(1440, 900)` 再看桌面版。
4. **发光小件会消失**：贴在曲面上的眼球球冠只有几毫米，是几何问题不是材质问题。把球心挪到表面外。

## 六、内容纪律

- **每个环节标注真实状态**：`ok`（真跑通）/ `alt`（本机替代，说明为什么替代）/ `no`（没做，说明缺什么素材）。别把"用程序化建模代替 TRELLIS"写成"用了 TRELLIS"。
- 数字要真：顶点数、骨数、帧数、GLB 体积、渲染耗时，都从日志里抄。
- 页面上留一句运行事实（Blender 版本 / 通道 / 机器），它比形容词值钱。

## 七、参考实例

- `reference/showcase-3d-pipeline.html` —— 完整成品（307 行，含两栏骨架、五环节对照、四格统计、说明与页脚）
- `reference/robot.glb` —— 配套模型（1.4MB，20 部件 6456 顶点 / 4 根骨 / 48 帧挥手）
- `reference/robot-preview.png` —— Cycles 出图（900×1100）

跑自检：

```bash
bun run scripts/selfcheck.ts reference/showcase-3d-pipeline.html 8831 --anim Wave
```

## 八、相关技能

- **`neo-brutalist-page`**：要"啪"地有冲击力而不是温润工作室感时换那个；本技能是暖纸色路线。
- **`web-style-skins`**：同一份 DOM 多套皮肤的框架，如果要做"同一页三种风格对比"。

## 九、交付

- 页面与 GLB 放**项目既有结构**里，跟该仓库惯例走，别新建日期目录、别塞 `scratch/`；
- 页面依赖同目录 GLB，**交付时两个一起给**，只给 HTML 会白屏；
- 若宿主支持 `mark_deliverable`，页面与 GLB 都申报（GLB 是必需资源）。
