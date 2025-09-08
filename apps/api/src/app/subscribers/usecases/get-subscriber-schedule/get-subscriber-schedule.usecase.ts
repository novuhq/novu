import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';
import { PreferencesTypeEnum, Schedule } from '@novu/shared';
import { GetSubscriberScheduleCommand } from './get-subscriber-schedule.command';

@Injectable()
export class GetSubscriberSchedule {
  constructor(private preferencesRepository: PreferencesRepository) {}

  @InstrumentUsecase()
  async execute(command: GetSubscriberScheduleCommand): Promise<Schedule | undefined> {
    const subscriberGlobalPreference = await this.preferencesRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command._subscriberId,
        type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      },
      undefined,
      { readPreference: 'secondaryPreferred' }
    );

    return subscriberGlobalPreference?.schedule;
  }
}
