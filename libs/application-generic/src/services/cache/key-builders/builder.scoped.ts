import { buildParentScopedKeyById, buildScopedKey, buildUnscopedKey } from './builder.base';
import {
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
  IdentifierPrefixEnum,
  OrgScopePrefixEnum,
  ServiceConfigIdentifierEnum,
} from './identifiers';

/**
 *
 * Use this to build a key for entities that are scoped to an environment
 * and have their own unique identifier.
 */
export const buildEnvironmentScopedKeyById = ({
  type,
  keyEntity,
  environmentId,
  identifierPrefix,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentId: string;
  identifierPrefix: IdentifierPrefixEnum;
  identifier: string;
}): string =>
  buildParentScopedKeyById({
    type,
    keyEntity,
    parentIdPrefix: OrgScopePrefixEnum.ENVIRONMENT_ID,
    parentId: environmentId,
    identifierPrefix,
    identifier,
  });

/**
 * Use this to build a key for entities that are scoped to an organization
 * and have their own unique identifier.
 */
export const buildOrganizationScopedKeyById = ({
  type,
  keyEntity,
  organizationId,
  identifierPrefix,
  identifier,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  organizationId: string;
  identifierPrefix: IdentifierPrefixEnum;
  identifier: string;
}): string =>
  buildParentScopedKeyById({
    type,
    keyEntity,
    parentIdPrefix: OrgScopePrefixEnum.ORGANIZATION_ID,
    parentId: organizationId,
    identifierPrefix,
    identifier,
  });

/**
 * Use this to build a key for entities that are scoped to an environment
 */
export const buildEnvironmentScopedKey = ({
  type,
  keyEntity,
  environmentId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  environmentId: string;
}): string =>
  buildScopedKey({
    type,
    keyEntity,
    scopedIdPrefix: OrgScopePrefixEnum.ENVIRONMENT_ID,
    scopedId: environmentId,
  });

/**
 * Use this to build a key for entities that are scoped to an organization
 */
export const buildOrganizationScopedKey = ({
  type,
  keyEntity,
  organizationId,
}: {
  type: CacheKeyTypeEnum;
  keyEntity: CacheKeyPrefixEnum;
  organizationId: string;
}): string =>
  buildScopedKey({
    type,
    keyEntity,
    scopedIdPrefix: OrgScopePrefixEnum.ORGANIZATION_ID,
    scopedId: organizationId,
  });

/**
 * Use this to build a key for service configs that are unscoped (do not belong to a hierarchy).
 * An example of a service config is the maximum API rate limit.
 */
export const buildServiceConfigKey = (identifier: ServiceConfigIdentifierEnum): string =>
  buildUnscopedKey({
    type: CacheKeyTypeEnum.ENTITY,
    keyEntity: CacheKeyPrefixEnum.SERVICE_CONFIG,
    identifierPrefix: IdentifierPrefixEnum.SERVICE_CONFIG,
    identifier,
  });
