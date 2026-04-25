FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    supervisor \
    redis-server \
    util-linux \
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

# Supervisor configuration
WORKDIR /app
RUN mkdir -p /var/log/supervisor
# Explicitly copy to /etc/supervisor/supervisord.conf to override EVERYTHING
COPY deploy/render-backend/supervisord.conf /etc/supervisor/supervisord.conf
# Also copy to a backup location just in case
COPY deploy/render-backend/supervisord.conf /app/supervisord.conf

# Expose ONLY the API port to Render
EXPOSE 8000

# Force supervisor to use the explicit config and stay in foreground
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
