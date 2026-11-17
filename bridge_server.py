"""
bridge_server.py — Lightweight 2-way Local Bridge Server for Auto Antigravity Extension.

Allows AI / local tooling on Windows to observe live browser DOM & Sidebar state
and send real-time control commands directly into the active Chrome tab via the
installed Auto Antigravity extension (no Remote Debugging port 9222 needed).

Communication directory (accessible by sandboxed tools): ./.bridge/
  - state.json    : Latest live telemetry from top + iframe frames
  - command.json  : Pending/dispatched command written by AI or HTTP /send
  - result.json   : Execution proof and return data from extension
  - dom_dump.txt  : Full extracted DOM/Sidebar snapshot (for 1-step inspection)
"""

import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = int(os.environ.get("AGY_BRIDGE_PORT", "9333"))
BASE_DIR = Path(__file__).resolve().parent
BRIDGE_DIR = BASE_DIR / ".bridge"
BRIDGE_DIR.mkdir(parents=True, exist_ok=True)

STATE_FILE = BRIDGE_DIR / "state.json"
CMD_FILE = BRIDGE_DIR / "command.json"
RESULT_FILE = BRIDGE_DIR / "result.json"
DOM_DUMP_FILE = BRIDGE_DIR / "dom_dump.txt"

FILE_LOCK = threading.Lock()


def atomic_write_json(path: Path, data: dict) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def read_json_safe(path: Path, default: dict) -> dict:
    if not path.exists():
        return dict(default)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return dict(default)


def update_state(payload: dict) -> dict:
    now = time.time()
    frame = payload.get("frame", "unknown")
    with FILE_LOCK:
        state = read_json_safe(
            STATE_FILE,
            {
                "serverStartedAt": now,
                "bridgePort": PORT,
                "frames": {},
            },
        )
        frames = state.setdefault("frames", {})
        entry = dict(payload)
        entry["receivedAt"] = now
        entry["isoTime"] = time.strftime("%Y-%m-%d %H:%M:%S")
        frames[frame] = entry

        iframe_entry = frames.get("iframe", {})
        top_entry = frames.get("top", {})
        iframe_age = now - float(iframe_entry.get("receivedAt", 0))
        top_age = now - float(top_entry.get("receivedAt", 0))

        state["updatedAt"] = now
        state["isoTime"] = time.strftime("%Y-%m-%d %H:%M:%S")
        state["topConnected"] = top_age < 6.0
        state["iframeConnected"] = iframe_age < 6.0
        state["extensionVersion"] = (
            iframe_entry.get("extensionVersion")
            or top_entry.get("extensionVersion")
            or "unknown"
        )
        state["activeChat"] = iframe_entry.get("activeChat") or top_entry.get("activeChat")
        state["sidebarCount"] = iframe_entry.get("sidebarCount", 0)
        state["hasApprovalDialog"] = bool(iframe_entry.get("hasApprovalDialog", False))

        atomic_write_json(STATE_FILE, state)
        return state


def take_pending_command(frame: str, iframe_recently_seen: bool) -> list:
    with FILE_LOCK:
        if not CMD_FILE.exists():
            return []
        cmd = read_json_safe(CMD_FILE, {})
        if not cmd or cmd.get("status") != "pending":
            return []

        target = cmd.get("targetFrame", "iframe")
        # If target is iframe, wait for iframe frame unless caller explicitly wants top/any
        if target == "iframe" and frame != "iframe":
            # Fallback to top ONLY if cmd is > 2s old and iframe is absent
            age = time.time() - float(cmd.get("createdAt", time.time()))
            if not (not iframe_recently_seen and age > 2.0 and cmd.get("allowTopFallback", True)):
                return []
        elif target == "top" and frame != "top":
            return []

        cmd["status"] = "dispatched"
        cmd["dispatchedAt"] = time.time()
        cmd["dispatchedToFrame"] = frame
        atomic_write_json(CMD_FILE, cmd)
        return [cmd]


class BridgeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        # Quiet logging for high-frequency heartbeats; only errors log to stderr
        pass

    def _send_json(self, code: int, body: dict) -> None:
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        data = self.rfile.read(length)
        try:
            return json.loads(data.decode("utf-8"))
        except Exception:
            return {}

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        if self.path == "/ping" or self.path == "/":
            state = read_json_safe(STATE_FILE, {})
            self._send_json(
                200,
                {
                    "ok": True,
                    "server": "AGY-Bridge",
                    "port": PORT,
                    "ts": time.time(),
                    "iframeConnected": state.get("iframeConnected", False),
                    "activeChat": state.get("activeChat"),
                },
            )
            return

        if self.path == "/state":
            state = read_json_safe(STATE_FILE, {"ok": False})
            self._send_json(200, state)
            return

        if self.path == "/result":
            res = read_json_safe(RESULT_FILE, {"ok": False})
            self._send_json(200, res)
            return

        self._send_json(404, {"ok": False, "error": "Not found"})

    def do_POST(self):
        if self.path == "/telemetry":
            payload = self._read_json_body()
            state = update_state(payload)
            frame = payload.get("frame", "unknown")
            cmds = take_pending_command(frame, bool(state.get("iframeConnected")))
            self._send_json(
                200,
                {
                    "ok": True,
                    "server": "AGY-Bridge",
                    "ts": time.time(),
                    "iframeConnected": state.get("iframeConnected", False),
                    "topConnected": state.get("topConnected", False),
                    "commands": cmds,
                },
            )
            return

        if self.path == "/result":
            payload = self._read_json_body()
            payload["receivedAt"] = time.time()
            payload["isoTime"] = time.strftime("%Y-%m-%d %H:%M:%S")
            with FILE_LOCK:
                atomic_write_json(RESULT_FILE, payload)
                # Update command status if matching id
                if CMD_FILE.exists():
                    cur = read_json_safe(CMD_FILE, {})
                    if cur and payload.get("id") and cur.get("id") == payload.get("id"):
                        cur["status"] = "done"
                        cur["completedAt"] = time.time()
                        atomic_write_json(CMD_FILE, cur)
                # Save large DOM report to dedicated readable text file
                dom_text = payload.get("domReport") or payload.get("sidebarHtml")
                if dom_text:
                    DOM_DUMP_FILE.write_text(str(dom_text), encoding="utf-8")
            self._send_json(200, {"ok": True})
            return

        if self.path == "/send":
            payload = self._read_json_body()
            cmd_obj = {
                "id": payload.get("id") or f"cmd_{int(time.time() * 1000)}",
                "cmd": payload.get("cmd", "PING_PROOF"),
                "args": payload.get("args", {}),
                "targetFrame": payload.get("targetFrame", "iframe"),
                "allowTopFallback": payload.get("allowTopFallback", True),
                "status": "pending",
                "createdAt": time.time(),
            }
            with FILE_LOCK:
                atomic_write_json(CMD_FILE, cmd_obj)
            self._send_json(200, {"ok": True, "queued": cmd_obj})
            return

        self._send_json(404, {"ok": False, "error": "Not found"})


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    # Initialize empty state file on startup
    update_state({"frame": "server_boot", "message": "Bridge Server ready"})
    try:
        server = ReusableThreadingHTTPServer((HOST, PORT), BridgeHandler)
    except OSError as exc:
        print(f"[AGY-Bridge] Could not bind {HOST}:{PORT}: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"[AGY-Bridge] Listening on http://{HOST}:{PORT} | .bridge dir: {BRIDGE_DIR}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[AGY-Bridge] Shutting down.", flush=True)
        server.server_close()


if __name__ == "__main__":
    main()
