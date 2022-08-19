import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UpdateWidgetSettingsRequestDto {
  @ApiProperty()
  @IsDefined()
  notificationCenterEncryption: boolean;
}
