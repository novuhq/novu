import {
  BLUEPRINT_IDENTIFIER,
  buildCommonEnvironmentKey,
  buildCommonKey,
  buildKeyById,
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
  IdentifierPrefixEnum,
  OrgScopePrefixEnum,
  ServiceConfigIdentifierEnum,
} from './shared';
import { createHash as createHashCrypto } from 'crypto';

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

const buildVariablesKey = ({
  _environmentId,
  _organizationId,
}: {
  _environmentId: string;
  _organizationId: string;
}): string =>
  buildCommonEnvironmentKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.WORKFLOW_VARIABLES,
    environmentId: _environmentId,
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

const buildGroupedBlueprintsKey = (environmentId: string): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.GROUPED_BLUEPRINTS,
    environmentIdPrefix: OrgScopePrefixEnum.ORGANIZATION_ID,
    environmentId: environmentId,
    identifierPrefix: IdentifierPrefixEnum.GROUPED_BLUEPRINT,
    identifier: BLUEPRINT_IDENTIFIER,
  });

const createHash = (apiKey: string): string => {
  const hash = createHashCrypto('sha256');
  hash.update(apiKey);

  return hash.digest('hex');
};

const buildAuthServiceKey = ({ apiKey }: { apiKey: string }): string => {
  const apiKeyHash = createHash(apiKey);

  return buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.AUTH_SERVICE,
    identifier: apiKeyHash,
    identifierPrefix: IdentifierPrefixEnum.API_KEY,
  });
};

const buildMaximumApiRateLimitKey = ({
  apiRateLimitCategory,
  _environmentId,
}: {
  apiRateLimitCategory: string;
  _environmentId: string;
}): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.MAXIMUM_API_RATE_LIMIT,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.API_RATE_LIMIT_CATEGORY,
    identifier: apiRateLimitCategory,
  });

const buildEvaluateApiRateLimitKey = ({
  apiRateLimitCategory,
  _environmentId,
}: {
  apiRateLimitCategory: string;
  _environmentId: string;
}): string =>
  buildCommonKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.EVALUATE_API_RATE_LIMIT,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.API_RATE_LIMIT_CATEGORY,
    identifier: apiRateLimitCategory,
  });

const buildServiceConfigKey = (
  identifier: ServiceConfigIdentifierEnum
): string =>
  buildKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SERVICE_CONFIG,
    identifierPrefix: IdentifierPrefixEnum.SERVICE_CONFIG,
    identifier,
  });

const buildServiceConfigApiRateLimitMaximumKey = (): string =>
  buildServiceConfigKey(
    ServiceConfigIdentifierEnum.API_RATE_LIMIT_SERVICE_MAXIMUM
  );

export {
  buildUserKey,
  buildSubscriberKey,
  buildNotificationTemplateKey,
  buildNotificationTemplateIdentifierKey,
  buildEnvironmentByApiKey,
  buildKeyById,
  buildGroupedBlueprintsKey,
  buildAuthServiceKey,
  buildMaximumApiRateLimitKey,
  buildEvaluateApiRateLimitKey,
  buildServiceConfigApiRateLimitMaximumKey,
  buildVariablesKey,
};
