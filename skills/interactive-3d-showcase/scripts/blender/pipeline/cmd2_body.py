# CMD2 — 程序化建模：小机器人（推文里这一步是 TRELLIS / Hunyuan3D-2 生成 mesh）
# 每个部件独立对象，带顶点组，供后续骨架蒙皮
import bpy
import math
from mathutils import Vector

scene = bpy.context.scene


def _finish(o, name, bevel=0.0):
    o.name = name
    o.data.name = name
    if bevel > 0:
        m = o.modifiers.new("Bevel", 'BEVEL')
        m.width = bevel
        m.segments = 4
        m.limit_method = 'NONE'
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o


def cyl(name, r, d, loc, rot=(0, 0, 0), bevel=0.0, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc,
                                        rotation=rot, vertices=verts)
    return _finish(bpy.context.active_object, name, bevel)


def sph(name, r, loc, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=32, ring_count=16)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, name)


def cube(name, loc, scale, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, name, bevel)


def vg(o, group):
    g = o.vertex_groups.new(name=group)
    g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')


parts = {}

# ---- 躯干 ----
parts['body'] = cyl("body", 0.5, 0.86, (0, 0, 0.62), bevel=0.17)
# ---- 头 ----
parts['head'] = sph("head", 0.42, (0, 0, 1.42), scale=(1, 1, 0.95))
# ---- 眼睛（面朝 -Y）----
parts['eye_L'] = sph("eye_L", 0.10, (-0.17, -0.40, 1.47), scale=(1, 0.55, 1.1))
parts['eye_R'] = sph("eye_R", 0.10, (0.17, -0.40, 1.47), scale=(1, 0.55, 1.1))
# ---- 嘴 ----
parts['mouth'] = cube("mouth", (0, -0.415, 1.29), (0.20, 0.05, 0.045), bevel=0.015)
# ---- 天线 ----
parts['antenna_stick'] = cyl("antenna_stick", 0.02, 0.22, (0, 0, 1.95), verts=24)
parts['antenna_ball'] = sph("antenna_ball", 0.075, (0, 0, 2.09))
# ---- 侧耳圆盘 ----
parts['ear_L'] = cyl("ear_L", 0.09, 0.06, (-0.42, 0, 1.50), rot=(0, math.pi / 2, 0), verts=32)
parts['ear_R'] = cyl("ear_R", 0.09, 0.06, (0.42, 0, 1.50), rot=(0, math.pi / 2, 0), verts=32)
# ---- 肩球 ----
parts['shoulder_L'] = sph("shoulder_L", 0.11, (-0.50, 0, 0.95))
parts['shoulder_R'] = sph("shoulder_R", 0.11, (0.50, 0, 0.95))
# ---- 左臂：略外展垂下（让轮廓看得见）----
la_dir = Vector((-0.30, 0, -0.95)).normalized()
la_shoulder = Vector((-0.52, 0, 0.92))
la_mid = la_shoulder + la_dir * 0.26
la_rot = la_dir.to_track_quat('Z', 'Y').to_euler()
parts['arm_L'] = cyl("arm_L", 0.075, 0.50, tuple(la_mid), rot=tuple(la_rot), verts=32)
parts['hand_L'] = sph("hand_L", 0.10, tuple(la_shoulder + la_dir * 0.55))
# ---- 右臂：举起打招呼（斜向上外）----
arm_dir = Vector((0.55, 0, 0.75)).normalized()
arm_shoulder = Vector((0.52, 0, 0.95))
arm_mid = arm_shoulder + arm_dir * 0.26
arm_rot = arm_dir.to_track_quat('Z', 'Y').to_euler()
parts['arm_R'] = cyl("arm_R", 0.075, 0.50, tuple(arm_mid), rot=tuple(arm_rot), verts=32)
hand_pos = arm_shoulder + arm_dir * 0.55
parts['hand_R'] = sph("hand_R", 0.10, tuple(hand_pos))
# ---- 胸口灯 ----
parts['chest_light'] = cyl("chest_light", 0.10, 0.04, (0, -0.485, 0.78), rot=(math.pi / 2, 0, 0), verts=32)
# ---- 腿脚 ----
parts['leg_L'] = cyl("leg_L", 0.085, 0.20, (-0.20, 0, 0.10), verts=32)
parts['leg_R'] = cyl("leg_R", 0.085, 0.20, (0.20, 0, 0.10), verts=32)
parts['foot_L'] = cyl("foot_L", 0.14, 0.07, (-0.20, -0.03, 0.045), verts=32)
parts['foot_R'] = cyl("foot_R", 0.14, 0.07, (0.20, -0.03, 0.045), verts=32)

# ---- 顶点组（骨名）----
GROUP = {
    'body': 'Root', 'chest_light': 'Root', 'leg_L': 'Root', 'leg_R': 'Root',
    'foot_L': 'Root', 'foot_R': 'Root',
    'head': 'Head', 'eye_L': 'Head', 'eye_R': 'Head', 'mouth': 'Head',
    'antenna_stick': 'Head', 'antenna_ball': 'Head', 'ear_L': 'Head', 'ear_R': 'Head',
    'shoulder_R': 'Shoulder_R', 'arm_R': 'Shoulder_R', 'hand_R': 'Shoulder_R',
    'shoulder_L': 'Shoulder_L', 'arm_L': 'Shoulder_L', 'hand_L': 'Shoulder_L',
}
for name, o in parts.items():
    vg(o, GROUP[name])

scene["robot_parts"] = ",".join(parts.keys())
total_v = sum(len(o.data.vertices) for o in parts.values())
print("built %d parts, %d verts total" % (len(parts), total_v))
print("parts:", scene["robot_parts"])
