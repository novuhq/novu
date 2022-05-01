import { IsDefined } from 'class-validator';

export class UpdateWidgetSettingsDto {
  @IsDefined()
  widget: {
    notificationCenterEncryption: boolean;
  };
}
