import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeedResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  identifier: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;
}
