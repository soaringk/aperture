# Multi-Stage Dockerfile
# Builds both frontends and serves via nginx - no pre-build required
# Usage: docker build -t aperture .

# ============================================
# Stage 1: Build Blog (Astro)
# ============================================
FROM node:20-alpine AS blog-builder

WORKDIR /app/blog

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ============================================
# Stage 2: Build Aperture-Tools (Vite)
# ============================================
FROM node:20-alpine AS aperture-builder

WORKDIR /app/aperture

# Build from submodule at ./aperture-tools
COPY aperture-tools/package*.json ./
RUN npm ci

COPY aperture-tools/ .
RUN npm run build

# ============================================
# Stage 3: Production (Nginx)
# ============================================
FROM nginx:alpine AS production

# Copy built static files
COPY --from=blog-builder /app/blog/dist /var/www/blog
COPY --from=aperture-builder /app/aperture/dist /var/www/aperture

# Copy nginx config
COPY nginx/ /etc/nginx/conf.d/

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
