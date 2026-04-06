import type { EnvironmentEntity, NotificationTemplateEntity, OrganizationEntity, PreferencesEntity } from '@novu/dal';
import type { UserSessionData } from '@novu/shared';

const MS_PER_SECOND = 1000;
const THIRTY_SECONDS_MS = MS_PER_SECOND * 30;
const ONE_MINUTE_MS = MS_PER_SECOND * 60;
const ONE_HOUR_MS = ONE_MINUTE_MS * 60;

export enum InMemoryLRUCacheStore {
  WORKFLOW = 'workflow',
  ORGANIZATION = 'organization',
  ENVIRONMENT = 'environment',
  ENVIRONMENT_VARIABLES = 'environment-variables',
  API_KEY_USER = 'api-key-user',
  VALIDATOR = 'validator',
  ACTIVE_WORKFLOWS = 'active-workflows',
  WORKFLOW_PREFERENCES = 'workflow-preferences',
}

export type WorkflowCacheData = NotificationTemplateEntity | null;
export type OrganizationCacheData = OrganizationEntity | null;
export type EnvironmentCacheData = Pick<EnvironmentEntity, '_id' | 'echo' | 'apiKeys'> | null;
export type EnvironmentVariablesCacheData = Record<string, string>;
export type ApiKeyUserCacheData = UserSessionData | null;
export type ValidatorCacheData = unknown;
export type ActiveWorkflowsCacheData = NotificationTemplateEntity[];
export type WorkflowPreferencesCacheData = [PreferencesEntity | null, PreferencesEntity | null];

export type CacheStoreDataTypeMap = {
  [InMemoryLRUCacheStore.WORKFLOW]: WorkflowCacheData;
  [InMemoryLRUCacheStore.ORGANIZATION]: OrganizationCacheData;
  [InMemoryLRUCacheStore.ENVIRONMENT]: EnvironmentCacheData;
  [InMemoryLRUCacheStore.ENVIRONMENT_VARIABLES]: EnvironmentVariablesCacheData;
  [InMemoryLRUCacheStore.API_KEY_USER]: ApiKeyUserCacheData;
  [InMemoryLRUCacheStore.VALIDATOR]: ValidatorCacheData;
  [InMemoryLRUCacheStore.ACTIVE_WORKFLOWS]: ActiveWorkflowsCacheData;
  [InMemoryLRUCacheStore.WORKFLOW_PREFERENCES]: WorkflowPreferencesCacheData;
};

export type StoreConfig = {
  max: number;
  ttl: number;
  featureFlagComponent: string;
  skipFeatureFlag?: boolean;
};

export const STORE_CONFIGS: Record<InMemoryLRUCacheStore, StoreConfig> = {
  [InMemoryLRUCacheStore.WORKFLOW]: {
    max: 1000,
    ttl: THIRTY_SECONDS_MS,
    featureFlagComponent: 'workflow',
  },
  [InMemoryLRUCacheStore.ORGANIZATION]: {
    max: 500,
    ttl: ONE_MINUTE_MS,
    featureFlagComponent: 'organization',
  },
  [InMemoryLRUCacheStore.ENVIRONMENT]: {
    max: 500,
    ttl: ONE_MINUTE_MS,
    featureFlagComponent: 'environment',
  },
  [InMemoryLRUCacheStore.ENVIRONMENT_VARIABLES]: {
    max: 500,
    ttl: ONE_MINUTE_MS,
    featureFlagComponent: 'environment',
  },
  [InMemoryLRUCacheStore.API_KEY_USER]: {
    max: 1000,
    ttl: ONE_MINUTE_MS,
    featureFlagComponent: 'api-key-user',
  },
  [InMemoryLRUCacheStore.VALIDATOR]: {
    max: 5000,
    ttl: ONE_HOUR_MS,
    featureFlagComponent: 'validator',
    skipFeatureFlag: true,
  },
  [InMemoryLRUCacheStore.ACTIVE_WORKFLOWS]: {
    max: 300,
    ttl: ONE_MINUTE_MS,
    featureFlagComponent: 'active-workflows',
  },
  [InMemoryLRUCacheStore.WORKFLOW_PREFERENCES]: {
    max: 1000,
    ttl: ONE_MINUTE_MS,
    featureFlagComponent: 'workflow-preferences',
  },
};
