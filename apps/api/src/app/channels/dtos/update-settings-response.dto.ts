import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKey } from '../../shared/dtos/api-key';
import { WidgetSettings } from '../../shared/dtos/widget-settings';

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
