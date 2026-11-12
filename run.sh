#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -d .venv ] || { python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt; }
[ -f .env ] || cp .env.example .env
. .venv/bin/activate
cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
