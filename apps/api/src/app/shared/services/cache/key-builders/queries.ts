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

export { buildFeedKey, buildMessageCountKey };
