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

# Resolve one PEM blob from either <prefix>_BASE64 or <prefix>_FILE and echo the
# path to it. Requiring exactly one of the two keeps a stale leftover variable
# from silently shadowing the value the operator meant to use.
resolve_tls_material() {
  prefix="$1"
  target="$2"

  eval "material_base64=\${${prefix}_BASE64:-}"
  eval "material_file=\${${prefix}_FILE:-}"

  if [ -n "$material_base64" ] && [ -n "$material_file" ]; then
    echo "${prefix}_BASE64 and ${prefix}_FILE are both set. Provide exactly one of them." >&2
    return 1
  fi

  if [ -z "$material_base64" ] && [ -z "$material_file" ]; then
    echo "NOVU_TLS_ENABLED is true but neither ${prefix}_BASE64 nor ${prefix}_FILE is set." >&2
    return 1
  fi

  if [ -n "$material_file" ]; then
    if [ ! -s "$material_file" ]; then
      echo "${prefix}_FILE (${material_file}) is missing or empty." >&2
      return 1
    fi

    printf '%s' "$material_file"
    return 0
  fi

  if ! printf '%s' "$material_base64" | base64 -d > "$target" 2>/dev/null; then
    echo "${prefix}_BASE64 could not be base64-decoded." >&2
    return 1
  fi

  if [ ! -s "$target" ]; then
    echo "${prefix}_BASE64 decoded to an empty file." >&2
    return 1
  fi

  printf '%s' "$target"
}

tls_requested=$(printf '%s' "${NOVU_TLS_ENABLED:-}" | tr '[:upper:]' '[:lower:]')

if [ "$tls_requested" = "true" ] || [ "$tls_requested" = "1" ] || [ "$tls_requested" = "yes" ]; then
  if [ "$NOVU_DASHBOARD_ENTERPRISE" != "true" ] || [ "$NOVU_DASHBOARD_SELF_HOSTED" != "true" ]; then
    echo "NOVU_TLS_ENABLED is only supported on enterprise self-hosted dashboard images. Unset it, or use an enterprise self-hosted build." >&2
    exit 1
  fi

  # http-server answers unresolved paths with 404.html, which is how client-side
  # routes keep working. The default CMD instead proxies them back to this
  # server's own port, and that cannot be reused once the port speaks TLS.
  cp /app/dist/index.html /app/dist/404.html || exit 1

  # The certificate arrives in the environment but http-server only takes paths,
  # so it is staged on disk; umask keeps the private key owner-only.
  umask 077
  tls_dir=/tmp/novu-tls
  mkdir -p "$tls_dir" || exit 1

  tls_cert=$(resolve_tls_material NOVU_TLS_CERT "$tls_dir/cert.pem") || exit 1
  tls_key=$(resolve_tls_material NOVU_TLS_KEY "$tls_dir/key.pem") || exit 1
  # Unused when serving, but the container health probe verifies against it.
  resolve_tls_material NOVU_TLS_CA "$tls_dir/ca.pem" > /dev/null || exit 1

  if [ -n "${NOVU_TLS_KEY_PASSPHRASE:-}" ]; then
    NODE_HTTP_SERVER_SSL_PASSPHRASE="$NOVU_TLS_KEY_PASSPHRASE"
    export NODE_HTTP_SERVER_SSL_PASSPHRASE
  fi

  if [ "$1" = "http-server" ]; then
    # Rotate the argument list to drop the self-proxy flags, then hand the
    # remaining arguments (port, directory, operator overrides) the TLS options.
    argument_count=$#
    processed=0
    skip_next=0

    while [ "$processed" -lt "$argument_count" ]; do
      argument="$1"
      shift
      processed=$((processed + 1))

      if [ "$skip_next" = "1" ]; then
        skip_next=0
        continue
      fi

      case "$argument" in
        -P | --proxy)
          skip_next=1
          continue
          ;;
        --proxy=*)
          continue
          ;;
      esac

      set -- "$@" "$argument"
    done

    exec "$@" -S -C "$tls_cert" -K "$tls_key"
  fi
fi

# Start your app (adjust as needed, e.g. serve or nginx)
exec "$@"
