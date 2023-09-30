import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsBoolean } from 'class-validator';

export class UpdateSubscriberOnlineFlagRequestDto {
  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  isOnline: boolean;
}
