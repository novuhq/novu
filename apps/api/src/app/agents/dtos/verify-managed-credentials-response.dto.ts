import { ApiProperty } from '@nestjs/swagger';

export class VerifyManagedCredentialsResponseDto {
  @ApiProperty({ description: 'True when the provider accepted the credentials.', example: true })
  valid: true;
}
