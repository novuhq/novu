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

export function prefixWrapper(prefixString: string) {
  return `{${prefixString}}`;
}

export const QUERY_PREFIX = '#query#';

export enum CacheKeyPrefixEnum {
  MESSAGE_COUNT = 'message_count',
  FEED = 'feed',
  SUBSCRIBER = 'subscriber',
  NOTIFICATION_TEMPLATE = 'notification_template',
  USER = 'user',
  INTEGRATION = 'integration',
  ENVIRONMENT_BY_API_KEY = 'environment_by_api_key',
  GROUPED_BLUEPRINTS = 'grouped-blueprints',
  AUTH_SERVICE = 'auth_service',
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
}

export enum OrgScopePrefixEnum {
  ENVIRONMENT_ID = 'e',
  ORGANIZATION_ID = 'o',
}

export const BLUEPRINT_IDENTIFIER = 'blueprints/group-by-category';
