#!/bin/sh
set -e
cd /app
export PYTHONPATH=.
python -m alembic upgrade head 2>/dev/null || true
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
