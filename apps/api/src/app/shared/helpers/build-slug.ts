import { encodeBase62 } from '@novu/application-generic';
import { ShortIsPrefixEnum, Slug, slugify } from '@novu/shared';

const SLUG_DELIMITER = '_';

/**
 * Builds a slug for a step based on the step name, the short prefix and the internal ID.
 * @returns The slug for the entity, example:  slug: "workflow-name_wf_AbC1Xyz9KlmNOpQr"
 */
export function buildSlug(entityName: string, shortIsPrefix: ShortIsPrefixEnum, internalId: string): Slug {
  return `${slugify(entityName)}${SLUG_DELIMITER}${shortIsPrefix}${encodeBase62(internalId)}`;
}
