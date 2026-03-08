#!/bin/bash
# Start Loomknot locally: infra + all apps
set -e

# Kill stale processes on app ports
lsof -ti:43001 -ti:43002 -ti:43003 2>/dev/null | xargs kill -9 2>/dev/null || true

echo "Starting infrastructure..."
docker compose up -d postgres redis minio caddy

echo "Waiting for postgres..."
until docker exec loomknot-postgres pg_isready -U loomknot 2>/dev/null; do sleep 1; done

echo "Waiting for redis..."
until docker exec loomknot-redis redis-cli ping 2>/dev/null; do sleep 1; done

echo "Building shared package..."
pnpm --filter @loomknot/shared build

echo ""
echo "Infrastructure ready!"
echo "   Postgres:  localhost:43010"
echo "   Redis:     localhost:43011"
echo "   MinIO:     localhost:43012 (console :43013)"
echo "   Caddy:     localhost:43000"
echo ""
echo "Starting all apps (turbo dev)..."
echo "   Web:  http://localhost:43001"
echo "   API:  http://localhost:43002"
echo "   MCP:  http://localhost:43003"
echo ""

pnpm turbo dev
