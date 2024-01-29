/**
 * Use this to build a key for entities that are scoped to an environment
 */
export const buildCommonKey = ({
  type,
  keyEntity,
  environmentIdPrefix = OrgScopePrefixEnum.ENVIRONMENT_ID,
  environmentId,
  identifierPrefix = IdentifierPrefixEnum.ID,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: OrgScopePrefixEnum;
  environmentId: string;
  identifierPrefix?: IdentifierPrefixEnum;
  identifier: string;
}): string =>
  prefixWrapper(
    `${type}:${keyEntity}:${environmentIdPrefix}=${environmentId}:${identifierPrefix}=${identifier}`
  );

/**
 * Use this to build a key for entities that are scoped to an environment
 */
export const buildCommonEnvironmentKey = ({
  type,
  keyEntity,
  environmentIdPrefix = OrgScopePrefixEnum.ENVIRONMENT_ID,
  environmentId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: OrgScopePrefixEnum;
  environmentId: string;
}): string =>
  prefixWrapper(`${type}:${keyEntity}:${environmentIdPrefix}=${environmentId}`);

/**
 * Use this to build a key for entities that are unscoped (do not belong to a hierarchy)
 */
export const buildKeyById = ({
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

export function prefixWrapper(prefixString: string) {
  return `{${prefixString}}`;
}

export const QUERY_PREFIX = '#query#';

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
}

export enum CacheKeyTypeEnum {
  ENTITY = 'entity',
  QUERY = 'query',
}

export enum IdentifierPrefixEnum {
  ID = 'i',
  SUBSCRIBER_ID = 's',
  TEMPLATE_IDENTIFIER = 't_i',
  API_KEY = 'a_k',
  GROUPED_BLUEPRINT = 'g_b',
  API_RATE_LIMIT_CATEGORY = 'a_r_l_c',
  SERVICE_CONFIG = 's_c',
}

export enum ServiceConfigIdentifierEnum {
  API_RATE_LIMIT_SERVICE_MAXIMUM = 'api_rate_limit_service_maximum',
}

export enum OrgScopePrefixEnum {
  ENVIRONMENT_ID = 'e',
  ORGANIZATION_ID = 'o',
}

export const BLUEPRINT_IDENTIFIER = 'blueprints/group-by-category';
