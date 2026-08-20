import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContextData, ContextType } from '@novu/shared';

export class GetContextResponseDto {
  @ApiProperty({
    description: 'Context type (e.g., tenant, app, workspace)',
    type: String,
  })
  type: ContextType;

  @ApiProperty({
    description: 'Unique identifier for this context',
  })
  id: string;

  @ApiProperty({
    description: 'Custom data associated with this context',
    type: 'object',
    additionalProperties: true,
  })
  data: ContextData;

  @ApiPropertyOptional({
    description: 'Bridge URL override for agent connect, if configured on this context',
    type: String,
  })
  bridgeUrl?: string;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: string;
}
