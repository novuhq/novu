import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClaimKeylessConnectResponseDto {
  @ApiProperty({ description: 'The Development environment the keyless assets were merged into.' })
  environmentId: string;

  @ApiPropertyOptional({ description: 'External identifier of the claimed agent, when one was present.' })
  agentIdentifier?: string;
}
