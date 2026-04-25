# Shoujiki Mono-Container (Professional Monorepo Structure)
# This container runs API, Sandbox, and serves Web (standalone)

FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm install --legacy-peer-deps
COPY apps/web/ .
RUN npm run build

FROM python:3.11-slim AS runner

# Install dependencies
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

# Setup API
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

EXPOSE 3000 8000 8001

# Stay explicit
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
