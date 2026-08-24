const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
/** LocalStack loopback hosts. Any other loopback target is SSRF. */
const HYDRATABLE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
/** Default LocalStack edge port from `docker/local/docker-compose.yml`. */
const LOCALSTACK_PORT = '4566';
/** Matches API ingress (`AgentAttachmentStorage` 25 MiB per file). */
export const MAX_HYDRATED_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/**
 * Claude (and most hosted providers) fetch `url` sources themselves.
 * That only works for public HTTPS — not LocalStack `http://localhost:4566/...`.
 */
export function isProviderFetchableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return parsed.protocol === 'https:' && !LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Server-side hydration is a LocalStack-only escape hatch for hosted models
 * that cannot fetch `http://localhost:4566/...`. It is disabled in production
 * and never follows arbitrary loopback ports (e.g. `:8080` admin panels).
 */
export function isHydratableAttachmentUrl(url: string): boolean {
  try {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    if (parsed.username || parsed.password) {
      return false;
    }

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!HYDRATABLE_HOSTS.has(host)) {
      return false;
    }

    return parsed.port === LOCALSTACK_PORT;
  } catch {
    return false;
  }
}

/**
 * Download bytes for a LocalStack URL the hosted model cannot fetch. Returns
 * `null` when the object is missing, not a hydratable LocalStack URL, or
 * larger than ingress allows so hydration can drop that part instead of
 * aborting the agent turn.
 */
export async function fetchUnreachableAttachmentBytes(url: string): Promise<Uint8Array | null> {
  if (!isHydratableAttachmentUrl(url)) {
    return null;
  }

  let response: Response;
  try {
    response = await fetch(url, { redirect: 'error', credentials: 'omit' });
  } catch {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch attachment (${response.status})`);
  }

  const contentLength = Number(response.headers?.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_HYDRATED_ATTACHMENT_BYTES) {
    return null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_HYDRATED_ATTACHMENT_BYTES) {
    return null;
  }

  return bytes;
}

export async function fetchUnreachableAttachmentBase64(url: string): Promise<string | null> {
  const bytes = await fetchUnreachableAttachmentBytes(url);
  if (!bytes) {
    return null;
  }

  return Buffer.from(bytes).toString('base64');
}
