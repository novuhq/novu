const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'email', 'phone', 'bearer'];
const MAX_PAYLOAD_SIZE = 51200; // 50KB

export function sanitizePayload(payload: Record<string, unknown>): string {
  if (!payload) return '';

  try {
    let str = JSON.stringify(payload);
    if (str.length > MAX_PAYLOAD_SIZE) {
      str = `${str.slice(0, MAX_PAYLOAD_SIZE)}...`;
    }

    return str;
  } catch {
    return '[Unserializable Payload]';
  }
}
