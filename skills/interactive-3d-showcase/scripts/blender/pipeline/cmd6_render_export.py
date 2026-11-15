# CMD6 — Cycles 出图 + 导出 GLB（推文里「导出到网页」那一步）
import bpy
import os
import time

scene = bpy.context.scene
OUT = "/Users/zhining/.my-app-ui-local/workspace/2026-11-15/723b59a0s86"

# ---- Cycles 最终渲染（挥手最高点那一帧）----
scene.render.engine = 'CYCLES'
scene.cycles.samples = 110
try:
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = -0.3
except Exception:
    pass
scene.render.resolution_x = 900
scene.render.resolution_y = 1100
scene.frame_set(9)
scene.render.filepath = os.path.join(OUT, "robot-preview.png")
t0 = time.time()
bpy.ops.render.render(write_still=True)
print("render done in %.1fs -> %s" % (time.time() - t0, scene.render.filepath))

# ---- 导出 GLB（只导出 Robot + Rig，不含灯光/相机/地板）----
robot = bpy.data.objects["Robot"]
rig = bpy.data.objects["Rig"]
bpy.ops.object.select_all(action='DESELECT')
robot.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = robot

glb = os.path.join(OUT, "robot.glb")
bpy.ops.export_scene.gltf(
    filepath=glb,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_apply=False,
    export_skins=True,
    export_yup=True,
)
size = os.path.getsize(glb)
print("GLB exported: %s (%.1f KB)" % (glb, size / 1024))
