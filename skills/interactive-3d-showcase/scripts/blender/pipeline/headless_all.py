# Headless 全流程：重放 cmd1..cmd5（与通过 MCP 发的是同一批脚本）+ Cycles 渲染 + 导出 GLB
# 用法: /Applications/Blender.app/Contents/MacOS/Blender --background --python headless_all.py
import bpy
import os
import runpy

BASE = "/Users/zhining/.my-app-ui-local/workspace/2026-11-15/723b59a0s86/scratch"

for cmd in ("cmd1_scene.py", "cmd2_body.py", "cmd3_materials.py",
            "cmd4_light_cam.py", "cmd5_rig_anim.py", "cmd6_render_export.py"):
    path = os.path.join(BASE, cmd)
    print("=== running %s" % cmd, flush=True)
    runpy.run_path(path, run_name="__main__")

print("=== ALL DONE", flush=True)
