const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'email', 'phone', 'bearer'];
const MAX_PAYLOAD_SIZE = 10240; // 10KB

function maskSensitive(obj: any): any {
  if (Array.isArray(obj)) return obj.map(maskSensitive);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYS.some((s) => lowerKey.includes(s));
        if (isSensitive) return [key, '***'];

        return [key, maskSensitive(value)];
      })
    );
  }

  return obj;
}

export function sanitizePayload(payload: any): string {
  try {
    const masked = maskSensitive(payload);
    let str = JSON.stringify(masked);
    if (str.length > MAX_PAYLOAD_SIZE) {
      str = `${str.slice(0, MAX_PAYLOAD_SIZE)}...`;
    }

    return str;
  } catch {
    return '[Unserializable Payload]';
  }
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 3, initialDelayMs = 100): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
