import { Injectable } from '@nestjs/common';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { InMemoryLRUCacheService, InMemoryLRUCacheStore } from '../../services/in-memory-lru-cache';
import { DeletePreferencesCommand } from './delete-preferences.command';

@Injectable()
export class DeletePreferencesUseCase {
  constructor(
    private preferencesRepository: PreferencesRepository,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {}

  @InstrumentUsecase()
  public async execute(command: DeletePreferencesCommand): Promise<void> {
    const existingPreference = await this.getPreference(command);

    if (!existingPreference) {
      /*
       * If the preference does not exist, we don't need to run the delete query
       * and we handle it gracefully.
       *
       * This is necessary because Preferences are a supplementary entity to core
       * entities like Workflows & Subscribers, which may delete their
       * preferences during mutations.
       */
      return;
    }

    await this.deletePreferences(command, existingPreference._id);

    // Invalidate the workflow-scoped preference LRU cache so reads right after the
    // delete don't return the stale tuple for up to the cache TTL.
    const isWorkflowScoped = [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW].includes(
      command.type
    );

    if (isWorkflowScoped) {
      this.inMemoryLRUCacheService.invalidate(
        InMemoryLRUCacheStore.WORKFLOW_PREFERENCES,
        `${command.environmentId}:${command.templateId}`
      );
    }
  }

  @Instrument()
  private async deletePreferences(command: DeletePreferencesCommand, preferencesId: string) {
    return await this.preferencesRepository.delete({
      _id: preferencesId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
      type: command.type,
    });
  }

  @Instrument()
  private async getPreference(command: DeletePreferencesCommand): Promise<PreferencesEntity | undefined> {
    return await this.preferencesRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
      type: command.type,
    });
  }
}
