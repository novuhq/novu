import { Injectable } from '@nestjs/common';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, PreferencesTypeEnum, Schedule } from '@novu/shared';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { FeatureFlagsService } from '../../services/feature-flags';
import { GetSubscriberScheduleCommand } from './get-subscriber-schedule.command';

@Injectable()
export class GetSubscriberSchedule {
  constructor(
    private preferencesRepository: PreferencesRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetSubscriberScheduleCommand): Promise<Schedule | undefined> {
    const subscriberGlobalPreference = await this.getSubscriberGlobalPreference(command);

    return subscriberGlobalPreference?.schedule;
  }

  /**
   * The SUBSCRIBER_GLOBAL preference that holds the schedule. Exposed so a caller
   * that also evaluates preferences can hand the same document to
   * `GetPreferences` instead of reading it twice.
   */
  @Instrument()
  async getSubscriberGlobalPreference(command: GetSubscriberScheduleCommand): Promise<PreferencesEntity | null> {
    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(command.contextKeys, {
      enabled: useContextFiltering,
    });

    return this.preferencesRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command._subscriberId,
        type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
        ...contextQuery,
      },
      undefined,
      { readPreference: 'secondaryPreferred' }
    );
  }
}
