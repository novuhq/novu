import { GetNotificationsFeedCommand } from '../../../widgets/usecases/get-notifications-feed/get-notifications-feed.command';
import { GetFeedCountCommand } from '../../../widgets/usecases/get-feed-count/get-feed-count.command';

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

export const queryBuilder = () => {
  return { feed, messageCount };
};

export const entityBuilder = () => {
  return { subscriber, integration, user, environmentByApiKey };
};

export const buildQueryKey = ({
  type,
  keyEntity,
  environmentIdPrefix = 'e',
  environmentId,
  identifierPrefix = 'i',
  identifier,
  query,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: string;
  environmentId: string;
  identifierPrefix?: string;
  identifier: string;
  query: Record<string, unknown>;
}): string =>
  `${buildCommonKey({
    type,
    keyEntity,
    environmentIdPrefix,
    environmentId,
    identifierPrefix,
    identifier,
  })}:${QUERY_PREFIX}=${JSON.stringify(query)}`;

const feed = () => {
  const cache = (command: GetNotificationsFeedCommand): string =>
    buildQueryKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.FEED,
      environmentId: command.environmentId,
      identifierPrefix: 's',
      identifier: command.subscriberId,
      query: command as unknown as Record<string, unknown>,
    });

  const invalidate = ({ subscriberId, _environmentId }: { subscriberId: string; _environmentId: string }): string =>
    buildCommonKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.FEED,
      environmentId: _environmentId,
      identifierPrefix: 's',
      identifier: subscriberId,
    });

  return {
    cache,
    invalidate,
  };
};

const messageCount = () => {
  const cache = (command: GetFeedCountCommand): string =>
    buildQueryKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.MESSAGE_COUNT,
      environmentId: command.environmentId,
      identifierPrefix: 's',
      identifier: command.subscriberId,
      query: command as unknown as Record<string, unknown>,
    });

  const invalidate = ({ subscriberId, _environmentId }: { subscriberId: string; _environmentId: string }): string =>
    buildCommonKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.MESSAGE_COUNT,
      environmentId: _environmentId,
      identifierPrefix: 's',
      identifier: subscriberId,
    });

  return {
    cache,
    invalidate,
  };
};

const subscriber = ({ subscriberId, _environmentId }: { subscriberId: string; _environmentId: string }): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SUBSCRIBER,
    environmentId: _environmentId,
    identifierPrefix: 's',
    identifier: subscriberId,
  });

const integration = ({ _id, _environmentId }: { _id: string; _environmentId: string }): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.INTEGRATION,
    environmentId: _environmentId,
    identifier: _id,
  });

const user = ({ _id }: { _id: string }): string =>
  buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.USER,
    identifier: _id,
  });

const environmentByApiKey = ({ _id }: { _id: string }): string =>
  buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.ENVIRONMENT_BY_API_KEY,
    identifier: _id,
  });

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

export const buildKeyById = ({
  type,
  keyEntity,
  identifierPrefix = 'i',
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  identifierPrefix?: string;
  identifier: string;
}): string => `${type}:${keyEntity}:${identifierPrefix}=${identifier}`;

export const notificationTemplateQueryKeyBuild = () => {
  const cache = ({
    _environmentId,
    identifiers,
  }: {
    _environmentId: string;
    identifiers: ({ id: string } & { triggerIdentifier?: string }) | ({ id?: string } & { triggerIdentifier: string });
  }): string =>
    buildQueryKeyByEnvironment({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE,
      environmentId: _environmentId,
      query: identifiers as unknown as Record<string, unknown>,
    });

  const invalidate = ({ _environmentId }: { _environmentId: string }): string =>
    buildKeyByEnvironment({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE,
      environmentId: _environmentId,
    });

  return {
    cache,
    invalidate,
  };
};

/*
 * const notificationTemplate = ({ _id, _environmentId }: { _id: string; _environmentId: string }): string =>
 *   buildCommonKey({
 *     type: CacheKeyTypeEnum.ENTITY,
 *     keyEntity: CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE,
 *     environmentId: _environmentId,
 *     identifier: _id,
 *   });
 */

export const buildQueryKeyByEnvironment = ({
  type,
  keyEntity,
  environmentIdPrefix = 'e',
  environmentId,
  query,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: string;
  environmentId: string;
  query: Record<string, unknown>;
}): string => {
  const keyBase = buildKeyByEnvironment({
    type,
    keyEntity,
    environmentIdPrefix,
    environmentId,
  });

  return `${keyBase}:${QUERY_PREFIX}=${JSON.stringify(query)}`;
};

export const buildKeyByEnvironment = ({
  type,
  keyEntity,
  environmentIdPrefix = 'e',
  environmentId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: string;
  environmentId: string;
}): string => `${type}:${keyEntity}:${environmentIdPrefix}=${environmentId}`;
