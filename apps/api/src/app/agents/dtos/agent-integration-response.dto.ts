import { ApiProperty } from '@nestjs/swagger';

export class AgentIntegrationResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  _agentId: string;

  @ApiProperty({
    description: 'The integration identifier (matches the integration store), not the internal MongoDB _id.',
  })
  integrationIdentifier: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
