import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnvironmentResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  identifier: string;

  @ApiPropertyOptional()
  apiKeys?: IApiKeyDto[];

  @ApiProperty()
  _parentId: string;
}

export interface IApiKeyDto {
  key: string;
  _userId: string;
  hash?: string;
}
