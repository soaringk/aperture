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
# Stage 2: Build Aperture (Vite)
# ============================================
FROM node:20-alpine AS aperture-builder

WORKDIR /app/aperture

# We need to copy from the aperture repo
# This expects the context to include ../aperture
# OR you can build separately - see instructions below
ARG APERTURE_PATH=../aperture

COPY ${APERTURE_PATH}/package*.json ./
RUN npm ci

COPY ${APERTURE_PATH} .
RUN npm run build

# ============================================
# Stage 3: Production (Nginx)
# ============================================
FROM nginx:alpine AS production

# Copy built static files
COPY --from=blog-builder /app/blog/dist /var/www/blog
COPY --from=aperture-builder /app/aperture/dist /var/www/aperture

# Copy nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/ssl.conf /etc/nginx/conf.d/ssl.conf 2>/dev/null || true

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
