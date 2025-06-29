# Dockerfile for Novu Development Environment - Optimized for Cursor AI Agent
# Ubuntu-based for full Cursor compatibility while maintaining significant optimizations
# Usage: docker build -t novu-cursor . && docker run -it --name novu-cursor -p 3000:3000 -p 4000:4000 -p 27017:27017 -p 6379:6379 novu-cursor

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install essential dependencies and MongoDB/Redis in a single layer
RUN apt-get update && apt-get install -y \
    # Essential tools
    curl \
    wget \
    git \
    bash \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    # Build tools for native modules
    build-essential \
    python3 \
    python3-pip \
    # Process management
    supervisor \
    # Clean up immediately
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install Node.js 20 using NodeSource repository (faster than using Node image)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install MongoDB and Redis from official repositories
RUN wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add - \
    && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && apt-get install -y \
        mongodb-org \
        redis-server \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install pnpm and TypeScript globally
RUN npm --no-update-notifier --no-fund --global install \
    pnpm@10.11.0 \
    typescript@5.6.2 \
    && npm cache clean --force

# Create minimal directory structure and set permissions (must be done as root)
RUN mkdir -p \
    /var/log/supervisor \
    /etc/supervisor/conf.d \
    /data/db \
    /data/redis \
    /workspace \
    /tmp/.pnpm-store \
    && chown mongodb:mongodb /data/db \
    && chown redis:redis /data/redis \
    && chmod 755 /data/db /data/redis

# Create optimized supervisor configuration (must be done as root)
RUN printf '[supervisord]\n\
nodaemon=false\n\
silent=true\n\
logfile=/dev/null\n\
pidfile=/var/run/supervisord.pid\n\
\n\
[include]\n\
files = /etc/supervisor/conf.d/*.conf\n' > /etc/supervisor/supervisord.conf \
    && printf '[program:mongodb]\n\
command=mongod --dbpath /data/db --bind_ip_all --port 27017 --replSet rs0 --quiet\n\
user=mongodb\n\
autorestart=true\n\
redirect_stderr=true\n\
stdout_logfile=/dev/null\n\
\n\
[program:redis]\n\
command=redis-server --bind 0.0.0.0 --port 6379 --dir /data/redis --save "" --logfile ""\n\
user=redis\n\
autorestart=true\n\
redirect_stderr=true\n\
stdout_logfile=/dev/null\n' > /etc/supervisor/conf.d/services.conf

# Create optimized startup script (must be done as root)
RUN printf '#!/bin/bash\n\
set -e\n\
echo "🚀 Novu Cursor Environment"\n\
supervisord -c /etc/supervisor/supervisord.conf\n\
timeout=15\n\
while ! mongosh --eval "db.runCommand('\''ping'\'')" >/dev/null 2>&1 && [ $timeout -gt 0 ]; do\n\
    sleep 1; timeout=$((timeout-1))\n\
done\n\
[ $timeout -gt 0 ] && mongosh --eval "try { rs.initiate() } catch(e) {}" >/dev/null 2>&1 || true\n\
timeout=10\n\
while ! redis-cli ping >/dev/null 2>&1 && [ $timeout -gt 0 ]; do\n\
    sleep 1; timeout=$((timeout-1))\n\
done\n\
echo "✅ MongoDB & Redis ready!"\n\
echo "🚀 Quick start: git clone https://github.com/novuhq/novu.git /workspace/novu"\n\
exec /bin/bash\n' > /usr/local/bin/start-dev.sh \
    && chmod +x /usr/local/bin/start-dev.sh

# Create non-root user as recommended for background agents
RUN useradd -m -s /bin/bash ubuntu \
    && echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && mkdir -p /home/ubuntu/.pnpm-store /home/ubuntu/.pnpm-cache \
    && chown -R ubuntu:ubuntu /home/ubuntu \
    && chown -R ubuntu:ubuntu /workspace

# Switch to non-root user
USER ubuntu

# Set working directory to home directory as recommended
WORKDIR /home/ubuntu

# Set up optimized environment variables
ENV NX_DAEMON=false \
    NODE_ENV=local \
    PNPM_STORE_DIR="/home/ubuntu/.pnpm-store" \
    PNPM_CACHE_DIR="/home/ubuntu/.pnpm-cache"

# Configure pnpm for speed and efficiency
RUN pnpm config set store-dir /home/ubuntu/.pnpm-store \
    && pnpm config set cache-dir /home/ubuntu/.pnpm-cache \
    && pnpm config set network-timeout 60000 \
    && pnpm config set fetch-retries 3

# Set workspace as working directory
WORKDIR /workspace

# Expose all necessary ports
EXPOSE 3000 4000 27017 6379

# Labels for identification
LABEL version="cursor-background-agent-1.0.0" \
      description="Novu development environment optimized for Cursor background agents"

# Health check for both services
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=2 \
    CMD mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/usr/local/bin/start-dev.sh"]
