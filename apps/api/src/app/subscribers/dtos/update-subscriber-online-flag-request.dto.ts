import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';

export class UpdateSubscriberOnlineFlagRequestDto {
  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  isOnline: boolean;
}
