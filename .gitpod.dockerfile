FROM gitpod/workspace-mongodb

RUN sudo apt-get update  && sudo apt-get install -y redis-server  && sudo rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9.11.0
