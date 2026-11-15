# MCP-style 客户端：连 blender_mcp addon 的 socket (127.0.0.1:9876)
# 这就是 blender-mcp 的 MCP server 与 Blender addon 之间的同一通道：
#   请求: {"type": "execute_code", "params": {"code": "<python>"}}
#   成功: {"status": "success", "result": {"executed": true, "result": "<stdout>"}}
#   失败: {"status": "error", "message": "<json with traceback>"}
# 用法:
#   uv run mcp_client.py --ping
#   uv run mcp_client.py cmd2_body.py
#   uv run mcp_client.py --info          (get_scene_info)
import json
import socket
import sys

HOST, PORT = "127.0.0.1", 9876


def send(cmd: dict, timeout: float = 300) -> dict:
    with socket.create_connection((HOST, PORT), timeout=15) as s:
        s.settimeout(timeout)
        s.sendall(json.dumps(cmd).encode("utf-8"))
        buf = b""
        while True:
            chunk = s.recv(65536)
            if not chunk:
                break
            buf += chunk
            try:
                return json.loads(buf.decode("utf-8"))
            except json.JSONDecodeError:
                continue
    raise RuntimeError("connection closed without a complete JSON response")


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print("usage: mcp_client.py --ping | --info | <code_file.py>")
        sys.exit(2)

    if args[0] == "--ping":
        resp = send({"type": "ping", "params": {}})
    elif args[0] == "--info":
        resp = send({"type": "get_scene_info", "params": {}})
    else:
        code = open(args[0], encoding="utf-8").read()
        resp = send({"type": "execute_code", "params": {"code": code}})

    status = resp.get("status")
    if status == "success":
        result = resp.get("result", {})
        out = result.get("result", "") if isinstance(result, dict) else str(result)
        print("== BLENDER STDOUT ==")
        print(out.strip() if out else "(no output)")
    else:
        print(f"== ERROR (status={status}) ==")
        msg = resp.get("message", "")
        try:
            err = json.loads(msg)
            print(err.get("exception_type", ""), err.get("message", ""))
            print(err.get("traceback", ""))
        except (json.JSONDecodeError, AttributeError):
            print(msg)
        sys.exit(1)


if __name__ == "__main__":
    main()
