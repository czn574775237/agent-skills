# CMD5 — 骨架 + 蒙皮 + 挥手动画（推文里这一步是 UniRig 自动绑骨，本机用 Blender armature）
import bpy
import math
from mathutils import Vector

scene = bpy.context.scene

# ---- 骨架 ----
arm_data = bpy.data.armatures.new("RigData")
rig = bpy.data.objects.new("Rig", arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones

root = eb.new("Root")
root.head = (0, 0, 0.0)
root.tail = (0, 0, 0.42)

head_b = eb.new("Head")
head_b.head = (0, 0, 1.05)
head_b.tail = (0, 0, 1.85)
head_b.parent = root
head_b.use_connect = False

# 右臂（举起打招呼）
arm_dir = Vector((0.55, 0, 0.75)).normalized()
sh_r_head = Vector((0.50, 0, 0.95))
sh_r = eb.new("Shoulder_R")
sh_r.head = tuple(sh_r_head)
sh_r.tail = tuple(sh_r_head + arm_dir * 0.58)
sh_r.parent = root
sh_r.use_connect = False

# 左臂（垂下）
sh_l = eb.new("Shoulder_L")
sh_l.head = (-0.50, 0, 0.95)
sh_l.tail = (-0.66, 0, 0.40)
sh_l.parent = root
sh_l.use_connect = False

bpy.ops.object.mode_set(mode='OBJECT')
print("bones:", [b.name for b in arm_data.bones])

# ---- 合并所有部件为单个 mesh ----
names = scene["robot_parts"].split(",")
parts = [bpy.data.objects[n] for n in names if n in bpy.data.objects]
bpy.ops.object.select_all(action='DESELECT')
for p in parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
robot = bpy.context.view_layer.objects.active
robot.name = "Robot"
robot.data.name = "RobotMesh"
print("joined into Robot: %d verts, groups=%s" %
      (len(robot.data.vertices), [g.name for g in robot.vertex_groups]))

# ---- 绑骨 ----
mod = robot.modifiers.new("Armature", 'ARMATURE')
mod.object = rig
mod.use_vertex_groups = True
robot.parent = rig
robot.matrix_parent_inverse = rig.matrix_world.inverted()

# ---- 动画：Wave ----
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
pose = rig.pose.bones

# 右臂摆动（骨骼局部 X 轴）
r = pose["Shoulder_R"]
r.rotation_mode = 'XYZ'
for f, a in [(1, 0.0), (9, 0.40), (17, -0.12), (25, 0.40), (33, -0.05), (41, 0.28), (48, 0.0)]:
    scene.frame_set(f)
    r.rotation_euler = (a, 0, 0)
    r.keyframe_insert("rotation_euler", index=0, frame=f)

# 整体轻浮（Root 骨局部 Y = 世界 +Z）
rt = pose["Root"]
rt.rotation_mode = 'XYZ'
for f, dz in [(1, 0.0), (24, 0.05), (48, 0.0)]:
    scene.frame_set(f)
    rt.location = (0, dz, 0)
    rt.keyframe_insert("location", index=1, frame=f)

# 头微摆
hd = pose["Head"]
hd.rotation_mode = 'XYZ'
for f, a in [(1, 0.0), (12, 0.06), (24, 0.0), (36, -0.06), (48, 0.0)]:
    scene.frame_set(f)
    hd.rotation_euler = (0, a, 0)
    hd.keyframe_insert("rotation_euler", index=1, frame=f)

if rig.animation_data and rig.animation_data.action:
    rig.animation_data.action.name = "Wave"
    print("action:", rig.animation_data.action.name,
          "range:", tuple(rig.animation_data.action.frame_range))

bpy.ops.object.mode_set(mode='OBJECT')

# ---- WORKBENCH 快速验证帧（挥手方向是否对）----
import os
fd = os.path.join(os.path.dirname(bpy.data.filepath) if bpy.data.filepath else "",
                  "frames")
fd = "/Users/zhining/.my-app-ui-local/workspace/2026-11-15/723b59a0s86/scratch/frames"
os.makedirs(fd, exist_ok=True)
prev_engine = scene.render.engine
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x = 480
scene.render.resolution_y = 600
scene.cycles.samples = 8
for f in (1, 9, 25):
    scene.frame_set(f)
    scene.render.filepath = os.path.join(fd, "w%02d.png" % f)
    bpy.ops.render.render(write_still=True)
scene.render.engine = prev_engine
print("workbench frames written to", fd)
