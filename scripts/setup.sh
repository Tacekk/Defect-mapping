#!/bin/bash

# Glass Inspector - Setup Script
# This script helps you get started with the development environment

set -e

echo "🔧 Glass Inspector - Setup"
echo "=========================="
echo ""

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is available"
    fi
}

echo "Checking required tools..."
check_command node
check_command pnpm
check_command docker

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🐳 Starting development database..."
pnpm docker:dev

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

echo ""
echo "🗄️ Setting up database..."
cp .env.example .env 2>/dev/null || true
cp apps/api/.env.example apps/api/.env 2>/dev/null || true
pnpm db:generate
pnpm db:push

echo ""
echo "🌱 Seeding database with test data..."
pnpm --filter api db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  pnpm dev"
echo ""
echo "Test accounts:"
echo "  Admin:     admin@glass-inspector.local / admin123"
echo "  Inspector: inspector@glass-inspector.local / inspector123"
echo "  Quality:   quality@glass-inspector.local / quality123"
echo ""
echo "Frontend: http://localhost:5173"
echo "API:      http://localhost:3001"
