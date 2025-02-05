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
  AUTH_SERVICE = 'auth_service',
  ENVIRONMENT_BY_API_KEY = 'environment_by_api_key',
  EVALUATE_API_RATE_LIMIT = 'evaluate_api_rate_limit',
  FEED = 'feed',
  GROUPED_BLUEPRINTS = 'grouped-blueprints',
  HAS_NOTIFICATION = 'has_notification',
  INTEGRATION = 'integration',
  MAXIMUM_API_RATE_LIMIT = 'maximum_api_rate_limit',
  MESSAGE_COUNT = 'message_count',
  NOTIFICATION_TEMPLATE = 'notification_template',
  SERVICE_CONFIG = 'service_config',
  SUBSCRIBER = 'subscriber',
  SUBSCRIBER_DEDUP = 'subscriber_deduplication',
  SUBSCRIBER_TOPICS = 'subscriber_topics',
  SUBSCRIPTION = 'subscription',
  USAGE = 'usage',
  USER = 'user',
  WORKFLOW_VARIABLES = 'workflow_variables',
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
