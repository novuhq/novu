import { ApiProperty } from '@nestjs/swagger';

export class TopicResponseDto {
  @ApiProperty({
    description: 'The identifier of the topic',
    type: String,
    example: '64da692e9a94fb2e6449ad06',
  })
  _id: string;

  @ApiProperty({
    description: 'The unique key of the topic',
    type: String,
    example: 'product-updates',
  })
  key: string;

  @ApiProperty({
    description: 'The name of the topic',
    type: String,
    example: 'Product Updates',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'The date the topic was created',
    type: String,
    example: '2023-08-15T00:00:00.000Z',
  })
  createdAt?: string;

  @ApiProperty({
    description: 'The date the topic was last updated',
    type: String,
    example: '2023-08-15T00:00:00.000Z',
  })
  updatedAt?: string;
}
