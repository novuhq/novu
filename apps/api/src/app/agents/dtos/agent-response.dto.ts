import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  identifier: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
