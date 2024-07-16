import { ApiProperty } from '@nestjs/swagger';

export class ValidateBridgeUrlResponseDto {
  @ApiProperty()
  isValid: boolean;
}
