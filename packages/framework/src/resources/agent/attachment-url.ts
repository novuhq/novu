const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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

export async function fetchUnreachableAttachmentBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch attachment (${response.status})`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment exceeds ${MAX_ATTACHMENT_BYTES} bytes`);
  }

  return bytes;
}

export async function fetchUnreachableAttachmentBase64(url: string): Promise<string> {
  const bytes = await fetchUnreachableAttachmentBytes(url);

  return Buffer.from(bytes).toString('base64');
}
