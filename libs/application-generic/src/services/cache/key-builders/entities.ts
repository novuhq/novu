import { createHash } from './crypto';
import {
  BLUEPRINT_IDENTIFIER,
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
  IdentifierPrefixEnum,
  ServiceConfigIdentifierEnum,
} from './identifiers';
import {
  buildEnvironmentScopedKey,
  buildEnvironmentScopedKeyById,
  buildOrganizationScopedKey,
  buildOrganizationScopedKeyById,
  buildServiceConfigKey,
} from './builder.scoped';
import { buildUnscopedKey } from './builder.base';

export const buildSubscriberKey = ({
  subscriberId,
  _environmentId,
}: {
  subscriberId: string;
  _environmentId: string;
}): string =>
  buildEnvironmentScopedKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SUBSCRIBER,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
    identifier: subscriberId,
  });
export const buildDedupSubscriberKey = ({
  subscriberId,
  _environmentId,
}: {
  subscriberId: string;
  _environmentId: string;
}): string =>
  buildEnvironmentScopedKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SUBSCRIBER_DEDUP,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
    identifier: subscriberId,
  });

export const buildVariablesKey = ({
  _environmentId,
  _organizationId,
}: {
  _environmentId: string;
  _organizationId: string;
}): string =>
  buildEnvironmentScopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.WORKFLOW_VARIABLES,
    environmentId: _environmentId,
  });

export const buildUserKey = ({ _id }: { _id: string }): string =>
  buildUnscopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.USER,
    identifier: _id,
    identifierPrefix: IdentifierPrefixEnum.ID,
  });

export const buildEnvironmentByApiKey = ({ apiKey }: { apiKey: string }): string =>
  buildUnscopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.ENVIRONMENT_BY_API_KEY,
    identifier: apiKey,
    identifierPrefix: IdentifierPrefixEnum.API_KEY,
  });

export const buildGroupedBlueprintsKey = (environmentId: string): string =>
  buildEnvironmentScopedKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.GROUPED_BLUEPRINTS,
    environmentId,
    identifierPrefix: IdentifierPrefixEnum.GROUPED_BLUEPRINT,
    identifier: BLUEPRINT_IDENTIFIER,
  });

export const buildAuthServiceKey = ({ apiKey }: { apiKey: string }): string => {
  const apiKeyHash = createHash(apiKey);

  return buildUnscopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.AUTH_SERVICE,
    identifier: apiKeyHash,
    identifierPrefix: IdentifierPrefixEnum.API_KEY,
  });
};

export const buildMaximumApiRateLimitKey = ({
  apiRateLimitCategory,
  _environmentId,
}: {
  apiRateLimitCategory: string;
  _environmentId: string;
}): string =>
  buildEnvironmentScopedKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.MAXIMUM_API_RATE_LIMIT,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.API_RATE_LIMIT_CATEGORY,
    identifier: apiRateLimitCategory,
  });

export const buildEvaluateApiRateLimitKey = ({
  apiRateLimitCategory,
  _environmentId,
}: {
  apiRateLimitCategory: string;
  _environmentId: string;
}): string =>
  buildEnvironmentScopedKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.EVALUATE_API_RATE_LIMIT,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.API_RATE_LIMIT_CATEGORY,
    identifier: apiRateLimitCategory,
  });

export const buildHasNotificationKey = ({ _organizationId }: { _organizationId: string }): string =>
  buildOrganizationScopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.HAS_NOTIFICATION,
    organizationId: _organizationId,
  });

export const buildUsageKey = ({
  _organizationId,
  resourceType,
  periodStart,
  periodEnd,
}: {
  _organizationId: string;
  resourceType: string;
  periodStart: number;
  periodEnd: number;
}): string =>
  buildOrganizationScopedKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.USAGE,
    identifierPrefix: IdentifierPrefixEnum.RESOURCE_TYPE,
    identifier: `${resourceType}_${periodStart}_${periodEnd}`,
    organizationId: _organizationId,
  });

export const buildSubscriptionKey = ({ organizationId }: { organizationId: string }): string =>
  buildOrganizationScopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SUBSCRIPTION,
    organizationId,
  });

export const buildServiceConfigApiRateLimitMaximumKey = (): string =>
  buildServiceConfigKey(ServiceConfigIdentifierEnum.API_RATE_LIMIT_SERVICE_MAXIMUM);

export const buildSubscriberTopicsKey = ({
  subscriberId,
  _environmentId,
}: {
  subscriberId: string;
  _environmentId: string;
}): string =>
  buildEnvironmentScopedKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SUBSCRIBER_TOPICS,
    environmentId: _environmentId,
    identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
    identifier: subscriberId,
  });
