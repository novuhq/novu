import {
  buildCommonKey,
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
  IdentifierPrefixEnum,
  OrgScopePrefixEnum,
  prefixWrapper,
  QUERY_PREFIX,
} from './shared';

const buildFeedKey = () => {
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

  const invalidate = ({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): string =>
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

  const invalidate = ({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): string =>
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

const buildIntegrationKey = () => {
  const cache = (
    command: Record<string, unknown> & { _environmentId: string }
  ): string =>
    buildQueryByEnvironmentKey({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.INTEGRATION,
      environmentId: command._environmentId,
      environmentIdPrefix: OrgScopePrefixEnum.ENVIRONMENT_ID,
      query: command,
    });

  const invalidate = ({ _environmentId }: { _environmentId: string }): string =>
    buildKeyByEnvironment({
      type: CacheKeyTypeEnum.QUERY,
      keyEntity: CacheKeyPrefixEnum.INTEGRATION,
      environmentId: _environmentId,
      environmentIdPrefix: OrgScopePrefixEnum.ENVIRONMENT_ID,
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

export const buildQueryByEnvironmentKey = ({
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
}): string =>
  `${buildKeyByEnvironment({
    type,
    keyEntity,
    environmentIdPrefix,
    environmentId,
  })}:${QUERY_PREFIX}=${JSON.stringify(query)}`;

const buildKeyByEnvironment = ({
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

export interface IBuildNotificationTemplateByIdentifier {
  _environmentId: string;
  identifiers:
    | ({ id: string } & { triggerIdentifier?: string })
    | ({ id?: string } & { triggerIdentifier: string });
}

export { buildFeedKey, buildMessageCountKey, buildIntegrationKey };
