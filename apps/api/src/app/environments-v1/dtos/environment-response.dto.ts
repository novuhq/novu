import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyDto } from './api-key.dto';

export class EnvironmentResponseDto {
  @ApiProperty({
    type: String,
    description: 'Unique identifier of the environment',
    example: '60d5ecb8b3b3a30015f3e1a1',
  })
  _id: string;

  @ApiProperty({
    type: String,
    description: 'Name of the environment',
    example: 'Production Environment',
  })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Organization ID associated with the environment',
    example: '60d5ecb8b3b3a30015f3e1a2',
  })
  _organizationId: string;

  @ApiProperty({
    type: String,
    description: 'Unique identifier for the environment',
    example: 'prod-env-01',
  })
  identifier: string;

  @ApiPropertyOptional({
    type: ApiKeyDto,
    isArray: true,
    description: 'List of API keys associated with the environment',
  })
  apiKeys?: ApiKeyDto[];

  @ApiPropertyOptional({
    type: String,
    description: 'Parent environment ID',
    example: '60d5ecb8b3b3a30015f3e1a3',
  })
  _parentId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'URL-friendly slug for the environment',
    example: 'production',
  })
  slug?: string;
}
