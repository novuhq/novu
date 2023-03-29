import { GetNotificationsFeedCommand } from '../../../../widgets/usecases/get-notifications-feed/get-notifications-feed.command';
import { GetFeedCountCommand } from '../../../../widgets/usecases/get-feed-count/get-feed-count.command';
import {
  buildCommonKey,
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
  IdentifierPrefixEnum,
  OrgScopePrefixEnum,
  QUERY_PREFIX,
} from './shared';

const buildFeedKey = () => {
  const cache = (command: GetNotificationsFeedCommand): string =>
    buildQueryKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.FEED,
      environmentId: command.environmentId,
      identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
      identifier: command.subscriberId,
      query: command as unknown as Record<string, unknown>,
    });

  const invalidate = ({ subscriberId, _environmentId }: { subscriberId: string; _environmentId: string }): string =>
    buildCommonKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.FEED,
      environmentId: _environmentId,
      identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
      identifier: subscriberId,
    });

  return {
    cache,
    invalidate,
  };
};

const buildMessageCountKey = () => {
  const cache = (command: GetFeedCountCommand): string =>
    buildQueryKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.MESSAGE_COUNT,
      environmentId: command.environmentId,
      identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
      identifier: command.subscriberId,
      query: command as unknown as Record<string, unknown>,
    });

  const invalidate = ({ subscriberId, _environmentId }: { subscriberId: string; _environmentId: string }): string =>
    buildCommonKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.MESSAGE_COUNT,
      environmentId: _environmentId,
      identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
      identifier: subscriberId,
    });

  return {
    cache,
    invalidate,
  };
};

const buildNotificationTemplateKey = () => {
  const cache = (options: IBuildNotificationTemplateByIdentifier): string =>
    buildQueryKeyByEnvironment({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE,
      environmentId: options._environmentId,
      query: options as unknown as Record<string, unknown>,
    });

  const invalidate = ({ _environmentId }: { _environmentId: string }): string =>
    buildKeyBaseByEnvironment({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE,
      environmentId: _environmentId,
    });

  return {
    cache,
    invalidate,
  };
};

const buildQueryKeyByEnvironment = ({
  type,
  keyEntity,
  environmentIdPrefix = OrgScopePrefixEnum.ENVIRONMENT_ID,
  environmentId,
  query,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: OrgScopePrefixEnum;
  environmentId: string;
  query: Record<string, unknown>;
}): string => {
  const keyBase = buildKeyBaseByEnvironment({
    type,
    keyEntity,
    environmentIdPrefix,
    environmentId,
  });

  return `${keyBase}:${QUERY_PREFIX}=${JSON.stringify(query)}`;
};

const buildKeyBaseByEnvironment = ({
  type,
  keyEntity,
  environmentIdPrefix = OrgScopePrefixEnum.ENVIRONMENT_ID,
  environmentId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: OrgScopePrefixEnum;
  environmentId: string;
}): string => `${type}:${keyEntity}:${environmentIdPrefix}=${environmentId}`;

export const buildQueryKey = ({
  type,
  keyEntity,
  environmentIdPrefix = OrgScopePrefixEnum.ENVIRONMENT_ID,
  environmentId,
  identifierPrefix = IdentifierPrefixEnum.ID,
  identifier,
  query,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentIdPrefix?: OrgScopePrefixEnum;
  environmentId: string;
  identifierPrefix?: IdentifierPrefixEnum;
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

export interface IBuildNotificationTemplateByIdentifier {
  _environmentId: string;
  identifiers: ({ id: string } & { triggerIdentifier?: string }) | ({ id?: string } & { triggerIdentifier: string });
}

export { buildFeedKey, buildMessageCountKey, buildNotificationTemplateKey };
