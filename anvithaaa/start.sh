#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Starting MongoDB..."
docker compose up -d mongodb

echo "Waiting for MongoDB..."
sleep 5

echo "Setting up backend..."
cd backend
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -q -r requirements.txt
python -m app.database.seed_templates

echo "Starting FastAPI backend on :8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cd ../frontend
echo "Installing frontend dependencies..."
npm install --silent

echo "Starting React frontend on :5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo " Network Audit & Compliance Platform"
echo "============================================"
echo " Frontend:  http://localhost:5173"
echo " Backend:   http://localhost:8000"
echo " API Docs:  http://localhost:8000/docs"
echo " MongoDB:   mongodb://localhost:27017"
echo "============================================"
echo ""
echo "Sample configs in ./sample_configs/"
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
