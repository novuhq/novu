import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TopicDto {
  @ApiPropertyOptional()
  _id: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  key: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  subscribers: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  updatedAt?: string;
}
