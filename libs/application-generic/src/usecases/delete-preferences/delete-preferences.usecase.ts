import { Injectable } from '@nestjs/common';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { DeletePreferencesCommand } from './delete-preferences.command';
import { Instrument, InstrumentUsecase } from '../../instrumentation';

@Injectable()
export class DeletePreferencesUseCase {
  constructor(private preferencesRepository: PreferencesRepository) {}

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
  }

  @Instrument()
  private async deletePreferences(
    command: DeletePreferencesCommand,
    preferencesId: string,
  ) {
    return await this.preferencesRepository.delete({
      _id: preferencesId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
      type: command.type,
    });
  }

  @Instrument()
  private async getPreference(
    command: DeletePreferencesCommand,
  ): Promise<PreferencesEntity | undefined> {
    return await this.preferencesRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
      type: command.type,
    });
  }
}
