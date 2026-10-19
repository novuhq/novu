import { slugify } from '@novu/shared';
import { shortId } from './generate-id';

/**
 * Returns slugify(name) if it produces a non-empty result,
 * otherwise falls back to a random short ID.
 * Handles names in non-Latin scripts (CJK, Arabic, etc.) whose characters
 * are entirely stripped during transliteration.
 */
export function slugifyOrRandom(name: string): string {
  const slug = slugify(name);

  return slug || shortId();
}
