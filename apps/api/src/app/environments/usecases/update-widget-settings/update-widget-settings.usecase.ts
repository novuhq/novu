import { Injectable } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { UpdateWidgetSettingsCommand } from './update-widget-settings.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { IWidgetSettings } from '@novu/dal';

@Injectable()
export class UpdateWidgetSettings {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: UpdateWidgetSettingsCommand) {
    const environment = await this.environmentRepository.findById(command.environmentId);

    if (!environment) {
      throw new ApiException(`Environment id: ${command.environmentId} not found`);
    }

    const updateWidgetSettings: Partial<IWidgetSettings> = {};

    if (command.widget.notificationCenterEncryption != null) {
      updateWidgetSettings.notificationCenterEncryption = command.widget.notificationCenterEncryption;
    }

    await this.environmentRepository.update(
      {
        _organizationId: command.organizationId,
        _id: command.environmentId,
      },
      { $set: { widget: updateWidgetSettings } }
    );

    return await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
