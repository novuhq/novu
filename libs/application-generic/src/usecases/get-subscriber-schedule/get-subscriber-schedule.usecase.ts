import { Injectable } from '@nestjs/common';
import { PreferencesRepository } from '@novu/dal';
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
    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(command.contextKeys, {
      enabled: useContextFiltering,
    });

    const subscriberGlobalPreference = await this.preferencesRepository.findOne(
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

    return subscriberGlobalPreference?.schedule;
  }
}
