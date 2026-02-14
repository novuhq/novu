import type { EnvironmentEntity, NotificationTemplateEntity, OrganizationEntity, PreferencesEntity } from '@novu/dal';
import type { UserSessionData } from '@novu/shared';

export enum InMemoryLRUCacheStore {
  WORKFLOW = 'workflow',
  ORGANIZATION = 'organization',
  ENVIRONMENT = 'environment',
  API_KEY_USER = 'api-key-user',
  VALIDATOR = 'validator',
  ACTIVE_WORKFLOWS = 'active-workflows',
  WORKFLOW_PREFERENCES = 'workflow-preferences',
}

export type WorkflowCacheData = NotificationTemplateEntity | null;
export type OrganizationCacheData = OrganizationEntity | null;
export type EnvironmentCacheData = Pick<EnvironmentEntity, '_id' | 'echo' | 'apiKeys'> | null;
export type ApiKeyUserCacheData = UserSessionData | null;
export type ValidatorCacheData = unknown;
export type ActiveWorkflowsCacheData = NotificationTemplateEntity[];
export type WorkflowPreferencesCacheData = [PreferencesEntity | null, PreferencesEntity | null];

export type CacheStoreDataTypeMap = {
  [InMemoryLRUCacheStore.WORKFLOW]: WorkflowCacheData;
  [InMemoryLRUCacheStore.ORGANIZATION]: OrganizationCacheData;
  [InMemoryLRUCacheStore.ENVIRONMENT]: EnvironmentCacheData;
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
    ttl: 1000 * 30,
    featureFlagComponent: 'workflow',
  },
  [InMemoryLRUCacheStore.ORGANIZATION]: {
    max: 500,
    ttl: 1000 * 60,
    featureFlagComponent: 'organization',
  },
  [InMemoryLRUCacheStore.ENVIRONMENT]: {
    max: 500,
    ttl: 1000 * 60,
    featureFlagComponent: 'environment',
  },
  [InMemoryLRUCacheStore.API_KEY_USER]: {
    max: 1000,
    ttl: 1000 * 60,
    featureFlagComponent: 'api-key-user',
  },
  [InMemoryLRUCacheStore.VALIDATOR]: {
    max: 5000,
    ttl: 1000 * 60 * 60,
    featureFlagComponent: 'validator',
    skipFeatureFlag: true,
  },
  [InMemoryLRUCacheStore.ACTIVE_WORKFLOWS]: {
    max: 300,
    ttl: 1000 * 60,
    featureFlagComponent: 'active-workflows',
  },
  [InMemoryLRUCacheStore.WORKFLOW_PREFERENCES]: {
    max: 1000,
    ttl: 1000 * 60,
    featureFlagComponent: 'workflow-preferences',
  },
};
