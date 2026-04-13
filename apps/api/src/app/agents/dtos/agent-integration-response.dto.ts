import { ApiProperty } from '@nestjs/swagger';

export class AgentIntegrationResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  _agentId: string;

  @ApiProperty()
  _integrationId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
