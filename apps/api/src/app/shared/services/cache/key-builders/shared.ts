export const buildCommonKey = ({
  type,
  keyEntity,
  environmentIdPrefix = 'e',
  environmentId,
  identifierPrefix = 'i',
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: string;
  environmentId: string;
  identifierPrefix?: string;
  identifier: string;
}): string => `${type}:${keyEntity}:${environmentIdPrefix}=${environmentId}:${identifierPrefix}=${identifier}`;

export const QUERY_PREFIX = '#query#';

export enum CacheKeyPrefixEnum {
  MESSAGE_COUNT = 'message_count',
  FEED = 'feed',
  SUBSCRIBER = 'subscriber',
  NOTIFICATION_TEMPLATE = 'notification_template',
  USER = 'user',
  INTEGRATION = 'integration',
  ENVIRONMENT_BY_API_KEY = 'environment_by_api_key',
}

export enum CacheKeyTypeEnum {
  ENTITY = 'entity',
  QUERY = 'query',
}
