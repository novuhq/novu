import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IApiKey, IWidgetSettings } from '@novu/dal';
import { ApiKey } from '../../shared/dtos/api-key';
import { WidgetSettings } from '../../shared/dtos/widget-settings';

export class EnvironmentResponseDto {
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
  apiKeys: IApiKey[];

  @ApiProperty({
    type: WidgetSettings,
  })
  widget: IWidgetSettings;

  @ApiProperty()
  _parentId: string;
}
