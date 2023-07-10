import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';

export class ChangeWorkflowStatusRequestDto {
  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  active: boolean;
}
