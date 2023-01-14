import { GetNotificationsFeedCommand } from '../../../widgets/usecases/get-notifications-feed/get-notifications-feed.command';

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

export const QUERY_PREFIX = '#query#';

export class KeyGenerator {
  public static feed = (command: GetNotificationsFeedCommand): string =>
    buildQueryKey({
      type: CacheKeyTypeEnum.QUERY,
      keyPrefix: CacheKeyPrefixEnum.FEED,
      environmentId: command.environmentId,
      identifierPrefix: 's',
      identifier: command.subscriberId,
      query: command as unknown as Record<string, unknown>,
    });

  public static invalidateFeed = ({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): string =>
    buildCommonKey({
      type: CacheKeyTypeEnum.QUERY,
      keyPrefix: CacheKeyPrefixEnum.FEED,
      environmentId: _environmentId,
      identifierPrefix: 's',
      identifier: subscriberId,
    });

  public static subscriber = ({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): string =>
    buildCommonKey({
      type: CacheKeyTypeEnum.ENTITY,
      keyPrefix: CacheKeyPrefixEnum.SUBSCRIBER,
      environmentId: _environmentId,
      identifierPrefix: 's',
      identifier: subscriberId,
    });
}

const buildQueryKey = ({
  type,
  keyPrefix,
  environmentIdPrefix = 'e',
  environmentId,
  identifierPrefix = 'i',
  identifier,
  query,
}: {
  type: CacheKeyTypeEnum;
  keyPrefix: CacheKeyPrefixEnum;
  environmentIdPrefix?: string;
  environmentId: string;
  identifierPrefix?: string;
  identifier: string;
  query: Record<string, unknown>;
}): string =>
  `${buildCommonKey({
    type,
    keyPrefix,
    environmentIdPrefix,
    environmentId,
    identifierPrefix,
    identifier,
  })}:${QUERY_PREFIX}=${JSON.stringify(query)}`;

const buildCommonKey = ({
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
}): string => `${type}:${keyPrefix}:${environmentIdPrefix}=${environmentId}:${identifierPrefix}=${identifier}`;
