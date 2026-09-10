#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

B_PID=""
F_PID=""

# Stop one server. The wrapper (uv/npx) forwards the signal to its child
# (uvicorn/vite), so killing the wrapper PID takes the whole server down
# without leaving an orphan.
stop_server() {
    local pid="$1"
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && kill -TERM "$pid" 2>/dev/null
}

# Ctrl-C / SIGTERM is an expected, clean shutdown, so exit 0.
on_signal() {
    trap - INT TERM
    stop_server "$B_PID"
    stop_server "$F_PID"
    wait "$B_PID" 2>/dev/null
    wait "$F_PID" 2>/dev/null
    echo ""
    echo " === Servers stopped ==="
    exit 0
}

trap on_signal INT TERM

# ── Backend (Litestar) ──────────────────────────────────────────

cd "$SCRIPT_DIR/backend"
echo " Starting Litestar backend on http://0.0.0.0:8000 ..."
uv run uvicorn src.app:app --host 0.0.0.0 --port 8000 &
B_PID=$!

# ── Frontend (Vite) ─────────────────────────────────────────────

cd "$SCRIPT_DIR/frontend"
echo " Starting Vite frontend on http://0.0.0.0:5173 ..."
npx vite --host 0.0.0.0 &
F_PID=$!

# ── Wait for both, detect a real crash ──────────────────────────

echo ""
echo " === Servers running — press Ctrl-C to stop ==="
echo ""

wait "$B_PID"; B_EXIT=$?
if [ "$B_EXIT" -ne 0 ]; then
    echo " Backend crashed (exit $B_EXIT)"
    stop_server "$F_PID"
    wait "$F_PID" 2>/dev/null
    exit 1
fi

wait "$F_PID"; F_EXIT=$?
if [ "$F_EXIT" -ne 0 ]; then
    echo " Frontend crashed (exit $F_EXIT)"
    exit 1
fi

echo ""
echo " === All servers stopped cleanly ==="
exit 0
