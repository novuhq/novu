import { BaseRepository } from '@novu/dal';
import { decodeBase62 } from '../utils/base62';

export type InternalId = string;
const INTERNAL_ID_LENGTH = 24;
const ENCODED_ID_LENGTH = 16;

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
