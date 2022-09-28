import { IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupIntegrationResponseDto {
  @ApiProperty()
  @IsDefined()
  success: boolean;
}
