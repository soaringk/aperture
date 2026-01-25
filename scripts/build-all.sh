#!/bin/bash
set -e

# =============================================================================
# Unified Build & Deploy Script for Aperture
# =============================================================================
# This script builds both frontends locally and prepares them for deployment.
#
# For Docker deployment, see the simpler workflow below.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
APERTURE_DIR="${APERTURE_DIR:-$BLOG_DIR/../aperture}"
OUTPUT_DIR="$BLOG_DIR/deploy"

echo "🚀 Building unified frontend..."
echo "   Blog:     $BLOG_DIR"
echo "   Aperture: $APERTURE_DIR"
echo "   Output:   $OUTPUT_DIR"
echo ""

# Clean output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/blog"
mkdir -p "$OUTPUT_DIR/aperture"

# Build Blog (Astro)
echo "📝 Building Blog..."
cd "$BLOG_DIR"
npm run build
cp -r dist/* "$OUTPUT_DIR/blog/"

# Build Aperture (Vite)
echo "🔧 Building Aperture..."
cd "$APERTURE_DIR"
npm run build
cp -r dist/* "$OUTPUT_DIR/aperture/"

# Copy nginx config
mkdir -p "$OUTPUT_DIR/nginx"
cp "$BLOG_DIR/nginx/default.conf" "$OUTPUT_DIR/nginx/"

echo ""
echo "✅ Build complete!"
echo ""
echo "Output structure:"
echo "  $OUTPUT_DIR/"
echo "  ├── blog/       # Astro static files -> /var/www/blog"
echo "  ├── aperture/   # Vite static files -> /var/www/aperture"
echo "  └── nginx/      # Nginx config"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DEPLOYMENT OPTIONS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option 1: Docker (Recommended)"
echo "  Build locally, push image to registry, pull on server."
echo ""
echo "  # On your local machine:"
echo "  docker build -t your-registry/aperture:latest ."
echo "  docker push your-registry/aperture:latest"
echo ""
echo "  # On your server:"
echo "  docker pull your-registry/aperture:latest"
echo "  docker run -d -p 80:80 -p 443:443 your-registry/aperture:latest"
echo ""
echo "Option 2: Copy Static Files"
echo "  1. scp -r deploy/blog/* user@server:/var/www/blog/"
echo "  2. scp -r deploy/aperture/* user@server:/var/www/aperture/"
echo "  3. scp deploy/nginx/default.conf user@server:/etc/nginx/conf.d/"
echo "  4. ssh user@server 'sudo systemctl reload nginx'"
echo ""
