#!/bin/bash

# =============================================================================
# Start All Services for Local Development/Production
# =============================================================================
# Starts nginx, backend, and optionally the Astro dev server.
# Use Ctrl+C to stop all processes.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
APERTURE_DIR="${APERTURE_DIR:-$BLOG_DIR/aperture-tools}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track PIDs for cleanup
PIDS=()

cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
        fi
    done
    wait 2>/dev/null
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if running in production mode (built assets)
if [[ "$1" == "--prod" || "$1" == "-p" ]]; then
    MODE="production"
    DEPLOY_DIR="$BLOG_DIR/deploy"

    if [[ ! -d "$DEPLOY_DIR/blog" ]]; then
        echo -e "${RED}Error: Production build not found. Run ./scripts/build-all.sh first.${NC}"
        exit 1
    fi
else
    MODE="development"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Starting Aperture Stack (${MODE})${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ "$MODE" == "production" ]]; then
    # Production: serve built files with nginx + backend

    # Start Backend
    echo -e "${BLUE}[Backend]${NC} Starting Go server on :8080..."
    cd "$DEPLOY_DIR"
    ./bin/aperture-server &
    PIDS+=($!)

    # Start Nginx (requires sudo for port 80)
    echo -e "${BLUE}[Nginx]${NC} Starting nginx..."
    echo -e "${YELLOW}Note: Nginx typically requires sudo for port 80${NC}"
    # For local testing, use a high port
    # nginx -c "$DEPLOY_DIR/nginx/default.conf" -p "$DEPLOY_DIR" &
    # PIDS+=($!)

    echo ""
    echo -e "${GREEN}Production services started:${NC}"
    echo "  - Backend:  http://localhost:8080"
    echo "  - (Configure nginx separately for full production)"

else
    # Development: run dev servers

    # Start Backend
    echo -e "${BLUE}[Backend]${NC} Starting Go server on :8080..."
    cd "$APERTURE_DIR/server"
    go run . &
    PIDS+=($!)
    sleep 1

    # Start Aperture Frontend (Vite)
    echo -e "${BLUE}[Frontend]${NC} Starting Vite dev server on :5173..."
    cd "$APERTURE_DIR"
    npm run dev &
    PIDS+=($!)
    sleep 1

    # Start Blog (Astro)
    echo -e "${BLUE}[Blog]${NC} Starting Astro dev server on :4321..."
    cd "$BLOG_DIR"
    npm run dev &
    PIDS+=($!)

    echo ""
    echo -e "${GREEN}Development servers started:${NC}"
    echo "  - Blog:     http://localhost:4321"
    echo "  - Frontend: http://localhost:5173"
    echo "  - Backend:  http://localhost:8080"
fi

echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background processes
wait
