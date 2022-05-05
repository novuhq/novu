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

    const updateWidgetSetting: Partial<IWidgetSettings> = {};

    if (command.notificationCenterEncryption != null) {
      updateWidgetSetting['widget.notificationCenterEncryption'] = command.notificationCenterEncryption;
    }

    await this.environmentRepository.update(
      {
        _organizationId: command.organizationId,
        _id: command.environmentId,
      },
      { $set: updateWidgetSetting }
    );

    return await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
