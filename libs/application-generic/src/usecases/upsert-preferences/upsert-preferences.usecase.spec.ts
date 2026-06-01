import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { DEFAULT_WORKFLOW_PREFERENCES, PreferencesTypeEnum } from '@novu/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlagsService } from '../../services/feature-flags/feature-flags.service';
import { UpsertPreferences } from './upsert-preferences.usecase';

describe('UpsertPreferences', () => {
  let upsertPreferences: UpsertPreferences;
  let preferencesRepository: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    buildContextExactMatchQuery: ReturnType<typeof vi.fn>;
  };
  let featureFlagsService: { getFlag: ReturnType<typeof vi.fn> };

  const baseCommand = {
    environmentId: 'env-id',
    organizationId: 'org-id',
    _subscriberId: 'subscriber-id',
    templateId: 'template-id',
    type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    preferences: {
      channels: {
        email: { enabled: false },
      },
    },
    returnPreference: false,
  };

  const existingPreference = {
    _id: 'pref-id',
    _environmentId: baseCommand.environmentId,
    _organizationId: baseCommand.organizationId,
    _subscriberId: baseCommand._subscriberId,
    _templateId: baseCommand.templateId,
    type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    preferences: DEFAULT_WORKFLOW_PREFERENCES,
  } as PreferencesEntity;

  beforeEach(() => {
    preferencesRepository = {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      findOne: vi.fn(),
      buildContextExactMatchQuery: vi.fn().mockReturnValue({}),
    };

    featureFlagsService = {
      getFlag: vi.fn().mockResolvedValue(false),
    };

    upsertPreferences = new UpsertPreferences(
      preferencesRepository as unknown as PreferencesRepository,
      featureFlagsService as unknown as FeatureFlagsService
    );
  });

  it('applies pending preference changes when create hits a duplicate key race', async () => {
    const duplicateError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });

    preferencesRepository.findOne
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(existingPreference);

    preferencesRepository.create.mockRejectedValue(duplicateError);

    await upsertPreferences.upsertSubscriberWorkflowPreferences(baseCommand);

    expect(preferencesRepository.update).toHaveBeenCalledWith(
      {
        _id: existingPreference._id,
        _environmentId: baseCommand.environmentId,
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          preferences: expect.objectContaining({
            channels: expect.objectContaining({
              email: { enabled: false },
            }),
          }),
        }),
      })
    );
  });

  it('rethrows duplicate key when the conflicting preference cannot be resolved', async () => {
    const duplicateError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });

    preferencesRepository.findOne.mockResolvedValue(undefined);
    preferencesRepository.create.mockRejectedValue(duplicateError);

    await expect(upsertPreferences.upsertSubscriberWorkflowPreferences(baseCommand)).rejects.toThrow(
      'E11000 duplicate key'
    );

    expect(preferencesRepository.update).not.toHaveBeenCalled();
  });
});
