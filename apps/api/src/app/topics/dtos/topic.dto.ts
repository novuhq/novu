import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TopicDto {
  @ApiProperty()
  _id?: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _userId: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;
}
