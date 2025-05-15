import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TopicResponseDto {
  @ApiProperty({
    description: 'The identifier of the topic',
    type: String,
    example: '64da692e9a94fb2e6449ad06',
  })
  @IsString()
  _id: string;

  @ApiProperty({
    description: 'The unique key of the topic',
    type: String,
    example: 'product-updates',
  })
  @IsString()
  key: string;

  @ApiPropertyOptional({
    description: 'The name of the topic',
    type: String,
    example: 'Product Updates',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The date the topic was created',
    type: String,
    example: '2023-08-15T00:00:00.000Z',
  })
  @IsString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'The date the topic was last updated',
    type: String,
    example: '2023-08-15T00:00:00.000Z',
  })
  @IsString()
  @IsOptional()
  updatedAt?: string;
}
