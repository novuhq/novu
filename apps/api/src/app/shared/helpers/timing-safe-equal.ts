import { timingSafeEqual } from 'node:crypto';

export function areHexDigestsEqual(expected: string | null | undefined, provided: string | null | undefined): boolean {
  if (typeof expected !== 'string' || typeof provided !== 'string') {
    return false;
  }

  if (expected.length !== provided.length) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(provided, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
