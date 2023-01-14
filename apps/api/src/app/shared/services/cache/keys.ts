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
}

export class KeyGenerator {
  public static subscriber = ({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): string =>
    buildCommon({
      type: CacheKeyTypeEnum.ENTITY,
      keyPrefix: CacheKeyPrefixEnum.SUBSCRIBER,
      environmentId: _environmentId,
      identifierPrefix: 's',
      identifier: subscriberId,
    });
}

const buildCommon = ({
  type,
  keyPrefix,
  environmentIdPrefix = 'e',
  environmentId,
  identifierPrefix = 'i',
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyPrefix: CacheKeyPrefixEnum;
  environmentIdPrefix?: string;
  environmentId: string;
  identifierPrefix?: string;
  identifier: string;
}): string => `${type}:${keyPrefix}:${environmentIdPrefix}${environmentId}:${identifierPrefix}${identifier}`;
