# Cursor Background Agent base image for Novu.
#
# Cursor takes over PID 1, so this image intentionally:
#   - does NOT define ENTRYPOINT / CMD / HEALTHCHECK (they would never run)
#   - does NOT bake in MongoDB / Redis / ClickHouse / LocalStack
#
# Runtime services come up via `docker compose -f docker/local/docker-compose.agent.yml`
# from `.cursor/environment.json` after the container starts.
#
# Multi-repo note: `packages-enterprise` is a private sibling repo. Cursor's
# multi-repo environment clones it next to `novu/`; `.cursor/scripts/install.sh`
# wires `.source` -> the sibling clone so `pnpm symlink:submodules` works.

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Base toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    ca-certificates \
    curl \
    git \
    gnupg \
    iptables \
    jq \
    lsb-release \
    openssh-client \
    python3 \
    python3-pip \
    sudo \
    tmux \
    wget \
 && rm -rf /var/lib/apt/lists/*

# fuse-overlayfs for Docker storage driver in nested-container envs
RUN apt-get update && apt-get install -y --no-install-recommends fuse-overlayfs \
 && rm -rf /var/lib/apt/lists/*

# Node.js 22 + pnpm + TypeScript
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/* \
 && npm --no-update-notifier --no-fund -g install pnpm@10.33.0 typescript@5.6.2 \
 && npm cache clean --force

# Docker (services run via `docker compose` at agent startup)
# Pattern from https://cursor.com/docs/cloud-agent/setup#recommended-dockerfile-for-complex-docker-setups
RUN mkdir -p /etc/apt/keyrings \
 && curl --retry 3 --retry-delay 5 -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
 && chmod a+r /etc/apt/keyrings/docker.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update && apt-get install -y --no-install-recommends \
      containerd.io \
      docker-buildx-plugin \
      docker-ce \
      docker-ce-cli \
      docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/docker \
 && printf '%s\n' '{' '  "storage-driver": "fuse-overlayfs"' '}' > /etc/docker/daemon.json \
 && update-alternatives --set iptables /usr/sbin/iptables-legacy \
 && update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# Non-root agent user (Cursor convention: USER=ubuntu, WORKDIR=/home/ubuntu)
RUN id -u ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu \
 && groupadd -f docker \
 && usermod -aG docker,sudo ubuntu \
 && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ubuntu \
 && chmod 0440 /etc/sudoers.d/ubuntu

# exec-daemon (runs as ubuntu) mkdir+chmods these on startup; root-owned dirs cause EPERM.
RUN mkdir -p /opt/cursor/artifacts/assets \
             /opt/cursor/artifacts/.cursor \
             /opt/cursor/recording-staging \
             /opt/cursor/logs \
 && chown -R ubuntu:ubuntu /opt/cursor \
 && chmod -R 0777 /opt/cursor

USER ubuntu
WORKDIR /home/ubuntu

ENV NX_DAEMON=false \
    PNPM_STORE_DIR=/home/ubuntu/.pnpm-store \
    PNPM_CACHE_DIR=/home/ubuntu/.pnpm-cache

RUN mkdir -p /home/ubuntu/.pnpm-store /home/ubuntu/.pnpm-cache \
 && pnpm config set store-dir /home/ubuntu/.pnpm-store \
 && pnpm config set cache-dir /home/ubuntu/.pnpm-cache \
 && pnpm config set network-timeout 60000 \
 && pnpm config set fetch-retries 3

LABEL org.novu.purpose="cursor-cloud-agent" \
      org.novu.image-version="2.0.2"
