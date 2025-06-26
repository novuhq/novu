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

export async function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 3, initialDelayMs = 100): Promise<T> {
  let delay = initialDelayMs;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts - 1) throw err;
      const currentDelay = delay;
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), currentDelay);
      });
      delay *= 2;
    }
  }
  throw new Error('Max attempts reached');
}
