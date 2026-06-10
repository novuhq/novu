import { NovuApiError } from './api/client';

const KEYLESS_LIMIT_MESSAGE_MARKERS = [
  'daily keyless demo limit reached',
  'daily agent generation limit reached',
  'keyless demo environment has reached its agent limit',
  'keyless agent ai is temporarily unavailable',
  'unable to verify request origin for this demo request',
] as const;

export function isKeylessLimitError(err: unknown): boolean {
  const message = extractErrorMessage(err)?.toLowerCase();

  if (!message) {
    return false;
  }

  return KEYLESS_LIMIT_MESSAGE_MARKERS.some((marker) => message.includes(marker));
}

export function canFallbackFromKeylessToAuth(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY) && process.env.CI !== 'true';
}

function extractErrorMessage(err: unknown): string | undefined {
  if (err instanceof NovuApiError) {
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return undefined;
}
