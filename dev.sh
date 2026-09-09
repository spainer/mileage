#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

_B_EXIT=0
_F_EXIT=0
_B_PID_ACTIVE=0
_F_PID_ACTIVE=0

clean_exit() {
    [ "$_B_PID_ACTIVE" -eq 1 ] && kill $_B_PID 2>/dev/null || true
    [ "$_F_PID_ACTIVE" -eq 1 ] && kill $_F_PID 2>/dev/null || true
}

trap clean_exit EXIT INT TERM

# ── Backend (Litestar) ──────────────────────────────────────────

cd "$SCRIPT_DIR/backend"
echo " Starting Litestar backend on http://0.0.0.0:8000 ..."
uv run uvicorn src.app:app --host 0.0.0.0 --port 8000 &
_B_PID=$!
_B_PID_ACTIVE=1

# ── Frontend (Vite) ─────────────────────────────────────────────

cd "$SCRIPT_DIR/frontend"
echo " Starting Vite frontend on http://0.0.0.0:5173 ..."
npx vite --host 0.0.0.0 &
_F_PID=$!
_F_PID_ACTIVE=1

# ── Wait for both, collect exit codes ───────────────────────────

echo ""
echo " === Servers running — press Ctrl-C to stop ==="
echo ""

wait $_B_PID && _B_EXIT=0 || _B_EXIT=$?
wait $_F_PID && _F_EXIT=0 || _F_EXIT=$?

# Report which crashed and exit with appropriate code
[ $_B_EXIT -ne 0 ] && echo " Backend crashed (exit $_B_EXIT)"
[ $_F_EXIT -ne 0 ] && echo " Frontend crashed (exit $_F_EXIT)"

if [ $_B_EXIT -ne 0 ] || [ $_F_EXIT -ne 0 ]; then
    exit 1
else
    echo ""
    echo " === All servers stopped cleanly ==="
    exit 0
fi
