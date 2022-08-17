import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ApiKey {
  @ApiProperty()
  key: string;
  @ApiProperty()
  _userId: string;
}

class WidgetSettings {
  @ApiProperty()
  notificationCenterEncryption: boolean;
}

export class UpdateSettingsResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  identifier: string;

  @ApiProperty({
    type: [ApiKey],
  })
  apiKeys: ApiKey[];

  @ApiProperty({
    type: WidgetSettings,
  })
  widget: WidgetSettings;

  @ApiProperty()
  _parentId: string;
}
