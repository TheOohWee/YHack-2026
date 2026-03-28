#!/bin/bash
# Start WattWise MVP - both backend and frontend
set -e

echo "⚡ Starting WattWise..."

# Backend
echo "  Starting FastAPI backend on :8000..."
(cd backend && source venv/bin/activate && uvicorn app.main:app --port 8000 --reload) &
BACKEND_PID=$!

# Frontend
echo "  Starting Next.js frontend on :3000..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "  ✅ Backend:  http://localhost:8000"
echo "  ✅ Frontend: http://localhost:3000"
echo "  ✅ API docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
