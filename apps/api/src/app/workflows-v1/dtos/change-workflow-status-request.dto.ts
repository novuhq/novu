import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';

/**
 * @deprecated use dto's in /workflows directory
 */
export class ChangeWorkflowStatusRequestDto {
  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  active: boolean;
}
