import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { GetWidgetSettingsCommand } from './get-widget-settings.command';

@Injectable()
export class GetWidgetSettings {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetWidgetSettingsCommand): Promise<{
    _id: string;
    _organizationId: string;
  }> {
    const environment = await this.environmentRepository.findEnvironmentByIdentifier(command.identifier);
    if (!environment) {
      throw new NotFoundException(`Environment with identifier ${command.identifier} not found`);
    }

    return {
      _id: environment._id,
      _organizationId: environment._organizationId,
    };
  }
}
