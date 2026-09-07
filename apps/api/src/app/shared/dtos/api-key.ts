import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKey {
  @ApiProperty()
  key: string;
  @ApiProperty()
  _userId: string;
  @ApiPropertyOptional({
    type: String,
    description: 'SHA-256 hash of the API key, used to reference a specific key (e.g. for deletion)',
  })
  hash?: string;
}
