import { CacheKeyPrefixEnum, CacheKeyTypeEnum, IdentifierPrefixEnum, OrgScopePrefixEnum } from './identifiers';

/**
 * Wraps the entire prefix string with curly braces. This has the effect of ensuring
 * that the entire prefix string is treated as a single key part by Redis.
 *
 * This must be revisited as the Redis Cluster deployment moves beyond a single shard
 * to ensure that the key-space is distributed evenly.
 *
 * @see https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags
 *
 * @param prefixString The prefix string to wrap.
 * @returns The prefix string wrapped with curly braces.
 */
export function prefixWrapper(prefixString: string) {
  return `{${prefixString}}`;
}

/**
 * Use this to build a key for entities that are scoped to an environment or organization
 * and have their own unique identifier.
 *
 * These keys take the shape:
 * `type:keyEntity:parentIdPrefix=parentId:identifierPrefix=identifier`
 */
export const buildParentScopedKeyById = ({
  type,
  keyEntity,
  parentIdPrefix,
  parentId,
  identifierPrefix,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  parentIdPrefix: OrgScopePrefixEnum;
  parentId: string;
  identifierPrefix: IdentifierPrefixEnum;
  identifier: string;
}): string => prefixWrapper(`${type}:${keyEntity}:${parentIdPrefix}=${parentId}:${identifierPrefix}=${identifier}`);

/**
 * Use this to build a key for entities that are scoped to an environment or organization
 */
export const buildScopedKey = ({
  type,
  keyEntity,
  scopedIdPrefix,
  scopedId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  scopedIdPrefix: OrgScopePrefixEnum;
  scopedId: string;
}): string => prefixWrapper(`${type}:${keyEntity}:${scopedIdPrefix}=${scopedId}`);

/**
 * Use this to build a key for entities that are unscoped (do not belong to a hierarchy)
 */
export const buildUnscopedKey = ({
  type,
  keyEntity,
  identifierPrefix,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  identifierPrefix: IdentifierPrefixEnum;
  identifier: string;
}): string => prefixWrapper(`${type}:${keyEntity}:${identifierPrefix}=${identifier}`);
