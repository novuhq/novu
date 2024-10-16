import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateBridgeUrlResponseDto {
  @ApiProperty()
  isValid: boolean;

  @ApiPropertyOptional()
  error?: string;
}
