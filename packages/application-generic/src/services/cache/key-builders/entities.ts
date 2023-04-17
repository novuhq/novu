import {
  buildCommonKey,
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
  IdentifierPrefixEnum,
  prefixWrapper,
} from './shared';

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
    identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
    identifier: subscriberId,
  });

const buildUserKey = ({ _id }: { _id: string }): string =>
  buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.USER,
    identifier: _id,
  });

const buildNotificationTemplateKey = ({
  _id,
  _environmentId,
}: {
  _id: string;
  _environmentId: string;
}): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.ID,
    identifier: _id,
  });

const buildNotificationTemplateIdentifierKey = ({
  templateIdentifier,
  _environmentId,
}: {
  templateIdentifier: string;
  _environmentId: string;
}): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.TEMPLATE_IDENTIFIER,
    identifier: templateIdentifier,
  });

const buildEnvironmentByApiKey = ({ apiKey }: { apiKey: string }): string =>
  buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.ENVIRONMENT_BY_API_KEY,
    identifier: apiKey,
    identifierPrefix: IdentifierPrefixEnum.API_KEY,
  });

const buildKeyById = ({
  type,
  keyEntity,
  identifierPrefix = IdentifierPrefixEnum.ID,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  identifierPrefix?: IdentifierPrefixEnum;
  identifier: string;
}): string =>
  prefixWrapper(`${type}:${keyEntity}:${identifierPrefix}=${identifier}`);

export {
  buildUserKey,
  buildSubscriberKey,
  buildNotificationTemplateKey,
  buildNotificationTemplateIdentifierKey,
  buildEnvironmentByApiKey,
  buildKeyById,
};
