# CMD3 — 材质：奶油白外壳 / 陶土橙点缀 / 青色发光
import bpy

def principled(name, color, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


def emission(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emi = nt.nodes.new("ShaderNodeEmission")
    emi.inputs["Color"].default_value = (*color, 1.0)
    emi.inputs["Strength"].default_value = strength
    nt.links.new(emi.outputs[0], out.inputs[0])
    return m


M_shell = principled("M_Shell", (0.83, 0.77, 0.68), rough=0.6)
M_accent = principled("M_Accent", (0.70, 0.28, 0.16), rough=0.42)
M_dark = principled("M_Dark", (0.12, 0.10, 0.09), rough=0.30)
M_glow = emission("M_Glow", (0.20, 0.80, 0.74), 2.0)
M_accent_glow = emission("M_AccentGlow", (0.95, 0.38, 0.14), 2.2)

assign = {}
for n in ("body", "head", "ear_L", "ear_R", "shoulder_L", "shoulder_R",
          "arm_L", "arm_R", "hand_L", "hand_R", "leg_L", "leg_R",
          "foot_L", "foot_R", "antenna_stick"):
    assign[n] = M_shell
assign["mouth"] = M_dark
assign["chest_light"] = M_accent_glow
for n in ("eye_L", "eye_R", "antenna_ball"):
    assign[n] = M_glow

count = 0
for name, mat in assign.items():
    o = bpy.data.objects.get(name)
    if o is None:
        continue
    o.data.materials.clear()
    o.data.materials.append(mat)
    count += 1

print("materials assigned to %d parts" % count)
