import { ResourceEnum } from '@novu/shared';
import { buildUnscopedKey } from './builder.base';
import {
  buildEnvironmentScopedKey,
  buildEnvironmentScopedKeyById,
  buildOrganizationScopedKey,
  buildOrganizationScopedKeyById,
} from './builder.scoped';
import { createHash } from './crypto';
import { BLUEPRINT_IDENTIFIER, CacheKeyPrefixEnum, CacheKeyTypeEnum, IdentifierPrefixEnum } from './identifiers';

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

export const buildUsageKey = ({
  _organizationId,
  resourceType,
}: {
  _organizationId: string;
  resourceType: ResourceEnum;
}): string => {
  return buildOrganizationScopedKeyById({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.USAGE,
    organizationId: _organizationId,
    identifierPrefix: IdentifierPrefixEnum.RESOURCE_TYPE,
    identifier: resourceType,
  });
};

export const buildSubscriptionKey = ({ organizationId }: { organizationId: string }): string =>
  buildOrganizationScopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SUBSCRIPTION,
    organizationId,
  });

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
