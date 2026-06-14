import { timingSafeEqual } from 'node:crypto';

export function areStringsEqual(
  expected: string | null | undefined,
  provided: string | null | undefined
): boolean {
  if (typeof expected !== 'string' || typeof provided !== 'string') {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  const maxLen = Math.max(expectedBuffer.length, providedBuffer.length);
  const paddedExpected = Buffer.concat([expectedBuffer, Buffer.alloc(maxLen - expectedBuffer.length)]);
  const paddedProvided = Buffer.concat([providedBuffer, Buffer.alloc(maxLen - providedBuffer.length)]);

  const timingResult = timingSafeEqual(paddedExpected, paddedProvided);

  return timingResult && expectedBuffer.length === providedBuffer.length;
}

export function areHexDigestsEqual(
  expected: string | null | undefined,
  provided: string | null | undefined
): boolean {
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
