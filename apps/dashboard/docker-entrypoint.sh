#!/bin/sh

# Build window._env_ object dynamically from all VITE_ environment variables
ENV_VARS=""
for var in $(printenv | grep '^VITE_' | cut -d= -f1); do
  # Get the value of the environment variable
  eval value=\$$var
  # Escape single quotes in the value for safe JavaScript
  escaped_value=$(printf '%s\n' "$value" | sed "s/'/\\\\'/g")
  # Add to the ENV_VARS string
  ENV_VARS="${ENV_VARS}    ${var}: '${escaped_value}',\n"
done

# Build the complete script block
ENV_SCRIPT="<script>
  window._env_ = {
${ENV_VARS}  };
</script>"

# Escape newlines for safe sed usage
ESCAPED_SCRIPT=$(printf "%s\n" "$ENV_SCRIPT" | sed ':a;N;$!ba;s/\n/\\n/g')

# Inject just before the first <script type="module"> tag
sed -i "s@<script type=\"module\"@${ESCAPED_SCRIPT}\n<script type=\"module\"@" /app/dist/index.html

# Start your app (adjust as needed, e.g. serve or nginx)
exec "$@"