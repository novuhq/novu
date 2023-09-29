import {
  BLUEPRINT_IDENTIFIER,
  buildCommonKey,
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
  IdentifierPrefixEnum,
  OrgScopePrefixEnum,
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

const buildGroupedBlueprintsKey = (): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.GROUPED_BLUEPRINTS,
    environmentIdPrefix: OrgScopePrefixEnum.ORGANIZATION_ID,
    environmentId: process.env.BLUEPRINT_CREATOR,
    identifierPrefix: IdentifierPrefixEnum.GROUPED_BLUEPRINT,
    identifier: BLUEPRINT_IDENTIFIER,
  });

const buildAuthServiceKey = ({ apiKey }: { apiKey: string }): string =>
  buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.AUTH_SERVICE,
    identifier: apiKey,
    identifierPrefix: IdentifierPrefixEnum.API_KEY,
  });

export {
  buildUserKey,
  buildSubscriberKey,
  buildNotificationTemplateKey,
  buildNotificationTemplateIdentifierKey,
  buildEnvironmentByApiKey,
  buildKeyById,
  buildGroupedBlueprintsKey,
  buildAuthServiceKey,
};
