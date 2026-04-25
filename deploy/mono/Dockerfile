# Shoujiki Mono-Container (Professional Monorepo Structure)
# This container runs Redis, API, Worker, Sandbox, and serves Web (standalone)

# Phase 1: Frontend Builder
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm install --legacy-peer-deps
COPY apps/web/ .
# Set API URL to relative /api for the mono-container proxy
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build

# Phase 2: Final Runner
FROM python:3.11-slim AS runner

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    supervisor \
    redis-server \
    util-linux \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup API & Worker
WORKDIR /app/api
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/api/ ./backend/
RUN touch ./backend/__init__.py

# Setup Sandbox
WORKDIR /app/sandbox
COPY apps/sandbox/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/sandbox/ .

# Setup Web (Standalone)
WORKDIR /app
COPY --from=frontend-builder /app/.next/standalone ./web/
COPY --from=frontend-builder /app/.next/static ./web/.next/static
COPY --from=frontend-builder /app/public ./web/public

# Supervisor configuration
RUN mkdir -p /var/log/supervisor
# Force same configuration across all entrypoints
COPY deploy/mono/supervisord.conf /etc/supervisor/supervisord.conf

# Expose Web (3000) and API (8000)
EXPOSE 3000 8000

# Force supervisor to use the explicit config and stay in foreground
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
