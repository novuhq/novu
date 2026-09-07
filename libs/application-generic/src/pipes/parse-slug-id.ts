import { BaseRepository } from '@novu/dal';
import { ShortIsPrefixEnum } from '@novu/shared';
import { decodeBase62 } from '../utils/base62';

export type InternalId = string;
const INTERNAL_ID_LENGTH = 24;
const ENCODED_ID_LENGTH = 16;

/**
 * The step prefix was `stp_` before it was shortened to `st_`. Slugs built back then can
 * still reach us from bookmarked dashboard URLs, so they stay decodable.
 */
const LEGACY_SHORT_ID_PREFIXES = ['stp_'] as const;

/**
 * Prefixes that `buildSlug` (and its historical variants) put before the encoded internal ID.
 * Decode is intentionally limited to these — every 16-character base62 string can look like a
 * valid ObjectId after decoding, so bare identifiers of any length must never be decoded.
 */
const DECODABLE_PREFIXES = [...Object.values(ShortIsPrefixEnum), ...LEGACY_SHORT_ID_PREFIXES] as const;

/**
 * Checks if the value is a MongoDB internal ID (24 character ObjectId)
 * Examples: '6615943e7ace93b0540ae377', '507f1f77bcf86cd799439011'
 */
function isInternalId(value: string): boolean {
  return BaseRepository.isInternalId(value) && value.length === INTERNAL_ID_LENGTH;
}

/**
 * Inverse of `buildSlug`: `${name}_${prefix}${encodeBase62(id)}`.
 * Returns the trailing encoded ID only when the value has a non-empty name and a known prefix.
 * Identifiers of any length without that shape (including exact 16-char ones like
 * `exerciseReminder`) return null and are left unchanged by the caller.
 */
function extractEncodedId(value: string): string | null {
  if (value.length <= ENCODED_ID_LENGTH) {
    return null;
  }

  const encodedValue = value.slice(-ENCODED_ID_LENGTH);
  const withoutEncoded = value.slice(0, -ENCODED_ID_LENGTH);

  for (const prefix of DECODABLE_PREFIXES) {
    // ShortIsPrefixEnum values already include the trailing underscore (e.g. 'wf_').
    // buildSlug joins name + '_' + prefix + encodedId, so withoutEncoded ends with `_${prefix}`.
    const suffix = `_${prefix}`;
    if (!withoutEncoded.endsWith(suffix)) {
      continue;
    }

    const name = withoutEncoded.slice(0, -suffix.length);
    if (!name) {
      continue;
    }

    return encodedValue;
  }

  return null;
}

/**
 * Parses a slug ID and returns the internal resource ID
 *
 * Handles multiple input formats:
 * - MongoDB ObjectId: '6615943e7ace93b0540ae377' → '6615943e7ace93b0540ae377'
 * - Resource identifier (any length): 'welcome-email' / 'exerciseReminder' / 'dailyDigestPatient' → unchanged
 * - Slug format: 'welcome-email_wf_1A2B3C4D5E6F7890' → '6615943e7ace93b0540ae377' (decoded)
 * - Invalid format: 'invalid-slug_bad_encoding' → 'invalid-slug_bad_encoding' (unchanged)
 *
 * @param value - The input value to parse
 * @returns The parsed internal ID or original value if parsing fails
 */
export function parseSlugId(value: string): InternalId {
  if (!value || isInternalId(value)) {
    return value;
  }

  const encodedValue = extractEncodedId(value);
  if (!encodedValue) {
    return value;
  }

  try {
    const decodedValue = decodeBase62(encodedValue);

    return isInternalId(decodedValue) ? decodedValue : value;
  } catch {
    // If decoding fails, return the original value
    return value;
  }
}
