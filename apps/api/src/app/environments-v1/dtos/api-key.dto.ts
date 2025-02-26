import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyDto {
  @ApiProperty({
    type: String,
    description: 'API key',
    example: 'sk_test_1234567890abcdef',
  })
  key: string;

  @ApiProperty({
    type: String,
    description: 'User ID associated with the API key',
    example: '60d5ecb8b3b3a30015f3e1a4',
  })
  _userId: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Hashed representation of the API key',
    example: 'hash_value_here',
  })
  hash?: string;
}
