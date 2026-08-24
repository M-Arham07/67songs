#!/usr/bin/env bash
set -e

echo "=== Starting 67Songs Unified Backend Services ==="

# 1. Start Python FastAPI Music Service in background on internal port 8000
echo "[1/2] Starting Python FastAPI Music Service on 127.0.0.1:8000..."
cd /app/backend/music
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2 &
PYTHON_PID=$!

# Wait for Python service to become healthy
echo "Waiting for Python music service to initialize..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo "✓ Python Music Service is healthy!"
    break
  fi
  sleep 0.5
done

# Trap signals for graceful shutdown
cleanup() {
  echo "Stopping services..."
  kill -TERM "$PYTHON_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# 2. Start Node.js Realtime Socket.IO Server in foreground on public PORT
echo "[2/2] Starting Node.js Realtime Socket.IO Server on port ${PORT:-4000}..."
cd /app/backend/realtime
exec node dist/index.js
