import { Injectable } from '@nestjs/common';
import { ApplicationRepository } from '@novu/dal';
import { GetWidgetSettingsCommand } from './get-widget-settings.command';

@Injectable()
export class GetWidgetSettings {
  constructor(private applicationRepository: ApplicationRepository) {}

  async execute(command: GetWidgetSettingsCommand): Promise<{
    _id: string;
    _organizationId: string;
  }> {
    const application = await this.applicationRepository.findApplicationByIdentifier(command.identifier);

    return {
      _id: application._id,
      _organizationId: application._organizationId,
    };
  }
}
