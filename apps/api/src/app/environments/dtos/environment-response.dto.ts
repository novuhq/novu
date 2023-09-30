import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IApiKey } from '@novu/dal';
import { ApiKey } from '../../shared/dtos/api-key';

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

  @ApiProperty()
  _parentId: string;
}
