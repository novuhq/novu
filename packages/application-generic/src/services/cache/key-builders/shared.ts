/**
 ***************************************
 *         BASE KEY BUILDERS
 ***************************************
 */

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
const buildParentScopedKeyById = ({
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
}): string =>
  prefixWrapper(
    `${type}:${keyEntity}:${parentIdPrefix}=${parentId}:${identifierPrefix}=${identifier}`
  );

/**
 * Use this to build a key for entities that are scoped to an environment or organization
 */
const buildScopedKey = ({
  type,
  keyEntity,
  scopedIdPrefix,
  scopedId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  scopedIdPrefix: OrgScopePrefixEnum;
  scopedId: string;
}): string =>
  prefixWrapper(`${type}:${keyEntity}:${scopedIdPrefix}=${scopedId}`);

/**
 * Use this to build a key for entities that are unscoped (do not belong to a hierarchy)
 */
export const buildUnscopedKey = ({
  type,
  keyEntity,
  identifierPrefix = IdentifierPrefixEnum.ID,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  identifierPrefix?: IdentifierPrefixEnum;
  identifier: string;
}): string =>
  prefixWrapper(`${type}:${keyEntity}:${identifierPrefix}=${identifier}`);

/**
 ***************************************
 *         SCOPED KEY BUILDERS
 ***************************************
 */

/**
 *
 * Use this to build a key for entities that are scoped to an environment
 * and have their own unique identifier.
 */
export const buildEnvironmentScopedKeyById = ({
  type,
  keyEntity,
  environmentId,
  identifierPrefix,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentId: string;
  identifierPrefix: IdentifierPrefixEnum;
  identifier: string;
}): string =>
  buildParentScopedKeyById({
    type,
    keyEntity,
    parentIdPrefix: OrgScopePrefixEnum.ENVIRONMENT_ID,
    parentId: environmentId,
    identifierPrefix,
    identifier,
  });

/**
 * Use this to build a key for entities that are scoped to an organization
 * and have their own unique identifier.
 */
export const buildOrganizationScopedKeyById = ({
  type,
  keyEntity,
  organizationId,
  identifierPrefix,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  organizationId: string;
  identifierPrefix: IdentifierPrefixEnum;
  identifier: string;
}): string =>
  buildParentScopedKeyById({
    type,
    keyEntity,
    parentIdPrefix: OrgScopePrefixEnum.ORGANIZATION_ID,
    parentId: organizationId,
    identifierPrefix,
    identifier,
  });

/**
 * Use this to build a key for entities that are scoped to an environment
 */
export const buildEnvironmentScopedKey = ({
  type,
  keyEntity,
  environmentId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentId: string;
}): string =>
  buildScopedKey({
    type,
    keyEntity,
    scopedIdPrefix: OrgScopePrefixEnum.ENVIRONMENT_ID,
    scopedId: environmentId,
  });

/**
 * Use this to build a key for entities that are scoped to an organization
 */
export const buildOrganizationScopedKey = ({
  type,
  keyEntity,
  organizationId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  organizationId: string;
}): string =>
  buildScopedKey({
    type,
    keyEntity,
    scopedIdPrefix: OrgScopePrefixEnum.ORGANIZATION_ID,
    scopedId: organizationId,
  });

/**
 * Use this to build a key for service configs that are unscoped (do not belong to a hierarchy).
 * An example of a service config is the maximum API rate limit.
 */
export const buildServiceConfigKey = (
  identifier: ServiceConfigIdentifierEnum
): string =>
  buildUnscopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SERVICE_CONFIG,
    identifierPrefix: IdentifierPrefixEnum.SERVICE_CONFIG,
    identifier,
  });

/**
 ***************************************
 *       KEY BUILDER IDENTIFIERS
 ***************************************
 */

/**
 * The prefix used to identify a query key.
 */
export const QUERY_PREFIX = '#query#';

/**
 * Add an entry to this enum when you have a new entity that needs to be cached.
 */
export enum CacheKeyPrefixEnum {
  MESSAGE_COUNT = 'message_count',
  FEED = 'feed',
  SUBSCRIBER = 'subscriber',
  NOTIFICATION_TEMPLATE = 'notification_template',
  WORKFLOW_VARIABLES = 'workflow_variables',
  USER = 'user',
  INTEGRATION = 'integration',
  ENVIRONMENT_BY_API_KEY = 'environment_by_api_key',
  GROUPED_BLUEPRINTS = 'grouped-blueprints',
  AUTH_SERVICE = 'auth_service',
  MAXIMUM_API_RATE_LIMIT = 'maximum_api_rate_limit',
  EVALUATE_API_RATE_LIMIT = 'evaluate_api_rate_limit',
  SERVICE_CONFIG = 'service_config',
  SUBSCRIPTION = 'subscription',
  USAGE = 'usage',
}

/**
 * The type of cache key. This is used to differentiate between different types of cache keys.
 * Add an entry to this enum when you have a new type of cache key.
 */
export enum CacheKeyTypeEnum {
  ENTITY = 'entity',
  QUERY = 'query',
}

/**
 * Add an entry to this enum when you have a new entity that has it's own unique identifier.
 */
export enum IdentifierPrefixEnum {
  ID = 'i',
  SUBSCRIBER_ID = 's',
  TEMPLATE_IDENTIFIER = 't_i',
  API_KEY = 'a_k',
  GROUPED_BLUEPRINT = 'g_b',
  API_RATE_LIMIT_CATEGORY = 'a_r_l_c',
  SERVICE_CONFIG = 's_c',
  RESOURCE_TYPE = 'r_t',
}

/**
 * Add an entry to this enum when you have a new service config that needs to be cached.
 */
export enum ServiceConfigIdentifierEnum {
  API_RATE_LIMIT_SERVICE_MAXIMUM = 'api_rate_limit_service_maximum',
}

/**
 * The list of prefixes aligned to top-level Novu domains.
 * This is used to scope cache keys to a specific environment or organization.
 */
export enum OrgScopePrefixEnum {
  ENVIRONMENT_ID = 'e',
  ORGANIZATION_ID = 'o',
}

/**
 * The identifier for the blueprint used to group entities by category.
 */
export const BLUEPRINT_IDENTIFIER = 'blueprints/group-by-category';
