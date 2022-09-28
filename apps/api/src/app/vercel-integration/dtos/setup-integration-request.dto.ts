import { IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupIntegrationRequestDto {
  @ApiProperty()
  @IsDefined()
  vercelIntegrationCode: string;
}
