import { buildEnvironmentScopedKeyById, buildOrganizationScopedKey } from './builder.scoped';
import { CacheKeyPrefixEnum, CacheKeyTypeEnum, IdentifierPrefixEnum, QUERY_PREFIX } from './identifiers';

export const buildFeedKey = () => {
  const cache = (
    command: Record<string, unknown> & {
      environmentId: string;
      subscriberId: string;
    }
  ): string =>
    buildQueryKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.FEED,
      environmentId: command.environmentId,
      identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
      identifier: command.subscriberId,
      query: command,
    });

  const invalidate = ({ subscriberId, _environmentId }: { subscriberId: string; _environmentId: string }): string =>
    buildEnvironmentScopedKeyById({
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

export const buildMessageCountKey = () => {
  const cache = (
    command: Record<string, unknown> & {
      environmentId: string;
      subscriberId: string;
    }
  ): string =>
    buildQueryKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.MESSAGE_COUNT,
      environmentId: command.environmentId,
      identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
      identifier: command.subscriberId,
      query: command,
    });

  const invalidate = ({ subscriberId, _environmentId }: { subscriberId: string; _environmentId: string }): string =>
    buildEnvironmentScopedKeyById({
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

export const buildIntegrationKey = () => {
  const cache = (command: Record<string, unknown> & { _organizationId: string }): string =>
    buildQueryByOrganizationKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.INTEGRATION,
      organizationId: command._organizationId,
      query: command,
    });

  const invalidate = ({ _organizationId }: { _organizationId: string }): string =>
    buildOrganizationScopedKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.INTEGRATION,
      organizationId: _organizationId,
    });

  return {
    cache,
    invalidate,
  };
};

export const buildQueryKey = ({
  type,
  keyEntity,
  environmentId,
  identifierPrefix = IdentifierPrefixEnum.ID,
  identifier,
  query,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentId: string;
  identifierPrefix?: IdentifierPrefixEnum;
  identifier: string;
  query: Record<string, unknown>;
}): string =>
  `${buildEnvironmentScopedKeyById({
    type,
    keyEntity,
    environmentId,
    identifierPrefix,
    identifier,
  })}:${QUERY_PREFIX}=${JSON.stringify(query)}`;

export const buildQueryByOrganizationKey = ({
  type,
  keyEntity,
  organizationId,
  query,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  organizationId: string;
  query: Record<string, unknown>;
}): string =>
  `${buildOrganizationScopedKey({
    type,
    keyEntity,
    organizationId,
  })}:${QUERY_PREFIX}=${JSON.stringify(query)}`;

export interface IBuildNotificationTemplateByIdentifier {
  _environmentId: string;
  identifiers: ({ id: string } & { triggerIdentifier?: string }) | ({ id?: string } & { triggerIdentifier: string });
}
