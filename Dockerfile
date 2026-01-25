# Multi-Stage Dockerfile
# Builds blog, frontend, and backend - serves all via nginx + Go
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
# Stage 2: Build Aperture-Tools Frontend (Vite)
# ============================================
FROM node:20-alpine AS aperture-builder

WORKDIR /app/aperture

# Build from submodule at ./aperture-tools
COPY aperture-tools/package*.json ./
RUN npm ci

COPY aperture-tools/ .
RUN npm run build

# ============================================
# Stage 3: Build Backend (Go)
# ============================================
FROM golang:1.25-alpine AS backend-builder

WORKDIR /app

# Copy go.mod and go.sum first for caching
COPY aperture-tools/server/go.mod aperture-tools/server/go.sum ./
RUN go mod download

# Copy source and build
COPY aperture-tools/server/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# ============================================
# Stage 4: Production (Nginx + Go)
# ============================================
FROM nginx:alpine AS production

# Install supervisor to run multiple processes
RUN apk add --no-cache supervisor

# Copy built static files
COPY --from=blog-builder /app/blog/dist /var/www/blog
COPY --from=aperture-builder /app/aperture/dist /var/www/aperture

# Copy Go binary
COPY --from=backend-builder /app/server /usr/local/bin/aperture-server

# Copy nginx config
COPY nginx/ /etc/nginx/conf.d/

# Create supervisor config
RUN mkdir -p /etc/supervisor.d
COPY <<EOF /etc/supervisor.d/aperture.ini
[supervisord]
nodaemon=true
user=root

[program:nginx]
command=nginx -g 'daemon off;'
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:backend]
command=/usr/local/bin/aperture-server
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

EXPOSE 80 443

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
