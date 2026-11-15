# 启动 Blender（GUI 模式，blender-mcp addon 只在 GUI 下允许起 server）
# 用法: /Applications/Blender.app/Contents/MacOS/Blender --python start_mcp_server.py
import bpy
import addon_utils

addon_utils.enable("blender_mcp", default_set=True, persistent=True)

scene = bpy.context.scene
try:
    bpy.ops.blendermcp.start_server()
except Exception as e:
    print("BLENDERMCP_START_EXC", repr(e), flush=True)

port = getattr(scene, "blendermcp_port", 9876)
running = getattr(scene, "blendermcp_server_running", False)
if running:
    print(f"BLENDERMCP_SERVER_UP port={port} running={running}", flush=True)
else:
    print(f"BLENDERMCP_SERVER_FAILED port={port} running={running}", flush=True)

# 脚本结束返回 Blender 事件循环；server 线程随 timer 在主线程执行命令
