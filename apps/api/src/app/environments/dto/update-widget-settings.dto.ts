import { IsDefined } from 'class-validator';

export class UpdateWidgetSettingsDto {
  @IsDefined()
  notificationCenterEncryption: boolean;
}
