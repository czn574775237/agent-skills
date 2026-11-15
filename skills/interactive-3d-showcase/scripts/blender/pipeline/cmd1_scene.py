# CMD1 — 清场 + 世界环境 + 渲染引擎
# 这是「AI 通过 blender-mcp 发出的第 1 条指令」
import bpy

scene = bpy.context.scene

# ---- 清空默认场景 ----
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for coll in list(bpy.data.collections):
    bpy.data.collections.remove(coll)
for me in list(bpy.data.meshes):
    bpy.data.meshes.remove(me)
for arm in list(bpy.data.armatures):
    bpy.data.armatures.remove(arm)
for act in list(bpy.data.actions):
    bpy.data.actions.remove(act)

# ---- 世界：暖米色环境光 ----
world = bpy.data.worlds.new("WarmWorld")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.95, 0.86, 0.72, 1.0)
bg.inputs[1].default_value = 0.7

# ---- 渲染基础 ----
scene.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = 'GPU'
    print("cycles device: METAL GPU")
except Exception as e:
    scene.cycles.device = 'CPU'
    print("cycles device: CPU fallback (%s)" % e)

scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 1100
scene.render.fps = 24
scene.render.image_settings.file_format = 'PNG'
scene.frame_start = 1
scene.frame_end = 48

print("scene cleaned; engine=%s objects=%d" % (scene.render.engine, len(bpy.data.objects)))
