import { PreferencesEntity } from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { FeatureFlagsService } from '../../services/feature-flags';
import { InMemoryLRUCacheService, InMemoryLRUCacheStore } from '../../services/in-memory-lru-cache';
import { GetPreferences } from './get-preferences.usecase';

const ENVIRONMENT_ID = 'env_1';
const ORGANIZATION_ID = 'org_1';

function buildPreference(templateId: string, type: PreferencesTypeEnum): PreferencesEntity {
  return {
    _id: `${type}_${templateId}`,
    _templateId: templateId,
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    type,
    preferences: { all: { enabled: true } },
  } as unknown as PreferencesEntity;
}

describe('GetPreferences.getWorkflowPreferencesByIds', () => {
  let getPreferences: GetPreferences;
  let cacheService: InMemoryLRUCacheService;
  let findForComputation: jest.Mock;

  beforeEach(() => {
    const featureFlagsService = { getFlag: jest.fn().mockResolvedValue(true) } as unknown as FeatureFlagsService;
    cacheService = new InMemoryLRUCacheService(featureFlagsService);
    findForComputation = jest.fn();
    const preferencesRepository = { findForComputation } as any;
    getPreferences = new GetPreferences(preferencesRepository, featureFlagsService, cacheService);
  });

  afterEach(() => {
    cacheService.invalidateAll(InMemoryLRUCacheStore.WORKFLOW_PREFERENCES);
  });

  it('queries missing workflows with a single $in and splits results into [resource, user] tuples', async () => {
    findForComputation.mockResolvedValue([
      buildPreference('wf_1', PreferencesTypeEnum.WORKFLOW_RESOURCE),
      buildPreference('wf_1', PreferencesTypeEnum.USER_WORKFLOW),
      buildPreference('wf_2', PreferencesTypeEnum.WORKFLOW_RESOURCE),
    ]);

    const result = await getPreferences.getWorkflowPreferencesByIds({
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      workflowIds: ['wf_1', 'wf_2'],
    });

    expect(findForComputation).toHaveBeenCalledTimes(1);
    const query = findForComputation.mock.calls[0][0];
    expect(query._templateId.$in).toEqual(['wf_1', 'wf_2']);
    expect(query.type.$in).toEqual([PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW]);

    expect(result.get('wf_1')).toEqual([
      buildPreference('wf_1', PreferencesTypeEnum.WORKFLOW_RESOURCE),
      buildPreference('wf_1', PreferencesTypeEnum.USER_WORKFLOW),
    ]);
    expect(result.get('wf_2')).toEqual([buildPreference('wf_2', PreferencesTypeEnum.WORKFLOW_RESOURCE), null]);
  });

  it('returns a [null, null] tuple for workflows without preferences and caches it', async () => {
    findForComputation.mockResolvedValue([]);

    const result = await getPreferences.getWorkflowPreferencesByIds({
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      workflowIds: ['wf_empty'],
    });

    expect(result.get('wf_empty')).toEqual([null, null]);
    expect(cacheService.getIfCached(InMemoryLRUCacheStore.WORKFLOW_PREFERENCES, `${ENVIRONMENT_ID}:wf_empty`)).toEqual([
      null,
      null,
    ]);
  });

  it('serves cached workflows without re-querying and shares the single-workflow key scheme', async () => {
    findForComputation.mockResolvedValue([buildPreference('wf_1', PreferencesTypeEnum.WORKFLOW_RESOURCE)]);

    await getPreferences.getWorkflowPreferencesByIds({
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      workflowIds: ['wf_1'],
    });
    const result = await getPreferences.getWorkflowPreferencesByIds({
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      workflowIds: ['wf_1'],
    });

    expect(findForComputation).toHaveBeenCalledTimes(1);
    expect(result.get('wf_1')).toEqual([buildPreference('wf_1', PreferencesTypeEnum.WORKFLOW_RESOURCE), null]);
    expect(cacheService.getIfCached(InMemoryLRUCacheStore.WORKFLOW_PREFERENCES, `${ENVIRONMENT_ID}:wf_1`)).toEqual([
      buildPreference('wf_1', PreferencesTypeEnum.WORKFLOW_RESOURCE),
      null,
    ]);
  });
});
