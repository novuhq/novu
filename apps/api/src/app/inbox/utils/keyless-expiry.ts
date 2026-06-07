import { differenceInHours } from 'date-fns';
import { KEYLESS_ENVIRONMENT_PREFIX } from './keyless.constants';

const DEFAULT_KEYLESS_RETENTION_HOURS = 24;
const parsedRetentionHours = Number(process.env.KEYLESS_RETENTION_TIME_IN_HOURS);
const KEYLESS_RETENTION_TIME_IN_HOURS =
  Number.isInteger(parsedRetentionHours) && parsedRetentionHours >= 0
    ? parsedRetentionHours
    : DEFAULT_KEYLESS_RETENTION_HOURS;

function timestampHexToDate(timestampHex: string): Date {
  if (!timestampHex || typeof timestampHex !== 'string' || timestampHex.length < 8) {
    throw new Error('Invalid timestamp hex format');
  }

  const buffer = Buffer.from(timestampHex, 'hex');
  if (buffer.length < 4) {
    throw new Error('Buffer too small to read 32-bit integer');
  }

  const timestamp = buffer.readUInt32BE(0);

  return new Date(timestamp * 1000);
}

export function isKeylessEnvironmentExpired(applicationIdentifier: string | undefined): boolean {
  if (!applicationIdentifier) {
    return true;
  }

  const parts = applicationIdentifier.replace(KEYLESS_ENVIRONMENT_PREFIX, '').split('_');
  const createdDate = parts[0];

  if (!createdDate || createdDate.length < 8) {
    return true;
  }

  try {
    const createdDateTimestamp = timestampHexToDate(createdDate);
    const diffTimeInHours = differenceInHours(new Date(), createdDateTimestamp);

    if (diffTimeInHours > KEYLESS_RETENTION_TIME_IN_HOURS) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
}

export function keylessEnvironmentRetentionTtlSeconds(): number {
  return KEYLESS_RETENTION_TIME_IN_HOURS * 3600;
}
