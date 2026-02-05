#!/bin/bash

# Start Docker services
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
sleep 5

# Push database schema
pnpm db:push

# Set ports to public (only works in Codespaces)
if [ -n "$CODESPACES" ]; then
  echo "Setting ports to public..."
  gh codespace ports visibility 5173:public 3001:public -c $CODESPACE_NAME 2>/dev/null || true
fi

# Start development servers
pnpm dev
