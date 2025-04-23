import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TopicDto {
  @ApiPropertyOptional()
  _id: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  subscribers: string[];
}
