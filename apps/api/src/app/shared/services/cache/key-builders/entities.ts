import { buildCommonKey, CacheKeyPrefixEnum, CacheKeyTypeEnum } from './shared';

const buildSubscriberKey = ({
  subscriberId,
  _environmentId,
}: {
  subscriberId: string;
  _environmentId: string;
}): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SUBSCRIBER,
    environmentId: _environmentId,
    identifierPrefix: 's',
    identifier: subscriberId,
  });

const buildIntegrationKey = ({ _id, _environmentId }: { _id: string; _environmentId: string }): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.INTEGRATION,
    environmentId: _environmentId,
    identifier: _id,
  });

const buildUserKey = ({ _id }: { _id: string }): string =>
  buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.USER,
    identifier: _id,
  });

const buildEnvironmentByApiKey = ({ _id }: { _id: string }): string =>
  buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.ENVIRONMENT_BY_API_KEY,
    identifier: _id,
  });

const buildKeyById = ({
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

export { buildUserKey, buildIntegrationKey, buildSubscriberKey, buildEnvironmentByApiKey, buildKeyById };
