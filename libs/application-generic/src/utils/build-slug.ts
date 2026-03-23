import { ShortIsPrefixEnum, Slug, slugify } from '@novu/shared';
import { encodeBase62 } from './base62';

const SLUG_DELIMITER = '_';

/**
 * Builds a slug for a step based on the step name, the short prefix and the internal ID.
 * @returns The slug for the entity, example:  slug: "workflow-name_wf_AbC1Xyz9KlmNOpQr"
 */
export function buildSlug(entityName: string, shortIdPrefix: ShortIsPrefixEnum, internalId: string): Slug {
  return `${slugify(entityName)}${SLUG_DELIMITER}${shortIdPrefix}${encodeBase62(internalId)}`;
}
