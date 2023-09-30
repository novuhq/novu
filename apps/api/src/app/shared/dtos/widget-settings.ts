import { ApiProperty } from '@nestjs/swagger';

export class WidgetSettings {
  @ApiProperty()
  notificationCenterEncryption: boolean;
}
