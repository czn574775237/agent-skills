# CMD4 — 三点光 + 相机 + 地面（推文里「场景」环节）
import bpy
import math

scene = bpy.context.scene

# ---- 地面 ----
bpy.ops.mesh.primitive_cylinder_add(radius=6.0, depth=0.03, location=(0, 0, -0.015), vertices=64)
floor = bpy.context.active_object
floor.name = "floor"
fm = bpy.data.materials.new("M_Floor")
fm.use_nodes = True
fb = fm.node_tree.nodes["Principled BSDF"]
fb.inputs["Base Color"].default_value = (0.82, 0.74, 0.63, 1.0)
fb.inputs["Roughness"].default_value = 0.85
floor.data.materials.append(fm)

# ---- 灯光辅助 ----
def area(name, loc, size, energy, color, target):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.size = size
    ld.energy = energy
    ld.color = color
    o = bpy.data.objects.new(name, ld)
    o.location = loc
    scene.collection.objects.link(o)
    c = o.constraints.new('TRACK_TO')
    c.target = target
    c.track_axis = 'TRACK_NEGATIVE_Z'
    c.up_axis = 'UP_Y'
    return o


target = bpy.data.objects.new("light_target", None)
target.location = (0, 0, 1.12)
scene.collection.objects.link(target)

area("key", (2.4, -2.8, 3.2), 3.0, 300, (1.0, 0.95, 0.88), target)     # 主光 暖白
area("fill", (-2.9, -1.8, 1.7), 2.6, 90, (0.85, 0.90, 1.0), target)     # 补光 微冷
area("rim", (0.2, 2.4, 2.2), 1.6, 200, (1.0, 0.78, 0.55), target)       # 轮廓光 暖橙

# ---- 相机 ----
cam_data = bpy.data.cameras.new("Cam")
cam_data.lens = 52
cam = bpy.data.objects.new("Cam", cam_data)
cam.location = (2.3, -4.55, 1.95)
scene.collection.objects.link(cam)
scene.camera = cam
cc = cam.constraints.new('TRACK_TO')
cc.target = target
cc.track_axis = 'TRACK_NEGATIVE_Z'
cc.up_axis = 'UP_Y'

print("floor + 3 lights + camera ready")
