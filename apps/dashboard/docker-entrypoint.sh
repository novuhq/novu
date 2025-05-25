#!/bin/sh

# Safely build a <script> block assigning to window._env_
ENV_SCRIPT="<script>
  window._env_ = {
    VITE_API_HOSTNAME: '${VITE_API_HOSTNAME}',
    VITE_WEBSOCKET_HOSTNAME: '${VITE_WEBSOCKET_HOSTNAME}'
  };
</script>"

# Escape newlines for safe sed usage
ESCAPED_SCRIPT=$(printf "%s\n" "$ENV_SCRIPT" | sed ':a;N;$!ba;s/\n/\\n/g')

# Inject just before the first <script type="module"> tag
sed -i "s@<script type=\"module\"@${ESCAPED_SCRIPT}\n<script type=\"module\"@" /app/dist/index.html

# Start your app (adjust as needed, e.g. serve or nginx)
exec "$@"