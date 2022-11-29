import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';

export class ChangeTemplateStatusRequestDto {
  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  active: boolean;
}
