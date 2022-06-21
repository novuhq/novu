FROM gitpod/workspace-mongodb

RUN sudo apt-get update  && sudo apt-get install -y redis-server  && sudo rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

RUN sudo apt-get install -y \
    libgtk2.0-0 \
    libgtk-3-0

RUN sudo DEBIAN_FRONTEND=noninteractive apt-get install -yq \
    libgbm-dev \
    libnotify-dev
    
RUN sudo apt-get install -y \
    libgconf-2-4 \
    libnss3 \
    libxss1

RUN sudo apt-get install -y \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb
