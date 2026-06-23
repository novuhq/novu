import { BaseRepository } from '@novu/dal';
import { ShortIsPrefixEnum } from '@novu/shared';
import { decodeBase62 } from '../utils/base62';

export type InternalId = string;
const INTERNAL_ID_LENGTH = 24;
const ENCODED_ID_LENGTH = 16;

/**
 * Full slug shape produced by `buildSlug` in `utils/build-slug.ts`:
 *   `<slugified-name>_<ShortIsPrefixEnum><16-char base62 ID>`
 *
 * Example: `welcome-email_wf_AbC1Xyz9KlmNOpQr`
 *
 * We only attempt to base62-decode the trailing segment when the input matches
 * this exact shape. Without this guard, any string ≥ 16 characters whose last
 * 16 characters happen to be pure base62 (alphanumeric) would be decoded —
 * and because base62-decoding 16 alphanumeric characters frequently yields a
 * 24-character hex string that passes the Mongo ObjectId check, the function
 * would silently return a fabricated "internal id" and the downstream lookup
 * would fail with 404 (customer-supplied code-based workflow IDs like
 * `UP018A_CompanyConnectionRejectedWithoutReaso` were being mis-parsed into
 * non-existent ObjectIds).
 *
 * Slugified names are lowercase alphanumeric with hyphens only (`slugify` never
 * emits underscores). Prefixes are the closed set from `ShortIsPrefixEnum`
 * (`wf_`, `st_`, `env_`, `lt_`), which together differentiate real slugs from
 * user-supplied identifiers such as `MyWorkflow_wf_1111111111111111`.
 */
const ESCAPED_SLUG_PREFIXES = Object.values(ShortIsPrefixEnum)
  .map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const SLUG_PATTERN = new RegExp(`^[a-z0-9-]+_(${ESCAPED_SLUG_PREFIXES})[0-9A-Za-z]{16}$`);

/**
 * Checks if the value is a short resource identifier (less than encoded ID length)
 * Examples: 'welcome-email', 'my-template', 'newsletter-topic'
 */
function isShortResourceIdentifier(value: string): boolean {
  return value.length < ENCODED_ID_LENGTH;
}

/**
 * Checks if the value is a MongoDB internal ID (24 character ObjectId)
 * Examples: '6615943e7ace93b0540ae377', '507f1f77bcf86cd799439011'
 */
function isInternalId(value: string): boolean {
  return BaseRepository.isInternalId(value) && value.length === INTERNAL_ID_LENGTH;
}

/**
 * Determines if the value is a valid resource identifier
 * Returns the value if it's either an internal ID or short identifier, null otherwise
 */
function lookoutForResourceId(value: string): string | null {
  if (isInternalId(value)) {
    return value;
  }

  if (isShortResourceIdentifier(value)) {
    return value;
  }

  return null;
}

/**
 * Parses a slug ID and returns the internal resource ID
 *
 * Handles multiple input formats:
 * - MongoDB ObjectId: '6615943e7ace93b0540ae377' → '6615943e7ace93b0540ae377'
 * - Short identifier: 'welcome-email' → 'welcome-email'
 * - Slug format: 'welcome-email_wf_1A2B3C4D5E6F7890' → '6615943e7ace93b0540ae377' (decoded)
 * - Invalid format: 'invalid-slug_bad_encoding' → 'invalid-slug_bad_encoding' (unchanged)
 * - User-supplied code workflow IDs (e.g. 'UP018A_CompanyConnectionRejectedWithoutReaso')
 *   → returned unchanged so downstream lookup can match on `triggers.identifier`.
 *
 * @param value - The input value to parse
 * @returns The parsed internal ID or original value if parsing fails
 */
export function parseSlugId(value: string): InternalId {
  if (!value) {
    return value;
  }

  // Check if it's already a valid resource identifier
  const validId = lookoutForResourceId(value);
  if (validId) {
    return validId;
  }

  // Only treat the input as an encoded slug when it matches the shape that
  // `buildSlug` produces. This prevents arbitrary user identifiers from being
  // accidentally decoded into a valid-looking ObjectId.
  if (!SLUG_PATTERN.test(value)) {
    return value;
  }

  // Try to extract and decode the base62 encoded part from the end
  const encodedValue = value.slice(-ENCODED_ID_LENGTH);
  let decodedValue: string;

  try {
    decodedValue = decodeBase62(encodedValue);
  } catch (error) {
    // If decoding fails, return the original value
    return value;
  }

  // Check if the decoded value is a valid resource identifier
  const validDecodedId = lookoutForResourceId(decodedValue);
  if (validDecodedId) {
    return validDecodedId;
  }

  // If decoded value is not valid, return the original value
  return value;
}
